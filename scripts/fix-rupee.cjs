// Fix corrupted ₹ symbols (? followed by digit) across all source files
const fs = require('fs');
const path = require('path');

function walkDir(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
      results = results.concat(walkDir(full));
    } else if (entry.isFile() && /\.(jsx?|json)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

const srcDir = path.join(__dirname, '..', 'src');
const files = walkDir(srcDir);
let totalFixed = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  // Replace ? followed by digit (corrupted ₹) with actual ₹
  // But only in strings/JSX content, not in regex patterns like \.00$
  const original = content;
  
  // Replace ?digit patterns that were dollar amounts
  // Be careful: only replace ? that's in quotes/JSX context (preceded by certain chars)
  // Simple approach: replace all ?digit patterns - the ? in code is always ?. or ?: or ? (ternary)
  // We need to be selective. Let's look for patterns like "?1" or '?1' or >?1
  content = content.replace(/([>"' ])\?(\d)/g, '$1\u20b9$2');
  // Also handle -?digit (negative amounts like -?3,621.93)  
  content = content.replace(/(-)\?(\d)/g, '$1\u20b9$2');
  // Also **?3 (markdown bold)
  content = content.replace(/(\*\*)\?(\d)/g, '$1\u20b9$2');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    const count = (original.match(/\?\d/g) || []).length - (content.match(/\?\d/g) || []).length;
    console.log(`Fixed ${path.relative(srcDir, file)} (${count} replacements)`);
    totalFixed++;
  }
}

console.log(`\nDone. Fixed ${totalFixed} files.`);
