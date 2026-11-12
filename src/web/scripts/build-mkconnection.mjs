/**
 * Compila o jogo recebido em src/MKconnection para public/jogos/mkconnection.
 * Adapta a cópia temporária para navegador: loop assíncrono, canvas responsivo
 * e persistência separada por estudante. As fontes desktop não são alteradas.
 * Requer Python com pygbag 0.9.3; execute npm run build:mkconnection.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { integrarConnection } from './integrar-jogos.mjs';

const web = join(dirname(fileURLToPath(import.meta.url)), '..');
const origem = join(web, '..', 'MKconnection');
const destino = join(web, 'public', 'jogos', 'mkconnection');
const python = process.env.PYTHON ?? 'python';

// O nome da pasta vira o nome do pacote (mkconnection.apk).
const trabalho = mkdtempSync(join(tmpdir(), 'mkpause-mkconnection-'));
const projeto = join(trabalho, 'mkconnection');

// Fica de fora o que não roda no jogo: testes, ferramentas, builds, caches e o progresso de quem jogou no desktop.
const FORA = new Set(['tests', 'tools', 'build', '__pycache__', '.venv', 'progress.json', '.vscode']);
cpSync(origem, projeto, {
  recursive: true,
  filter: (caminho) => !FORA.has(basename(caminho)) && !/\.(bat|sh|md)$/.test(caminho) && basename(caminho) !== 'site_exemplo.html',
});

// As adaptações web são feitas somente nesta cópia; a versão desktop permanece intacta.
const principal = join(projeto, 'main.py');
let codigo = readFileSync(principal, 'utf8');
codigo = codigo.replace('import logging', 'import asyncio\nimport pygame\nimport logging')
  .replace('def main() -> int:', 'async def main() -> int:')
  .replace('App().run()', 'await App().run()').replace('sys.exit(main())', 'asyncio.run(main())');
writeFileSync(principal, codigo);
const telas = join(projeto, 'game', 'screens.py');
let tela = readFileSync(telas, 'utf8').replace('import logging', 'import asyncio\nimport logging')
  .replace('from .board import Board', 'from . import web\nfrom .board import Board')
  .replace('pygame.init()', 'pygame.init()\n        if web.EMBUTIDO: web.preparar_canvas()')
  .replace('def run(self) -> None:', 'async def run(self) -> None:')
  .replace('while self.state.running:', 'while self.state.running:\n                await asyncio.sleep(0)')
  .replace('self.clock.tick(60)', 'self.clock.tick(0)')
  .replace('MIN_SIZE = MIN_WINDOW', 'MIN_SIZE = (320, 420) if sys.platform == "emscripten" else MIN_WINDOW')
  .replace('        w, h = WINDOW_SIZE', '        if web.EMBUTIDO:\n            return web.tamanho_ideal(self.MIN_SIZE) or WINDOW_SIZE\n        w, h = WINDOW_SIZE')
  .replace('self.window = pygame.display.get_surface()\n                    for ev', 'self.window = pygame.display.get_surface()\n                    if web.EMBUTIDO:\n                        alvo = web.tamanho_ideal(self.MIN_SIZE)\n                        if alvo and alvo != self.window.get_size():\n                            self.window = pygame.display.set_mode(alvo, pygame.RESIZABLE)\n                            self.screens[self.state.current].relayout()\n                    for ev');
writeFileSync(telas, tela);
copyFileSync(join(web, '..', 'MKpotion', 'mk_potion', 'game', 'web.py'), join(projeto, 'game', 'web.py'));
// Supersampling em todas as telas; limita o custo em telas grandes e suaviza o canvas.
let canvasWeb = readFileSync(join(projeto, 'game', 'web.py'), 'utf8')
  .replace('MAX_PIXELS = 1_800_000', 'MAX_PIXELS = 5_000_000')
  .replace('fator = densidade', 'fator = max(2.0, densidade)')
  .replace('width: 100vw !important; height: 100vh !important;', 'width: 100vw !important; height: 100vh !important; image-rendering: auto !important;');
writeFileSync(join(projeto, 'game', 'web.py'), canvasWeb);

// Persistência web separada por estudante; no desktop mantém os arquivos originais.
let storage = readFileSync(join(web, '..', 'MKpotion', 'mk_potion', 'game', 'storage.py'), 'utf8')
  .replace('_PREFIX = "mk_potion:"', '_PREFIX = "mkconnection:"')
  .replace('_PREFIX + Path(path).name', '_PREFIX + str(__import__("platform").window.MKPAUSE_STUDENT) + ":" + Path(path).name')
  .replace('_PREFIX + path.name', '_PREFIX + str(__import__("platform").window.MKPAUSE_STUDENT) + ":" + path.name');
writeFileSync(join(projeto, 'game', 'storage.py'), storage);
for (const arquivo of ['progress.py', 'settings.py']) {
  const caminho = join(projeto, 'game', arquivo);
  let texto = readFileSync(caminho, 'utf8').replace('import json', 'import json\nfrom . import storage')
    .replace('self.path.read_text(encoding="utf-8")', 'storage.read_text(self.path)');
  if (arquivo === 'progress.py') texto = texto.replace(/            self\.path\.parent\.mkdir[\s\S]*?            os\.replace\(tmp, self\.path\)/, '            storage.write_text(self.path, json.dumps(data, indent=2))');
  else texto = texto.replace(/            self\.path\.parent\.mkdir[^\n]*\n            self\.path\.write_text\(json\.dumps\(asdict\(self\.settings\), indent=2\), encoding="utf-8"\)/, '            storage.write_text(self.path, json.dumps(asdict(self.settings), indent=2))');
  writeFileSync(caminho, texto);
}

integrarConnection(projeto, join(web, '..', 'MKpotion', 'mk_potion', 'assets', 'fonts_mkpause'));
execFileSync(python, ['-c', `import pygame
from pathlib import Path
origem, destino = Path(__import__('sys').argv[1]), Path(__import__('sys').argv[2])
for nome, emocao in [('mascot_front','calmo'),('mascot_sit','calmo'),('mascot_think','calmo'),('mascot_happy','feliz')]:
    pygame.image.save(pygame.image.load(str(origem / (emocao+'.svg'))), str(destino / (nome+'.png')))
`, join(web, 'src', 'assets', 'chinchila'), join(projeto, 'assets', 'images')], {stdio:'inherit'});
console.log(`Compilando ${origem} com pygbag…`);
// PYTHONUTF8: no Windows o pygbag leria o código como cp1252 e quebraria nos acentos.
execFileSync(python, ['-m', 'pygbag', '--build', projeto], {
  stdio: 'inherit',
  env: { ...process.env, PYTHONUTF8: '1' },
});

const build = join(projeto, 'build', 'web');
// Sobrescreve os arquivos (apagar a pasta falha no Windows quando o OneDrive ou o servidor a usam).
mkdirSync(destino, { recursive: true });
for (const arquivo of readdirSync(build)) {
  if (arquivo === 'index.html') continue;
  copyFileSync(join(build, arquivo), join(destino, arquivo));
}

// Página do jogo: idioma, fundo (creme do MKpause) e aviso de carregamento.
const trocas = [
  ['<html lang="en-us">', '<html lang="pt-BR">'],
  ['platform.document.body.style.background = "#7f7f7f"', 'platform.document.body.style.background = "#F6EFE4"'],
  ['<title>mkconnection</title>', '<title>mk connection</title>'],
  ['background: green;', 'background: #FFFAF7; border-radius: 999px; padding: 8px 16px; font: 600 16px system-ui, sans-serif;'],
  ['color: blue;', 'color: #594131;'],
  ['Loading, please wait ...', 'Carregando…'],
  // No celular o navegador exige um toque antes de liberar o som: o pygbag pede esse toque em inglês.
  ['Ready to start ! Please click/touch page', 'Toque para começar'],
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
html = html.replace('<head>', '<head><script>window.MKPAUSE_STUDENT = new URLSearchParams(location.search).get("estudante") || "anonimo";</script>');
writeFileSync(join(destino, 'index.html'), html);

if (!existsSync(join(destino, 'mkconnection.apk'))) console.warn('Aviso: mkconnection.apk não foi gerado.');
if (dirname(trabalho) !== tmpdir() || !basename(trabalho).startsWith('mkpause-mkconnection-')) throw new Error('Pasta temporária inesperada.');
rmSync(trabalho, { recursive: true, force: true });
console.log(`Pronto: ${destino}`);
