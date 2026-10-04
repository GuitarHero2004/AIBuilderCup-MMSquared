import path from 'node:path';
import { root, localEnvironment, run } from './process.mjs';

run(process.execPath, [path.join(root, 'node_modules/firebase-tools/lib/bin/firebase.js'),
  'emulators:exec', '--project', 'demo-greenprocure', '--only', 'auth,firestore,storage',
  'node scripts/browser-smoke.mjs'], { env: { ...localEnvironment, CI: 'true' } });
