import path from 'node:path';
import { root, localEnvironment, run } from './process.mjs';

run(process.execPath, [path.join(root, 'node_modules/playwright/cli.js'), 'install', 'chromium'], { env: localEnvironment });
