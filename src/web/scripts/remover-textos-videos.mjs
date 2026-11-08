/** Migra vídeos com texto gravado para a instrução localizada no player.
 * Execute uma vez sobre assets com texto; mantém cópias fora do repositório.
 * Uso: node scripts/remover-textos-videos.mjs --backup=<pasta>
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const pasta = resolve(dirname(fileURLToPath(import.meta.url)), '../public/videos');
const backupArg = process.argv.find((arg) => arg.startsWith('--backup='))?.slice(9);
if (!backupArg) throw new Error('Informe uma pasta de backup fora do repositório.');
const backup = resolve(backupArg);
if (backup.startsWith(resolve(pasta, '../../../..'))) throw new Error('O backup deve ficar fora do repositório.');
mkdirSync(backup, {recursive:true});
for (const id of ['respiracao', 'espiral', 'chinchila']) {
  for (const formato of ['computador', 'celular']) {
    const nome = `${id}-${formato}`;
    const arquivo = join(pasta, `${nome}.mp4`);
    const original = join(backup, `${nome}.mp4`);
    if (existsSync(original)) throw new Error(`Backup já existe: ${original}. Não repetir a migração.`);
    copyFileSync(arquivo, original);
    const capa = join(pasta, `${nome}.jpg`);
    copyFileSync(capa, join(backup, `${nome}.jpg`));
    // A faixa fica abaixo de toda a geometria animada, cobrindo apenas a instrução.
    const inicio = id === 'respiracao' ? .69 : id === 'espiral' ? .82 : formato === 'computador' ? .85 : .81;
    const filtro = `drawbox=x=0:y=ih*${inicio}:w=iw:h=ih:color=0xF6EFE4:t=fill`;
    const novo = join(pasta, `${nome}.sem-texto.mp4`);
    execFileSync(process.env.FFMPEG ?? 'ffmpeg', ['-y','-loglevel','error','-i',original,
      '-vf',filtro,'-an','-c:v','libx264','-crf','12','-preset','fast','-threads','2',
      '-pix_fmt','yuv420p','-movflags','+faststart',novo], {stdio:'inherit'});
    execFileSync(process.env.FFMPEG ?? 'ffmpeg', ['-y','-loglevel','error','-ss','0.6','-i',novo,
      '-frames:v','1','-q:v','2',capa], {stdio:'inherit'});
    renameSync(novo, arquivo);
    console.log(`${nome}: animação preservada, texto separado.`);
  }
}
