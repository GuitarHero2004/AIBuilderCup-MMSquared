import path from 'node:path';
import { root, npm, run } from './process.mjs';

for (const command of ['lint', 'typecheck', 'test', 'build']) npm(['run', command]);
for (const command of ['lint', 'format-check', 'test']) run(process.execPath, [path.join(root, 'scripts/python.mjs'), command]);
npm(['run', 'contracts:check']);
