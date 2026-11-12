/**
 * A geração dos efeitos sonoros requer ffmpeg no PATH, além de Python/pygbag.
 * Compila o MK Potion (src/MKpotion/mk_potion, em pygame, da Ana) para o navegador
 * com o pygbag e grava o resultado em public/jogos/mkpotion.
 *
 * O jogo não é alterado: o código, os dados e os assets são copiados para uma pasta
 * temporária (sem testes, ferramentas, builds antigos nem progresso local).
 * A cópia web recebe entrada direta na fase e controles integrados ao MKpause;
 * a página do pygbag recebe português e as cores do site.
 *
 * Requer Python com pygbag 0.9.3:  python -m pip install pygbag==0.9.3
 * Uso:  npm run build:mkpotion      (ou PYTHON=/caminho/python npm run build:mkpotion)
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { integrarPotion } from './integrar-jogos.mjs';

const web = join(dirname(fileURLToPath(import.meta.url)), '..');
const origem = join(web, '..', 'MKpotion', 'mk_potion');
const destino = join(web, 'public', 'jogos', 'mkpotion');
const python = process.env.PYTHON ?? 'python';

// O nome da pasta vira o nome do pacote (mkpotion.apk).
const trabalho = mkdtempSync(join(tmpdir(), 'mkpause-mkpotion-'));
const projeto = join(trabalho, 'mkpotion');

// Fica de fora o que não roda no jogo: testes, ferramentas, builds, caches e o progresso de quem jogou no desktop.
const FORA = new Set(['tests', 'tools', 'build', '__pycache__', '.venv', 'progress.json']);
cpSync(origem, projeto, {
  recursive: true,
  filter: (caminho) => !FORA.has(basename(caminho)) && !/\.(bat|sh|md)$/.test(caminho) && basename(caminho) !== 'site_exemplo.html',
});

// O pygbag só carrega o pygame no navegador se ele for importado no próprio main.py
// (o MK Potion importa em game/screens.py). Sem isso: "module 'pygame' has no attribute 'init'".
// O ajuste vai só na cópia temporária; o main.py da Ana continua igual.
const principal = join(projeto, 'main.py');
const codigo = readFileSync(principal, 'utf8');
// Áudio: o jogo chama pygame.init() antes do SoundManager, então o mixer abria com o buffer padrão,
// pequeno. No navegador, o som é entregue entre um quadro e outro do jogo; quando um quadro atrasa
// (comum no celular), o buffer esvazia e o som estala ou chia. pre_init antes do init garante um
// buffer maior (4096 quadros, cerca de 90 ms), sem mudar o código da Ana.
const preInit = 'pygame.mixer.pre_init(48000, -16, 2, 4096)  # mkpause: buffer maior evita estalos no navegador';
writeFileSync(principal, [
  ...(/^import pygame\b/m.test(codigo) ? [] : ['import pygame  # pygbag: carrega o pygame no navegador']),
  preInit,
  codigo,
].join('\n'));

integrarPotion(projeto);
// A geração fica fora do pacote web; o navegador carrega apenas os Ogg prontos.
copyFileSync(join(web, 'scripts', 'mkpotion-audio-web.py'), join(projeto, 'game', 'sounds.py'));
execFileSync(python, [join(web, 'scripts', 'mkpotion-audio.py'), projeto], { stdio: 'inherit' });
// No navegador os sons tocam pela Web Audio da página (mkpotion-som.js), fora do laço do jogo:
// os WAV vão para public/jogos/mkpotion/sons/. Os Ogg ficam no pacote para o jogo fora do navegador.
const sonsWeb = join(trabalho, 'sons-web');
mkdirSync(sonsWeb, { recursive: true });
for (const nome of ['select', 'pour', 'undo', 'win']) {
  const wav = join(projeto, 'assets', 'audio', `${nome}.wav`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', wav, '-c:a', 'libvorbis', '-q:a', '8', join(projeto, 'assets', 'audio', `${nome}.ogg`)], { stdio: 'inherit' });
  copyFileSync(wav, join(sonsWeb, `${nome}.wav`));
  rmSync(wav);
}
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
mkdirSync(join(destino, 'sons'), { recursive: true });
for (const arquivo of readdirSync(sonsWeb)) copyFileSync(join(sonsWeb, arquivo), join(destino, 'sons', arquivo));
copyFileSync(join(web, 'scripts', 'mkpotion-som.js'), join(destino, 'mkpotion-som.js'));

// Página do jogo: idioma, fundo (creme do MKpause) e aviso de carregamento.
const trocas = [
  ['<html lang="en-us">', '<html lang="pt-BR">'],
  ['platform.document.body.style.background = "#7f7f7f"', 'platform.document.body.style.background = "#F6EFE4"'],
  ['<title>mkpotion</title>', '<title>mk potion</title>'],
  ['background: green;', 'background: #FFFAF7; border-radius: 999px; padding: 8px 16px; font: 600 16px system-ui, sans-serif;'],
  ['color: blue;', 'color: #594131;'],
  ['Loading, please wait ...', 'Carregando…'],
  // No celular o navegador exige um toque antes de liberar o som: o pygbag pede esse toque em inglês.
  ['Ready to start ! Please click/touch page', 'Toque para começar'],
  // Tocador dos efeitos pela Web Audio: sem ruído, porque não depende do ritmo dos quadros do jogo.
  ['</head>', '    <script src="mkpotion-som.js"></script>\n</head>'],
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

if (!existsSync(join(destino, 'mkpotion.apk'))) console.warn('Aviso: mkpotion.apk não foi gerado.');
if (dirname(trabalho) !== tmpdir() || !basename(trabalho).startsWith('mkpause-mkpotion-')) throw new Error('Pasta temporária inesperada.');
rmSync(trabalho, { recursive: true, force: true });
console.log(`Pronto: ${destino}`);
