"""Layout da cópia web do mk connection; não altera as regras nem o progresso."""
import pygame
from . import web
from .level_manager import category_of_level
from .ui import draw_text, draw_panel, load_mascot, wrap_text


def layout(w, h):
    # Medidas em pixels CSS; o canvas continua nítido em telas de alta densidade.
    try:
        unit = w / float(web._janela().innerWidth) if web.EMBUTIDO else 1
    except Exception:
        unit = 1
    cw, ch = w/unit, h/unit
    wide = cw >= 720 and cw/ch >= 1.3
    if wide:
        side = min(340, max(250, round(cw*.25)))
        board = pygame.Rect(side+16, 12, cw-side-32, ch-24)
        message = pygame.Rect(16, 182, side-32, max(110, min(210, ch-304)))
    else:
        side = cw
        board = pygame.Rect(12, 100, cw-24, max(150,ch-292))
        message = pygame.Rect(12,ch-180,cw-24,112)
    def scaled(rect):
        return pygame.Rect(*(round(v*unit) for v in rect))
    return dict(wide=wide,side=round(side*unit),cx=round(side*unit/2),unit=unit,
                board=scaled(board),message=scaled(message))


def aplicar(cls):
    def build_buttons(self, w, h):
        info = layout(w, h)
        items = [('levels', 'Fases'), ('themes', 'Temas'), ('settings', 'Ajustes'), ('hint', 'Dica')]
        cols = 2 if info['wide'] else 4
        u = info['unit']
        gap, margin = 8*u, (16 if info['wide'] else 12)*u
        bw = (info['side'] - margin*2 - gap*(cols-1)) / cols
        return [self.btn(key, label, margin+(i%cols)*(bw+gap),
                         h-112*u+(i//cols)*52*u if info['wide'] else h-56*u,
                         bw, 44*u, style='secondary', tooltip=label)
                for i,(key,label) in enumerate(items)]

    def relayout(self):
        cls.__mro__[1].relayout(self)
        if self.app.session.level is not None:
            self.view.layout(layout(*self.app.window.get_size())['board'], self.app.session.level.size)

    def draw_message(self, surface):
        a = self.app
        info = layout(*surface.get_size())
        rect = info['message']
        text = self.hint.message if self.hint is not None else self.message if self.msg_t>0 and self.message else self.base_message()
        u = info['unit']
        draw_panel(surface, rect, a.theme, u, radius=round(20*u))
        head_size = round((min(72,rect.height/u*.25) if info['wide'] else 44)*u)
        head = load_mascot('mascot_think', head_size)
        if info['wide']:
            if head: surface.blit(head, head.get_rect(midtop=(rect.centerx,rect.y+12*u)))
            y = rect.y+head_size+28*u
            size = 17
            font = a.fonts.get(size*u)
            lines = wrap_text(text,font,rect.width-32*u)
            while size>14 and len(lines)*(font.get_linesize()+2*u)>rect.bottom-y-10*u:
                size-=1
                font=a.fonts.get(size*u)
                lines=wrap_text(text,font,rect.width-32*u)
            for line in lines:
                draw_text(surface,line,font,a.theme['text'],midtop=(rect.centerx,y))
                y += font.get_linesize()+2*u
        else:
            if head: surface.blit(head,head.get_rect(midleft=(rect.x+10*u,rect.centery)))
            size = 15
            font = a.fonts.get(size*u)
            lines = wrap_text(text,font,rect.width-86*u)
            while size>14 and len(lines)*font.get_linesize()>rect.height-16*u:
                size-=1
                font=a.fonts.get(size*u)
                lines=wrap_text(text,font,rect.width-86*u)
            y = rect.centery-len(lines)*font.get_linesize()//2
            for line in lines:
                draw_text(surface,line,font,a.theme['text'],topleft=(rect.x+74*u,y))
                y += font.get_linesize()

    def draw(self,surface):
        a = self.app
        w,h = surface.get_size()
        info = layout(w,h)
        sess = a.session
        lvl = sess.level
        surface.fill(a.theme['bg'])
        cx, u = info['cx'], info['unit']
        draw_text(surface,'Nível %d'%lvl.id,a.fonts.titulo((36 if info['wide'] else 28)*u),a.theme['text'],center=(cx,round((38 if info['wide'] else 23)*u)))
        cat = category_of_level(lvl.id)
        draw_text(surface,'%s · %d × %d'%(cat.label,lvl.size,lvl.size),a.fonts.get((18 if info['wide'] else 16)*u),a.theme['text_soft'],center=(cx,round((82 if info['wide'] else 53)*u)))
        done,total = sess.progress()
        draw_text(surface,'Conexões: %d de %d'%(done,total),a.fonts.get((17 if info['wide'] else 15)*u),a.theme['text_soft'],center=(cx,round((126 if info['wide'] else 80)*u)))
        self.view.draw(surface,sess,a.board_theme,a.palette,a.settings.symbols_visible,a.settings.high_contrast,a.scale,a.time,self.hint,a.settings.reduced_motion)
        self.draw_message(surface)
        self.draw_buttons(surface)

    cls.build_buttons = build_buttons
    cls.relayout = relayout
    cls.draw_message = draw_message
    cls.draw = draw
