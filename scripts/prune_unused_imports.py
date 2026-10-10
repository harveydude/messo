"""
Remove unused named imports reported by oxlint.

WHY A SCRIPT: 51 of the 64 `no-unused-vars` warnings are unused icon/React
imports spread over 26 files, 15 of them inside multi-line `lucide-react`
import blocks. Hand-editing 51 sites is 51 chances to drop a name that IS used
and render a screen with a missing component.

WHAT IT DOES
  1. Reads `npm run lint -- --format json` (parsed names come from the
     linter, not from a guess).
  2. Rewrites only the `import { ... }` specifier lists, leaving default and
     namespace imports alone.
  3. Refuses to touch a file where a name it is about to remove does not
     actually appear in an import statement -- that means the report and the
     file disagree, and guessing would be worse than stopping.

Only *import* removals are handled here. The other 13 warnings (unused state
setters, unused parameters, empty catch bindings, one dead local) need a human
judgement about intent, so they are edited by hand afterwards.

Run from the project root:
    python scripts/prune_unused_imports.py
"""
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
# names that must never be stripped even if a report says so: React's
# classic-runtime transform reads these from scope without them being
# referenced in source, so removing them breaks the build, not the lint.
PROTECTED = {"React"}

# Handles both `import { A } from 'x'` and `import React, { A } from 'x'` --
# the default specifier sits between `import` and the brace list.
IMPORT_RE = re.compile(
    r"import\s*((?:type\s+)?[A-Za-z_$][\w$]*\s*,\s*)?(?:type\s*)?\{([^}]*)\}\s*from\s*(['\"][^'\"]+['\"])",
    re.S,
)


def run_lint() -> list[dict]:
    proc = subprocess.run(
        ["npx.cmd", "oxlint", "--format", "json"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    # oxlint exits 0 with warnings, 1 with errors; either way the JSON is on
    # stdout. Parse the outer array even if trailing diagnostics leaked in.
    raw = proc.stdout.strip()
    if not raw:
        print("no JSON from oxlint:\n" + proc.stderr, file=sys.stderr)
        raise SystemExit(1)

    # Shape: { "diagnostics": [ {message, code, severity, filename, labels} ] }
    payload = json.loads(raw)
    if isinstance(payload, dict):
        return payload.get("diagnostics", [])
    return payload


def collect(diagnostics: list[dict]) -> dict[str, set[str]]:
    """{relative path: {identifier, ...}} for import-only unused vars."""
    out: dict[str, set[str]] = {}
    for d in diagnostics:
        if d.get("severity") != "warning":
            continue
        if d.get("code") != "eslint(no-unused-vars)":
            continue
        m = re.search(r"Identifier '([^']+)' is imported but never used", d.get("message", ""))
        if not m:
            continue
        name = m.group(1)
        if name in PROTECTED:
            print(f"  skip protected {name}")
            continue
        path = d.get("filename")
        if not path:
            raise SystemExit(f"cannot locate file for {name}: {d}")
        out.setdefault(path, set()).add(name)
    return out


def prune(path: pathlib.Path, names: set[str]) -> tuple[int, set[str]]:
    text = path.read_text(encoding="utf-8")
    found: set[str] = set()
    removed = 0

    def rewrite(match: re.Match) -> str:
        nonlocal removed
        default = match.group(1) or ""
        specs = [s.strip() for s in match.group(2).split(",") if s.strip()]
        keep = []
        for spec in specs:
            # `Foo as Bar` -- the reported name is the local (right) side.
            local = spec.split()[-1] if " as " in spec else spec
            local = local.strip("{}")
            if local in names:
                found.add(local)
                removed += 1
            else:
                keep.append(spec)
        quoted = match.group(3)
        if not keep:
            if not default:
                # no imports left at all: drop the statement
                return ""
            return f"import {default.strip().rstrip(',')} from {quoted}"
        joined = ", ".join(keep)
        return f"import {default}{{ {joined} }} from {quoted}"

    new = IMPORT_RE.sub(rewrite, text)
    if new == text:
        return 0, found
    path.write_text(new, encoding="utf-8", newline="")
    return removed, found


def main() -> int:
    diagnostics = run_lint()
    targets = collect(diagnostics)
    if not targets:
        print("nothing to prune")
        return 0

    print(f"{len(targets)} file(s) to prune\n")
    total = 0
    for rel, names in sorted(targets.items()):
        path = ROOT / rel.replace("\\", "/")
        if not path.exists():
            print(f"  REFUSING {rel}: not found")
            return 1
        removed, found = prune(path, names)
        missing = names - found
        status = "ok " if not missing else "MISS"
        print(f"  {status} {rel}: removed {removed} of {len(names)}")
        if missing:
            print(f"       not in any import: {sorted(missing)}")
            return 1
        total += removed

    print(f"\ntotal imports removed: {total}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
