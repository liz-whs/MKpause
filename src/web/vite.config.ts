/// <reference types="vitest/config" />
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * O PianoPause (pygbag) baixa o próprio pacote `.tar.gz` e o descompacta sozinho.
 * O servidor do Vite marca arquivos .gz com `Content-Encoding: gzip`, e aí o
 * navegador descompacta antes e o jogo trava. Aqui o arquivo vai como está.
 * Em produção, configure o servidor da mesma forma (sem Content-Encoding).
 */
function pacotesDosJogos(): Plugin {
  const servir =
    (raiz: string): Connect.NextHandleFunction =>
    (req, res, next) => {
      const url = req.url?.split('?')[0] ?? '';
      if (!url.startsWith('/jogos/') || !url.endsWith('.tar.gz')) return next();
      const arquivo = join(raiz, decodeURIComponent(url));
      if (!existsSync(arquivo)) return next();
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', statSync(arquivo).size);
      createReadStream(arquivo).pipe(res);
    };
  return {
    name: 'mkpause-pacotes-dos-jogos',
    configureServer: (server) => {
      server.middlewares.use(servir(server.config.publicDir));
    },
    configurePreviewServer: (server) => {
      server.middlewares.use(servir(server.config.build.outDir));
    },
  };
}

export default defineConfig({
  plugins: [pacotesDosJogos(), react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
