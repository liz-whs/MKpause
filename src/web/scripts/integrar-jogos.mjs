// Adapta somente as cópias web. As versões desktop conservam seus menus.
import { cpSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function editar(caminho, transformar) {
  writeFileSync(caminho, transformar(readFileSync(caminho, 'utf8').replace(/\r\n/g, '\n')));
}

function padronizarBotoes(projeto) {
  editar(join(projeto, 'game', 'ui.py'), (s) => s
    .replace('        shadow = self.rect.move(0, int(4 * scale))\n        pygame.draw.rect(surface, tuple(int(c * 0.82) for c in bg), shadow, border_radius=radius)\n', '')
    .replace('        if theme["thick"] > 3:\n            pygame.draw.rect(surface, theme["outline"], self.rect', '        if theme["thick"] > 3 or self.style == "secondary":\n            pygame.draw.rect(surface, theme["cacao"], self.rect'));
}

export function integrarPotion(projeto) {
  padronizarBotoes(projeto);
  editar(join(projeto, 'game', 'ui.py'), (s) => s
    .replace('"btn_secondary": (MK_PEONY, MK_INK)', '"btn_secondary": (MK_SURFACE, MK_INK)')
    .replace(/def draw_background\(surface, theme, calm: bool = False\) -> None:[\s\S]*?(?=_MASCOT_CACHE:)/, 'def draw_background(surface, theme, calm: bool = False) -> None:\n    surface.fill(theme["bg"])\n\n\n'));
  editar(join(projeto, 'game', 'screens.py'), (s) => s
    .replace('    MIN_SIZE = (800, 560)', '    MIN_SIZE = (360, 560) if web.EMBUTIDO else (800, 560)')
    .replace('        bw, bh, gap = 210 * s, 62 * s, 14 * s', '        bw, bh, gap = 210 * s, 62 * s, 14 * s\n        if web.EMBUTIDO:\n            bw, bh = min(bw, (w - 48 - 2 * gap) / 3), max(44, bh)')
    .replace('        self.screens[self.state.current].on_enter()', '        if web.EMBUTIDO:\n            self.state.go(Screen.PLAYING)\n        self.screens[self.state.current].on_enter()')
    .replace('    def go(self, screen: Screen) -> None:\n        self.state.go(screen)', '    def go(self, screen: Screen) -> None:\n        if web.EMBUTIDO and screen == Screen.MENU:\n            screen = Screen.PLAYING\n        self.state.go(screen)')
    .replace('("menu", "Voltar ao menu", "home", "secondary", "Ir para a tela inicial (seu progresso fica salvo)")', '("menu", "Fases" if web.EMBUTIDO else "Voltar ao menu", "grid", "secondary", "Escolher uma fase")')
    .replace('        elif key == "menu":\n            a.go(Screen.MENU)', '        elif key == "menu":\n            a.go(Screen.LEVELS if web.EMBUTIDO else Screen.MENU)')
    .replace('        if self.stuck_popup:\n            r = self.popup_rect(w, h)', '        if web.EMBUTIDO:\n            out.append(self.btn("settings", "Ajustes", w - 174 * s, 18 * s, 150 * s, 52 * s, icon="settings", style="secondary", tooltip="Ajustar o jogo"))\n        if self.stuck_popup:\n            r = self.popup_rect(w, h)')
    .replace('        elif key == "pause":\n            self.app.go(Screen.PAUSED)', '        elif key == "settings":\n            self.app.go(Screen.SETTINGS)\n        elif key == "pause":\n            self.app.go(Screen.PAUSED)')
    .replace('("menu", "Voltar ao menu", "home", "secondary", "Ir para a tela inicial")', '("menu", "Continuar" if web.EMBUTIDO else "Voltar ao menu", "play", "secondary", "Voltar ao jogo")')
    .replace('back_label = "Voltar ao jogo" if self.origin == Screen.PLAYING else "Voltar ao menu"', 'back_label = "Voltar ao jogo" if web.EMBUTIDO or self.origin == Screen.PLAYING else "Voltar ao menu"'));
}

export function integrarConnection(projeto, fontes) {
  padronizarBotoes(projeto);
  cpSync(fontes, join(projeto, 'assets', 'fonts_mkpause'), { recursive: true });
  editar(join(projeto, 'game', 'ui.py'), (s) => s
    .replace('        self.file = str(files[0]) if files else None', '        self.file = str(files[0]) if files else None\n        self.mk_fonts = ASSETS_FONTS.parent / "fonts_mkpause"')
    .replace('                if self.file:', '                if (self.mk_fonts / "Lexend-Regular.ttf").exists():\n                    font = pygame.font.Font(str(self.mk_fonts / ("Lexend-SemiBold.ttf" if bold else "Lexend-Regular.ttf")), size)\n                elif self.file:')
    .replace('\n\ndef draw_text(', '\n\n    def titulo(self, size):\n        key = (int(size), "titulo")\n        if key not in self.cache:\n            self.cache[key] = pygame.font.Font(str(self.mk_fonts / "Fraunces-SemiBold.ttf"), max(14, int(size)))\n        return self.cache[key]\n\ndef draw_text('));
  editar(join(projeto, 'game', 'settings.py'), (s) => s
    .replace('"#6B403B"', '"#594131"').replace('CREAM = (251, 244, 240)', 'CREAM = (246, 239, 228)'));
  editar(join(projeto, 'game', 'themes.py'), (s) => s
    .replace('"text_soft": JUNGLE', '"text_soft": (110, 84, 66)')
    .replace('"btn_secondary": (PEONY, CACAO)', '"btn_secondary": ((255, 250, 247), CACAO)')
    .replace('"panel_border": (240, 214, 207)', '"panel_border": (230, 216, 198)')
    .replace('"panel": (255, 252, 250)', '"panel": (255, 250, 247)'));
  editar(join(projeto, 'game', 'screens.py'), (s) => s
    .replace('        bt = self.app.board_theme', '        if web.EMBUTIDO:\n            surface.fill(self.app.theme["bg"])\n            return\n        bt = self.app.board_theme')
    .replace('        self.screens[Screen.MENU].on_enter()', '        if web.EMBUTIDO:\n            self.start_level(self.progress.next_to_play(self.levels.ids()))\n        else:\n            self.screens[Screen.MENU].on_enter()')
    .replace('    def go(self, screen: Screen) -> None:\n        self.state.go(screen)', '    def go(self, screen: Screen) -> None:\n        if web.EMBUTIDO and screen == Screen.MENU:\n            screen = Screen.PLAYING\n        self.state.go(screen)')
    .replace('        target = self.state.back()', '        target = self.state.back()\n        if web.EMBUTIDO and target == Screen.MENU:\n            self.state.go(Screen.PLAYING)\n            target = Screen.PLAYING')
    .replace('        return [\n            self.back_button(w, h),\n            self.btn("hint"', `        if web.EMBUTIDO:
            items = [("levels", "Fases", "grid"), ("themes", "Temas", "palette"), ("settings", "Ajustes", "gear"), ("hint", "Dica", "hint")]
            gap, margin = 8, 12
            bw = min(140 * s, (w - 2 * margin - 3 * gap) / 4)
            x0 = (w - 4 * bw - 3 * gap) / 2
            return [self.btn(key, label, x0 + i * (bw + gap), h - 58, bw, 44,
                             style="secondary", tooltip=label)
                    for i, (key, label, icon) in enumerate(items)]
        return [
            self.back_button(w, h),
            self.btn("hint"`)
    .replace('        if key == "back":\n            self.leave()', '        if key in ("levels", "themes", "settings"):\n            self.app.leave_level()\n            self.app.go({"levels": Screen.DIFFICULTY, "themes": Screen.THEMES, "settings": Screen.SETTINGS}[key])\n        elif key == "back":\n            self.leave()')
    .replace('int(h * 0.915)', 'int(h * 0.87) if web.EMBUTIDO else int(h * 0.915)')
    .replace('a.fonts.get(48 * s, True)', 'a.fonts.titulo(48 * s)')
    .replace('a.fonts.get(40 * s, True)', 'a.fonts.titulo(40 * s)'));
}

export function integrarPiano(projeto) {
  editar(join(projeto, 'main.py'), (s) => s
    .replace('MODO_COMPUTADOR = modo_computador()', 'MODO_COMPUTADOR = modo_computador()\nEMBUTIDO = sys.platform == "emscripten" and "mkpause=1" in str(__import__("platform").window.location.search)')
    .replace('    executando = True', '    if EMBUTIDO:\n        iniciar_jogo()\n    executando = True')
    .replace('    while executando:\n', '    while executando:\n        if EMBUTIDO and __import__("platform").window.frameElement is not None and __import__("platform").window.frameElement.parentElement.inert:\n            relogio.tick(60)\n            await asyncio.sleep(0)\n            continue\n')
    .replace('            mudar_estado("inicio")', '            iniciar_jogo() if EMBUTIDO else mudar_estado("inicio")')
    .replace(/    botao\(\n        "Encerrar",[\s\S]*?\n    \)/g, (bloco) => '    if not EMBUTIDO:\n' + bloco.split('\n').map((linha) => '    ' + linha).join('\n'))
    .replace('elif dentro("botao_encerrar_jogo", x, y):', 'elif not EMBUTIDO and dentro("botao_encerrar_jogo", x, y):')
    .replace('elif dentro("botao_encerrar_pausa", x, y):', 'elif not EMBUTIDO and dentro("botao_encerrar_pausa", x, y):')
    .replace('PEONY = (247, 221, 213)', 'PEONY = (246, 239, 228) if EMBUTIDO else (247, 221, 213)')
    .replace('"PIANOPAUSE | Nível 1"', '"Nível 1" if EMBUTIDO else "PIANOPAUSE | Nível 1"'));
}
