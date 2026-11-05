/**
 * Compila o PianoPause (src/jogos/pianopause/main.py, em pygame) para o navegador
 * com o pygbag e grava o resultado em public/jogos/pianopause.
 *
 * O jogo não é alterado: o main.py e a pasta fontes/ são copiados para uma pasta temporária.
 * Só a página que envolve o jogo (index.html do pygbag) ganha português e as cores do MKpause.
 *
 * Requer Python com pygbag:  python -m pip install pygbag
 * Uso:  npm run build:pianopause      (ou PYTHON=/caminho/python npm run build:pianopause)
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const web = join(dirname(fileURLToPath(import.meta.url)), '..');
const origem = join(web, '..', 'jogos', 'pianopause', 'main.py');
const destino = join(web, 'public', 'jogos', 'pianopause');
const python = process.env.PYTHON ?? 'python';

const trabalho = mkdtempSync(join(tmpdir(), 'mkpause-pianopause-'));
const projeto = join(trabalho, 'pianopause');
mkdirSync(projeto);
copyFileSync(origem, join(projeto, 'main.py'));
// Fontes do site (Fraunces e Lexend) usadas pelo jogo.
const fontes = join(dirname(origem), 'fontes');
if (existsSync(fontes)) cpSync(fontes, join(projeto, 'fontes'), { recursive: true });

console.log(`Compilando ${origem} com pygbag…`);
// PYTHONUTF8: no Windows o pygbag leria o main.py como cp1252 e quebraria nos acentos.
execFileSync(python, ['-m', 'pygbag', '--build', projeto], {
  stdio: 'inherit',
  env: { ...process.env, PYTHONUTF8: '1' },
});

const build = join(projeto, 'build', 'web');
// Sobrescreve os arquivos (apagar a pasta falha no Windows quando o OneDrive ou o servidor a usam).
mkdirSync(destino, { recursive: true });
for (const arquivo of ['pianopause.apk', 'pianopause.tar.gz', 'favicon.png']) {
  copyFileSync(join(build, arquivo), join(destino, arquivo));
}

// Página do jogo: idioma, fundo (Peony, o mesmo do jogo) e aviso de carregamento.
const trocas = [
  ['<html lang="en-us">', '<html lang="pt-BR">'],
  ['platform.document.body.style.background = "#7f7f7f"', 'platform.document.body.style.background = "#F7DDD5"'],
  ['<title>pianopause</title>', '<title>PianoPause</title>'],
  ['background: green;', 'background: #FFFAF7; border-radius: 999px; padding: 8px 16px; font: 600 16px system-ui, sans-serif;'],
  ['color: blue;', 'color: #594131;'],
  ['Loading, please wait ...', 'Carregando…'],
  // Sem o aviso 'Sair do site?' ao recarregar ou sair: o progresso já fica salvo.
  ['can_close : 0', 'can_close : 1'],
  // Dentro do iframe do MKpause o jogo ocupa a página toda: sem barras de rolagem
  // e sem o contorno preto do navegador no canvas (o foco aparece no iframe, no MKpause).
  ['    </style>', '        html, body { overflow: hidden; margin: 0; }\n        canvas:focus { outline: none; }\n    </style>'],
];
let html = readFileSync(join(build, 'index.html'), 'utf8');
for (const [de, para] of trocas) {
  if (!html.includes(de)) console.warn(`Aviso: trecho não encontrado no index.html do pygbag: ${de}`);
  html = html.replace(de, para);
}
writeFileSync(join(destino, 'index.html'), html);

rmSync(trabalho, { recursive: true, force: true });
console.log(`Pronto: ${destino}`);
