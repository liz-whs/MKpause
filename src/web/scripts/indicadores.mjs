/** Inicia PHP com pdo_pgsql sem alterar o php.ini global do computador. */
import { execFileSync, spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'indicadores');
const php = process.env.PHP ?? 'php';
const binario = execFileSync(php, ['-r', 'echo PHP_BINARY;'], { encoding: 'utf8' }).trim();
const args = [];
if (process.platform === 'win32' && existsSync(join(dirname(binario), 'ext', 'php_pdo_pgsql.dll'))) {
  args.push('-d', `extension_dir=${join(dirname(binario), 'ext')}`, '-d', 'extension=pdo_pgsql');
}
const drivers = execFileSync(php, [...args, '-r', 'echo json_encode(PDO::getAvailableDrivers());'], { encoding: 'utf8' });
if (!JSON.parse(drivers).includes('pgsql')) throw new Error('Instale/ative pdo_pgsql no PHP para usar os indicadores.');
if (process.argv.includes('--test')) args.push(join(raiz, 'tests', 'run.php'));
else args.push('-S', '127.0.0.1:8081', '-t', join(raiz, 'public'), join(raiz, 'public', 'index.php'));
const processo = spawn(php, args, { stdio: 'inherit', env: process.env });
processo.on('error', (e) => { console.error(e.message); process.exitCode = 1; });
processo.on('exit', (codigo) => { process.exitCode = codigo ?? 1; });
for (const sinal of ['SIGINT', 'SIGTERM']) process.on(sinal, () => processo.kill(sinal));
