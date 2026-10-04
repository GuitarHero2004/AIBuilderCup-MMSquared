import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { root, apiRoot, toolingPython, apiPython, uv, localEnvironment, run } from './process.mjs';

const command = process.argv[2];
if (command === 'setup') {
  if (!existsSync(toolingPython)) {
    const candidates = process.platform === 'win32' ? [['py', ['-3.12']], ['python', []]] : [['python3.12', []], ['python3', []]];
    const python = candidates.find(([exe, args]) => {
      const result = spawnSync(exe, [...args, '--version'], { encoding: 'utf8' });
      return result.status === 0 && /Python 3\.12\./.test(result.stdout + result.stderr);
    });
    if (!python) throw new Error('Install Python 3.12, then rerun npm run setup:api.');
    run(python[0], [...python[1], '-m', 'venv', path.join(root, '.local', 'tooling')]);
  }
  const version = existsSync(uv) ? spawnSync(uv, ['--version'], { encoding: 'utf8' }).stdout?.trim() : '';
  if (!/^uv 0\.12\.23(?:\s|$)/.test(version)) run(toolingPython, ['-m', 'pip', 'install', '--disable-pip-version-check', 'uv==0.12.23']);
  run(uv, ['sync', '--locked', '--python', toolingPython], { cwd: apiRoot, env: localEnvironment });
} else {
  if (!existsSync(apiPython)) throw new Error('Run npm run setup:api first.');
  const options = { cwd: apiRoot, env: localEnvironment };
  if (command === 'dev') run(apiPython, ['-m', 'uvicorn', 'app.main:create_app', '--factory', '--reload', '--host', '127.0.0.1', '--port', '8000'], options);
  else if (command === 'test') run(apiPython, ['-m', 'pytest'], options);
  else if (command === 'integration') run(apiPython, ['-m', 'pytest', '-m', 'integration'], { ...options, env: { ...localEnvironment, RUN_EMULATOR_TESTS: '1' } });
  else if (command === 'lint') run(apiPython, ['-m', 'ruff', 'check', '.'], options);
  else if (command === 'format-check') run(apiPython, ['-m', 'ruff', 'format', '--check', '.'], options);
  else throw new Error(`Unknown Python task: ${command}`);
}
