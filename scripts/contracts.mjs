import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import openapiTS, { astToString } from 'openapi-typescript';
import { root, apiRoot, apiPython, localEnvironment, run } from './process.mjs';

const temporaryRoot = path.join(root, '.local', 'contracts');
mkdirSync(temporaryRoot, { recursive: true });
const temporary = mkdtempSync(path.join(temporaryRoot, 'export-'));
try {
  const schemaPath = path.join(temporary, 'openapi.json');
  const source = 'import json,sys; from app.main import create_app; from pathlib import Path; Path(sys.argv[1]).write_text(json.dumps(create_app().openapi(),sort_keys=True), encoding="utf-8")';
  run(apiPython, ['-c', source, schemaPath], { cwd: apiRoot, env: localEnvironment });
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  const generated = '// Generated from FastAPI OpenAPI by npm run contracts:generate. Do not edit manually.\n' + astToString(await openapiTS(schema));
  const destination = path.join(root, 'apps/web/src/api/generated/schema.d.ts');
  if (process.argv.includes('--check')) {
    if (readFileSync(destination, 'utf8').replaceAll('\r\n', '\n') !== generated) throw new Error('API types are stale. Run npm run contracts:generate and review the result.');
    console.log('API contract matches generated TypeScript types.');
  } else {
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, generated);
    console.log('Generated apps/web/src/api/generated/schema.d.ts');
  }
} finally {
  // This unique directory was created above; never remove another .local entry.
  if (path.dirname(path.resolve(temporary)) !== path.resolve(temporaryRoot)) throw new Error('Unsafe temporary path.');
  rmSync(temporary, { recursive: true });
}
