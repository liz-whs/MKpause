# MKpause · Interface web

Site do MKpause para estudantes, profissionais e administração. Feito a partir do protótipo e do `HANDOFF.md`.

**Stack:** React, Vite, TypeScript, Tailwind CSS 4 e React Router, com API Django e banco PostgreSQL. Nos testes, os dados são de exemplo, em memória.

## Como rodar

Precisa do Node 20 ou mais novo.

```bash
cd src/web
npm install
npm run dev      # abre em http://localhost:5173
npm test         # testes (regras de produto e acessibilidade com axe)
npm run build    # versão de produção em dist/
```

## Como entrar

Inicie o backend conforme o [README do backend](../../backend/README.md). O Vite encaminha `/api/` para `127.0.0.1:8000`.

O comando `python manage.py criar_demo`, executado em `backend/`, cria as contas abaixo. Use a senha definida em `DEMO_SENHA` ou passada com `--senha`:

| E-mail | Perfil |
|---|---|
| `ana.demo@mkpause.dev` | Estudante |
| `professor.demo@mkpause.dev` | Professor(a) |
| `psicologo.demo@mkpause.dev` | Psicólogo(a) escolar (mesmas telas do professor) |
| `clinico.demo@mkpause.dev` | Psicólogo(a) clínico(a) |
| `admin.demo@mkpause.dev` | Administração |

O login com qualquer senha e os atalhos por nome de perfil existem apenas nos testes automatizados.

### Códigos de acesso

O cadastro por código e os pedidos de vínculo usam a API Django conforme o [contrato do backend](../../docs/codigos-de-acesso.md). Execute `python manage.py aplicar_esquema` em `backend/` para aplicar a V3 da Liz em um banco com V1. Os convites criam contas reais, e o aceite do estudante cria ou reativa o vínculo no banco. A simulação fica restrita aos testes; erros da API aparecem na tela.

### Dashboard clínico V5

Em **Psicólogo clínico → Acompanhados → estudante → Histórico e humor**, os indicadores usam `GET /api/estudantes/{id}/dashboard/`. Há períodos de 7/14/30/90 dias, evolução por sessão com tabela acessível, distribuição antes/depois e contagem por tipo de atividade. Erros aparecem na tela sem recorrer a dados simulados. O histórico mantém os registros disponíveis, independentemente do filtro dos gráficos. Veja o [contrato V5](../../docs/dashboard-clinico-v5.md).

## Estrutura

Em **Administração → Vínculos**, envie o convite ao responsável e acompanhe a resposta. Novos acessos clínicos só são criados após o aceite. Em **E-mails**, acompanhe e processe a fila. O padrão é a caixa local, sem entrega pela internet; o convite de teste pode ser aberto pelo atalho do cartão com debug ligado. Veja o [guia de convites e e-mails](../../docs/convites-e-emails.md).

```text
src/
├── styles/        tokens.css (cores, fontes, raios) e estilos base
├── assets/        chinchila (SVGs do protótipo)
├── components/
│   ├── ui/        botão, card, campo, selo, interruptor, ícones…
│   ├── student/   card de nível, grade de emoções, respiração, sequência de cuidados
│   ├── pro/       peças das telas de profissionais e administração
│   └── layout/    cabeçalho do estudante, menu lateral, navegação
├── features/      telas por área: onboarding, student, session, levels, school, clinical, admin
├── domain/        tipos e regras puras (emoções, níveis, sequência de cuidados)
├── data/          api.ts (única porta de dados) e mocks/
└── state/         estado do estudante e perfil do profissional logado
```

`src/data/api.ts` mantém o cache da interface e usa `src/data/servidor.ts` para acessar a API. Os fluxos de códigos usam `src/data/codigos.ts`.

## Regras do HANDOFF que o código garante

- **Níveis:**
  - nível 3 manda o alerta sozinho, com "Cancelar aviso";
  - nível 2 avisa quem acompanha;
  - nível 1 sugere "Ir direto" com ansioso, triste ou irritado.
- **Sem "Pedir ajuda":** a escola é avisada automaticamente quando o estudante toca no nível 3 ("Não estou bem"). Se ainda não estiver bem no fim de uma pausa, o "E agora?" leva ao nível 3. A linha 188/192 aparece no fim do nível 3 e no Perfil.
- **Humor:** 6 emoções, sem intensidade.
- **Cuidados:**
  - um cuidado por dia útil mantém a sequência, e o fim de semana não conta;
  - nada de "perdeu";
  - só o aluno vê.
- **Privacidade:**
  - o aluno não vê contagem nem histórico de pausas;
  - cada profissional só lê estudantes vinculados;
  - registros clínicos só para o psicólogo clínico.
- **Acessibilidade (WCAG 2.1 AA):**
  - título por página e "Pular para o conteúdo";
  - foco visível e alvos de 48 px, botões de 56 px;
  - respiração alternativa com `prefers-reduced-motion`.

## PianoPause

