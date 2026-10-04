import path from 'node:path';
import { root, run, localEnvironment } from './process.mjs';

run(process.execPath, [
  path.join(root, 'node_modules/firebase-tools/lib/bin/firebase.js'),
  'emulators:exec', '--project', 'demo-greenprocure', '--only', 'auth,firestore,storage',
  'node scripts/python.mjs integration',
], { env: { ...localEnvironment, CI: 'true' } });
