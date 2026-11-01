# MK Potion no navegador

O jogo continua sendo o mesmo código Python/Pygame: o **pygbag** o roda no navegador via
WebAssembly (nada foi reescrito, telas, regras, fases e visual são os mesmos).
O desktop continua funcionando com `python main.py`.

## 1. Gerar a versão web (uma vez, precisa de internet)

- Windows: dê dois cliques em `build_web.bat`
- Linux/macOS: `./build_web.sh`

(ou: `pip install pygbag` e `python -m pygbag --build main.py`)

O resultado fica em **`build/web/`** (`index.html`, `mk_potion.apk`, `favicon.png`).

## 2. Testar localmente

`testar_web.bat` / `./testar_web.sh` e abra http://localhost:8000
(não funciona abrindo o `index.html` com duplo clique: precisa de um servidor).

## 3. Colocar no seu site

1. Envie o conteúdo de `build/web/` para uma pasta do site, por ex. `meusite.com/jogo/`.
2. Na página onde o jogo deve aparecer, use um iframe (veja `site_exemplo.html`):

```html
<iframe src="/jogo/index.html" title="MK Potion" allow="autoplay; fullscreen"
        style="width:100%;aspect-ratio:1000/700;border:0"></iframe>
```

Ou simplesmente linke para `/jogo/` e o jogo abre em tela cheia.
Use **HTTPS** (a maioria das hospedagens já usa). O primeiro carregamento baixa o
runtime do Python (~10-20 MB, depois fica em cache do navegador) e o jogador
precisa **clicar na tela uma vez** para começar (exigência dos navegadores para liberar o som).

## O que foi ajustado no código

| Arquivo | Mudança |
|---|---|
| `main.py` | `async main()` + `asyncio.run(main())` (exigência do pygbag; no desktop funciona igual) |
| `game/screens.py` | `App.run()` virou `async` e devolve o controle ao navegador a cada quadro (`await asyncio.sleep(0)`) |
| `game/storage.py` (novo) | No desktop grava `data/*.json` como antes; no navegador grava progresso e configurações no `localStorage` |
| `game/progress.py`, `game/settings.py` | passam a usar `storage.py` |
| `game/ui.py` | No navegador não há fontes do sistema, então usa a fonte embutida `assets/fonts_web/` (Liberation Sans) |

Para usar outra fonte (ex.: Nunito) no navegador, troque os dois arquivos `.ttf` em `assets/fonts_web/`
mantendo os nomes `LiberationSans-Regular.ttf` / `LiberationSans-Bold.ttf` (ou edite `game/ui.py`).

## Observações

- O progresso fica no navegador do jogador (por site/aparelho). Limpar os dados do site apaga o progresso.
- Se quiser que o progresso vá para o banco de dados da plataforma, é só trocar `game/storage.py`.
- Tecla `Tab` pode ser capturada pelo navegador; o mouse/toque funciona normalmente.
