import fs from 'node:fs';
import path from 'node:path';

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');
    const next = content.replace(/(from\s+['"]\.[^'"]+)\.js(['"])/g, '$1$2');
    if (next !== content) {
      fs.writeFileSync(fullPath, next);
      console.log(`updated ${fullPath}`);
    }
  }
}

walk(path.join('packages', 'ui', 'src'));