O jogo original (`src/jogos/pianopause/main.py`, em pygame, de Ana Beatriz Patussi) roda dentro da tela do PianoPause. Ele foi compilado para o navegador com o [pygbag](https://pypi.org/project/pygbag/).

- **Mudanças no jogo (autorizadas):** além do código original, o `main.py` ganhou duas coisas.
  - Um **modo para computador** (tela de 1200 × 720), aberto com `?modo=computador`. A interface usa esse modo a partir de 1024 px. Os elementos continuam um embaixo do outro, centralizados, e na partida o tabuleiro fica mais largo.
  - A constante **`ESCALA`**, que desenha em resolução maior no navegador (2× no celular, 1,5× no computador) para não pixelar.
- **O que não mudou:** o layout em pé (celular) é idêntico, pixel a pixel, ao original. Rodando `python main.py`, o jogo abre como antes, em pé e com 480 × 720.

- O resultado fica em `public/jogos/pianopause/` e é mostrado num `iframe`.
- Para refazer depois de mudar o jogo:

  ```bash
  python -m pip install pygbag
  npm run build:pianopause
  ```

  O script copia o `main.py` para uma pasta temporária, compila e grava em `public/jogos/pianopause/`. Também traduz a página de carregamento e aplica as cores do MKpause. A pasta `src/jogos/` nunca é alterada.
- **Fontes:** o jogo usa as mesmas fontes do site (Fraunces nos títulos, Lexend nos textos), em `src/jogos/pianopause/fontes/` com a licença OFL. Os textos do jogo seguem a ortografia do português.
- **Carregamento:** o jogo começa a carregar escondido já na escolha da atividade (ou no "Como você está", vindo de Atividades com o PianoPause escolhido). Ao abrir a tela do jogo, ele já está pronto ou quase. Veja `src/features/session/JogoPianoPause.tsx`.
- **Dependência externa:** o interpretador Python para WebAssembly vem do CDN do pygame-web (`pygame-web.github.io`) quando o jogo abre. Sem internet, o jogo não carrega.
- **Servidor:** o arquivo `pianopause.tar.gz` precisa ir **sem** `Content-Encoding: gzip`. O `vite.config.ts` já faz isso no `dev` e no `preview`, e o servidor de produção precisa da mesma regra.

## MK Potion

Jogo de organizar líquidos da Ana (`src/MKpotion/mk_potion`), compilado com o pygbag para `public/jogos/mkpotion/` e aberto num iframe na pausa (`/estudante/pausa/mkpotion`). A adaptação web usa `?mkpause=1` para ajustar o canvas à área disponível, melhorar a resolução e remover controles redundantes. As fontes Fraunces/Lexend e cores do site foram aplicadas ao jogo; as licenças acompanham os arquivos em `assets/fonts_mkpause/`.

- Recompilar: `npm run build:mkpotion` (Python com `pygbag==0.9.3`; `PYTHON=/caminho/python` para escolher o interpretador). Precisa de internet: o pygbag baixa o modelo da página.
- O script acrescenta `import pygame` só na cópia temporária do `main.py`: o pygbag só carrega o pygame se ele for importado no `main.py`, e o MK Potion importa em `game/screens.py`. Vale a Ana colocar essa linha no `main.py` dela.
- No backend, a atividade é do tipo `JOGO` com `conteudo_ou_referencia = /jogos/mkpotion/index.html`: é a referência que diferencia os dois jogos (`atividadeDe` em `src/data/servidor.ts`). O `criar_demo` cria os dois jogos e pode ser executado novamente sem duplicá-los, inclusive se o MK Potion já tiver sido cadastrado pela API. O deploy do Render já executa esse comando.
- O progresso do jogo fica no navegador (localStorage), como a Ana fez.

## Indicadores em PHP e vídeo de respiração

Execute `npm run indicadores` em outro terminal junto do Django e do Vite. O painel fica em `/admin/indicadores`, exige administrador e usa apenas agregados com supressão de grupos pequenos. Veja [execução e testes do PHP](../indicadores/README.md) e [hospedagem Docker](../../docs/indicadores-php.md).

A atividade Vídeo usa arquivos locais de 30 segundos em `public/videos/`: 1080 × 1920 no celular e 1280 × 720 no computador, capas e legendas PT/EN/ES. O gerador está em `scripts/video-respiracao.py` e requer Pillow, ffmpeg e as fontes do PianoPause.

## Acessibilidade e idioma

Botão **Acessibilidade e idioma** no topo de todas as telas (e as mesmas opções no Perfil). As escolhas ficam salvas no aparelho (`localStorage`, chave `mkpause:preferencias`) e valem antes do login.

- **Idioma:** português, inglês e espanhol. Muda o `lang` da página e o título da aba.
- **Tamanho do texto:** 100%, 125% ou 150% (o texto usa `rem`, então o site inteiro acompanha).
- **Alto contraste, menos movimento, fonte mais legível** (Atkinson Hyperlegible): atributos no `<html>`, estilos no fim de `src/styles/index.css`.
- **Libras:** usa o VLibras (vlibras.gov.br), serviço externo do governo federal, baixado só quando a opção está ligada. Ele só se monta se carregar junto com a página: ao ligar, a página recarrega uma vez.

### Como traduzir

- Todo texto visível passa por `t('Texto em português')` (`src/i18n`). A chave é o próprio texto em português; as traduções ficam em `src/i18n/en.ts` e `src/i18n/es.ts`.
- Texto com valor: `t('Oi, {nome}!', { nome })`. Ordem e pontuação mudam em cada idioma, então a frase inteira é uma chave só.
- Ao trocar de idioma, as telas são remontadas (ver `Raiz` em `src/router.tsx`).
- O teste `src/preferencias/preferencias.test.tsx` falha se algum `t('...')` ficar sem inglês ou espanhol.
- Dados cadastrados pela escola (nomes, turmas, disciplinas, anotações dos profissionais) aparecem como foram escritos.
- O PianoPause continua em português: o texto dele fica no `main.py`.

## Pontos em aberto

- **Telas sem desenho no protótipo:**
  - "Esqueci minha senha";
  - cadastro de professores e psicólogos;
  - editar e adicionar conteúdo.
- **Cor do hover:** a cor do HANDOFF (`#9D7D63`) não chega a 4,5:1. Os botões usam `#6E5442` sob o cursor, e os links ganham um sublinhado mais grosso.
