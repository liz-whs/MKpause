/**
 * Inicia o backend (Laravel) em 127.0.0.1:8000, onde o Vite repassa /api.
 * Liga as extensões que o Laravel e o PostgreSQL precisam sem alterar o php.ini do computador.
 *
 * Uso (em src/web): npm run backend
 */
import { execFileSync, spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const backend = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'backend');
const php = process.env.PHP ?? 'php';
const binario = execFileSync(php, ['-r', 'echo PHP_BINARY;'], { encoding: 'utf8' }).trim();

const args = [];
const pastaExt = join(dirname(binario), 'ext');
if (process.platform === 'win32' && existsSync(pastaExt)) {
  // Só as que o php.ini ainda não carrega (carregar de novo gera avisos).
  const carregadas = execFileSync(php, ['-m'], { encoding: 'utf8' }).toLowerCase().split(/\r?\n/);
  const faltando = ['pdo_pgsql', 'openssl', 'mbstring', 'fileinfo', 'curl', 'intl']
    .filter((ext) => !carregadas.includes(ext) && existsSync(join(pastaExt, `php_${ext}.dll`)));
  if (faltando.length) args.push('-d', `extension_dir=${pastaExt}`);
  for (const ext of faltando) args.push('-d', `extension=${ext}`);
}
const drivers = execFileSync(php, [...args, '-r', 'echo json_encode(PDO::getAvailableDrivers());'], { encoding: 'utf8' });
if (!JSON.parse(drivers).includes('pgsql')) throw new Error('Instale/ative pdo_pgsql no PHP para usar o backend.');
if (!existsSync(join(backend, 'vendor'))) throw new Error('Rode "composer install" na pasta backend antes.');

const servidor = join(backend, 'vendor', 'laravel', 'framework', 'src', 'Illuminate', 'Foundation', 'resources', 'server.php');
args.push('-S', '127.0.0.1:8000', servidor);
const processo = spawn(php, args, { cwd: join(backend, 'public'), stdio: 'inherit', env: process.env });
processo.on('error', (e) => { console.error(e.message); process.exitCode = 1; });
processo.on('exit', (codigo) => { process.exitCode = codigo ?? 1; });
for (const sinal of ['SIGINT', 'SIGTERM']) process.on(sinal, () => processo.kill(sinal));
