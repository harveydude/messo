"""
Hoist ProductsAndServicesView's `initialItems` to module scope.

WHY: it is a 244-line constant array declared inside the component body, so it
is recreated on every render. Two `useMemo`s read it, and React's
exhaustive-deps rule flagged both for omitting it:
  - allFlattened     -> `[]`
  - filteredGroups   -> `[searchTerm]`

Adding it to those dependency arrays would silence the warning but defeat the
memo (the "constant" would be a new object each render). Moving the data to
module scope is the fix that makes both dependency arrays correct as written.

This is a pure move: the value is a literal that closes over nothing, so its
behaviour outside the function is identical. Line dedent by 2 is required
because it is leaving a function body.

Run from the project root:
    python scripts/hoist_initial_items.py
"""
import pathlib
import sys

TARGET = pathlib.Path("src/components/ProductsAndServicesView.jsx")
COMMENT = "  // Products and Services catalog matching Screenshot 1 & 2"
DECL = "  const initialItems = ["
CLOSE = "  ];"
FUNC = "export default function ProductsAndServicesView("


def main() -> int:
    if not TARGET.exists():
        print(f"REFUSING: {TARGET} not found", file=sys.stderr)
        return 1

    lines = TARGET.read_text(encoding="utf-8").split("\n")

    if any(l.startswith("const initialItems = [") for l in lines):
        print("already hoisted - nothing to do")
        return 0

    try:
        start = lines.index(COMMENT)
    except ValueError:
        print("REFUSING: comment anchor not found", file=sys.stderr)
        return 1

    if lines[start + 1] != DECL:
        print(
            f"REFUSING: expected {DECL!r} at line {start + 2}, got {lines[start + 1]!r}",
            file=sys.stderr,
        )
        return 1

    # Walk forward to the matching close, tracking nesting so an inner `];`
    # (there are none expected, but a wrong stop here corrupts the file) cannot
    # end the block early.
    end = None
    depth = 0
    for i in range(start + 1, len(lines)):
        line = lines[i]
        depth += line.count("[") + line.count("{") - line.count("]") - line.count("}")
        if i > start + 1 and depth <= 0 and line == CLOSE:
            end = i
            break
    if end is None:
        print("REFUSING: could not find the end of initialItems", file=sys.stderr)
        return 1

    block = lines[start : end + 1]
    # Dedent one level (2 spaces) now that the block leaves the function body.
    block = [l[2:] if l.startswith("  ") else l for l in block]

    remaining = lines[:start] + lines[end + 1 :]

    try:
        func_at = next(i for i, l in enumerate(remaining) if l.startswith(FUNC))
    except StopIteration:
        print("REFUSING: component declaration not found", file=sys.stderr)
        return 1

    out = remaining[:func_at] + block + [""] + remaining[func_at:]
    TARGET.write_text("\n".join(out), encoding="utf-8", newline="\n")

    print(f"hoisted {len(block)} lines above the component (lines {start + 1}-{end + 1})")
    print(f"file: {len(lines)} -> {len(out)} lines")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
