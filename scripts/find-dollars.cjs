const fs = require('fs');
const path = require('path');

function walk(dir) {
  let res = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory() && !['node_modules', '.git', 'dist'].includes(e.name)) {
      res = res.concat(walk(f));
    } else if (e.isFile() && /\.(jsx?|json|html)$/.test(e.name)) {
      res.push(f);
    }
  }
  return res;
}

const files = walk('./src');
let found = 0;
for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    
    // Check if line contains $ without {
    // Exclude template string ${
    const withoutTemplate = line.replace(/\$\{/g, '');
    if (withoutTemplate.includes('$')) {
      // Check if it's regex or valid identifier
      if (!/\.replace\(|\.test\(|\.match\(|\$\/|RegExp/.test(line)) {
        console.log(`${file}:${idx+1}: ${trimmed}`);
        found++;
      }
    }
  });
}
console.log('Total dollar matches:', found);
