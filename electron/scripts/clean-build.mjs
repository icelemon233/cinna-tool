import fs from 'fs';
import path from 'path';

const targets = process.argv.slice(2);

for (const target of targets) {
  const resolved = path.resolve(process.cwd(), target);
  fs.rmSync(resolved, { force: true, recursive: true });
}
