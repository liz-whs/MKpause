/** Renderiza os scripts recebidos e prepara versões de computador/celular, capas e legendas. */
import { execFileSync, spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const web = join(dirname(fileURLToPath(import.meta.url)), '..');
const origem = join(web, '..', 'atividades', 'videos');
const destino = join(web, 'public', 'videos');
const python = process.env.PYTHON ?? 'python';
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg';
const ffprobe = process.env.FFPROBE ?? 'ffprobe';
const escolhido = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];
const reutilizar = process.argv.includes('--reuse');
const fonte = process.env.VIDEO_FONT ?? join(web, '..', 'MKpotion', 'mk_potion', 'assets', 'fonts_mkpause', 'Fraunces-SemiBold.ttf');
if (!existsSync(fonte)) throw new Error('Defina VIDEO_FONT com o caminho de uma fonte TTF.');
mkdirSync(destino, { recursive: true });
// Os renders verticais em alta resolução ficam fora do site: servem de origem para as versões publicadas.
const mestres = join(web, '.videos-mestres');
mkdirSync(mestres, { recursive: true });

function validar(arquivo, largura, altura, fps, quadros) {
  const stream = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,nb_frames,r_frame_rate', '-of', 'json', arquivo], { encoding: 'utf8' })).streams[0];
  const [num, den] = stream.r_frame_rate.split('/').map(Number);
  if (stream.width !== largura || stream.height !== altura || Number(stream.nb_frames) !== quadros || num / den !== fps) {
    throw new Error(`Resolução, cadência ou render incompleto: ${arquivo}`);
  }
}

for (const [id, inspirar, expirar] of [['espiral', 5, 7.5], ['chinchila', 4, 6]]) {
  if (escolhido && escolhido !== id) continue;
  const vertical = join(mestres, `${id}-celular.mp4`);
  const celular = join(destino, `${id}-celular.mp4`);
  const horizontal = join(destino, `${id}-computador.mp4`);
  const fps = id === 'chinchila' ? 60 : 30;
  if (!reutilizar || !existsSync(vertical)) {
    const trabalho = mkdtempSync(join(tmpdir(), `mkpause-video-${id}-`));
    try {
      const renders = await Promise.allSettled((id === 'chinchila' ? ['celular', 'computador'] : ['celular']).map(async (formato) => {
        const arquivo = join(trabalho, `${formato}.mp4`);
        const args = ['-X', 'utf8', join(origem, `gerar_video_${id}.py`), '--out', arquivo,
          '--scale', formato === 'computador' ? '2' : '4', '--cycles', '1', '--fps', String(fps), '--font', fonte];
        if (formato === 'computador') args.push('--landscape');
        await new Promise((resolve, reject) => {
          const render = spawn(python, args, { stdio: 'inherit', env: { ...process.env, PYTHONUTF8: '1' } });
          render.on('error', reject);
          render.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`Render ${id}/${formato}: saída ${code}`)));
        });
      }));
      for (const render of renders) if (render.status === 'rejected') throw render.reason;
      validar(join(trabalho, 'celular.mp4'), 2880, 3840, fps, Math.round((inspirar + expirar) * fps));
      if (id === 'chinchila') validar(join(trabalho, 'computador.mp4'), 3840, 2160, fps, 600);
      for (const formato of id === 'chinchila' ? ['celular', 'computador'] : ['celular']) {
        copyFileSync(join(trabalho, `${formato}.mp4`), formato === 'celular' ? vertical : horizontal);
      }
    } finally {
      if (!trabalho.startsWith(join(tmpdir(), 'mkpause-video-'))) throw new Error('Pasta temporária inesperada.');
      rmSync(trabalho, { recursive: true, force: true, maxRetries: 20, retryDelay: 200 });
    }
  }
  validar(vertical, 2880, 3840, fps, Math.round((inspirar + expirar) * fps));
  if (id === 'chinchila') validar(horizontal, 3840, 2160, fps, 600);
  if (id !== 'chinchila') execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', vertical, '-vf', 'scale=-2:2160:flags=lanczos,pad=3840:2160:(ow-iw)/2:(oh-ih)/2:color=0xF6EFE4',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-threads', '2', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', horizontal], { stdio: 'inherit' });
  // Celulares não decodificam H.264 acima de 4K: a versão publicada sai em 1080 x 1440, nível 4.1.
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', vertical, '-vf', 'scale=1080:1440:flags=lanczos',
    '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.1', '-preset', 'slow', '-crf', '18', '-tune', 'animation',
    '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', celular], { stdio: 'inherit' });
  validar(celular, 1080, 1440, fps, Math.round((inspirar + expirar) * fps));
  for (const formato of ['celular', 'computador']) execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-ss', '0.6', '-i', join(destino, `${id}-${formato}.mp4`), '-frames:v', '1', '-q:v', '2', join(destino, `${id}-${formato}.jpg`)], { stdio: 'inherit' });
  const tempo = (n) => new Date(n * 1000).toISOString().slice(11, 23);
  for (const [idioma, antes, depois] of [['pt-BR', 'Inspire devagar', 'Solte o ar devagar'], ['en', 'Breathe in slowly', 'Breathe out slowly'], ['es', 'Inspira despacio', 'Suelta el aire despacio']]) {
    writeFileSync(join(destino, `${id}.${idioma}.vtt`), `WEBVTT\n\n00:00:00.000 --> ${tempo(inspirar)}\n${antes}\n\n${tempo(inspirar)} --> ${tempo(inspirar + expirar)}\n${depois}\n`);
  }
  console.log(`${id}: versões de computador (4K) e celular (1080 x 1440), capas e legendas prontas.`);
}
