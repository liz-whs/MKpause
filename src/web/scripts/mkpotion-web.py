"""Identidade e layout da cópia web do mk potion; lógica original preservada."""
import math
import pygame
from . import web
from .ui import draw_text, draw_panel, draw_icon, load_mascot, wrap_text, _tinted
from .game_state import Screen


def metrics(w,h):
    try:u=w/float(web._janela().innerWidth) if web.EMBUTIDO else 1
    except Exception:u=1
    return u,w/u,h/u

def box(x,y,w,h,u):return pygame.Rect(*(round(v*u) for v in (x,y,w,h)))

def scene(w,h):
    u,cw,ch=metrics(w,h);wide=cw>=720 and cw/ch>=1.3
    side=min(320,max(250,cw*.24)) if wide else cw
    area=box(side+16,12,cw-side-32,ch-24,u) if wide else box(12,98,cw-24,max(160,ch-336),u)
    message=box(16,160,side-32,min(210,max(120,ch-350)),u) if wide else box(12,ch-228,cw-24,112,u)
    return u,cw,ch,wide,side,area,message


def aplicar(ns):
    Play=ns['PlayScreen'];Board=ns['BoardView']
    ns['App'].web_unit=property(lambda app: metrics(*app.window.get_size())[0])
    def label(self,surface,text,size,x,y,u,title=False,color=None):
        font=self.app.fonts.titulo(size*u) if title else self.app.fonts.get(size*u)
        return draw_text(surface,text,font,color or self.app.theme['text'],midtop=(round(x*u),round(y*u)))
    def para(self,surface,text,size,x,y,width,u):
        font=self.app.fonts.get(size*u)
        for line in wrap_text(text,font,width*u):
            draw_text(surface,line,font,self.app.theme['text_soft'],midtop=(round(x*u),round(y*u)))
            y+=font.get_linesize()/u+3
        return y
    def head(self,surface,title):
        w,h=surface.get_size();u,cw,ch=metrics(w,h);surface.fill(self.app.theme['bg'])
        label(self,surface,title,28,cw/2,72,u,True)
        return u,cw,ch
    def back(self,u):return self.btn('back','Voltar',16*u,12*u,96*u,44*u,style='secondary')
    def glyph(surface,name,center,size,color):
        icon=_tinted('icons',name,round(size),color)
        if icon is not None:
            image=icon.subsurface(icon.get_bounding_rect(min_alpha=1));surface.blit(image,image.get_rect(center=center))
    def board_layout(self,area):
        self.area=area;n=len(self.session.state);self.rects=[];self.cells=[]
        if not n:self.lift=[];return
        u,cw,ch=metrics(*self.app.window.get_size())
        cols=min(3,n) if cw<600 else n if n<=5 else math.ceil(n/2)
        rows=math.ceil(n/cols);row_h=area.height/rows;cell_w=area.width/cols
        ratio=.9*self.session.capacity+.4
        bh=min(row_h*.78,cell_w*.62*ratio);bw=bh/ratio
        for i in range(n):
            row,col=divmod(i,cols);in_row=min(cols,n-row*cols)
            x=area.x+(area.width-in_row*cell_w)/2+col*cell_w;y=area.y+row*row_h
            self.cells.append(pygame.Rect(round(x),round(y),round(cell_w),round(row_h)))
            self.rects.append(pygame.Rect(round(x+(cell_w-bw)/2),round(y+(row_h-bh)/2),round(bw),round(bh)))
        if len(self.lift)!=n:self.lift=[0.0]*n
    Board.layout=board_layout
    original_button=Play.on_button
    def on_button(self,key):
        if key=='levels':self.app.go(Screen.LEVELS)
        else:original_button(self,key)
    Play.on_button=on_button
    def popup_rect(self,w,h):
        u,cw,ch=metrics(w,h);pw=min(560,cw-24);ph=min(420,ch-24)
        return box((cw-pw)/2,(ch-ph)/2,pw,ph,u)
    Play.popup_rect=popup_rect
    def play_buttons(self,w,h):
        u,cw,ch,wide,side,area,message=scene(w,h);self.board.layout(area.inflate(-round(24*u),-round(24*u)))
        cols=2 if wide else 3;gap=8;bw=(side-32-gap*(cols-1))/cols
        items=[('pause','Pausar'),('levels','Fases'),('restart','Reiniciar'),('undo','Desfazer'),('hint','Dica'),('settings','Ajustes')]
        out=[self.btn(key,text,(16+(i%cols)*(bw+gap))*u,(ch-(164 if wide else 108)+(i//cols)*52)*u,bw*u,44*u,style='secondary') for i,(key,text) in enumerate(items)]
        if self.stuck_popup:
            r=self.popup_rect(w,h)
            for i,(key,text) in enumerate([('stuck_undo','Voltar um passo'),('stuck_restart','Reiniciar fase'),('stuck_close','Continuar olhando')]):
                out.append(self.btn(key,text,r.x+16*u,r.bottom-(164-i*52)*u,r.width-32*u,44*u,style='secondary',enabled=key!='stuck_undo' or self.app.session.can_undo()))
        return out
    Play.build_buttons=play_buttons
    def message(self,surface):
        a=self.app;u,cw,ch,wide,side,area,r=scene(*surface.get_size())
        text=self.message or ('Sem saída por aqui. Você pode desfazer ou recomeçar, sem pressa.' if self.stuck else 'Organize uma cor de cada vez. Vá no seu ritmo.')
        draw_panel(surface,r,a.theme,u,radius=round(20*u))
        head_size=min(52,r.height/u*.25) if wide else 40
        image=load_mascot('mascot_think',round(head_size*u))
        if wide:
            if image:surface.blit(image,image.get_rect(midtop=(r.centerx,r.y+12*u)))
            para(self,surface,text,16 if r.height/u>=180 else 14,r.centerx/u,r.y/u+head_size+26,r.width/u-28,u)
        else:
            if image:surface.blit(image,image.get_rect(midleft=(r.x+10*u,r.centery)))
            font=a.fonts.get(14*u);lines=wrap_text(text,font,r.width-78*u);y=r.centery-len(lines)*font.get_linesize()/2
            for line in lines:
                draw_text(surface,line,font,a.theme['text'],topleft=(round(r.x+66*u),round(y)));y+=font.get_linesize()
    Play.draw_message=message
    def popup_draw(self,surface,w,h):
        a=self.app;u,cw,ch=metrics(w,h);veil=pygame.Surface((w,h),pygame.SRCALPHA);veil.fill((62,43,32,110));surface.blit(veil,(0,0))
        r=self.popup_rect(w,h);draw_panel(surface,r,a.theme,u,radius=round(24*u))
        image=load_mascot('mascot_think',round(54*u))
        if image:surface.blit(image,image.get_rect(midtop=(r.centerx,r.y+12*u)))
        y=para(self,surface,'Podemos tentar outro caminho',20,r.centerx/u,r.y/u+80,r.width/u-32,u)
        para(self,surface,'Tudo bem! Volte um passo ou reinicie a fase para experimentar outra solução.',15,r.centerx/u,y+8,r.width/u-32,u)
        pos=pygame.mouse.get_pos()
        for b in self.buttons:
            if b.key.startswith('stuck_'):b.draw(surface,a.theme,a.fonts,u,b.enabled and b.rect.collidepoint(pos),False)
    Play.draw_stuck_popup=popup_draw
    def play_draw(self,surface):
        a=self.app;u,cw,ch,wide,side,area,r=scene(*surface.get_size());surface.fill(a.theme['bg'])
        pygame.draw.rect(surface,(168,157,177),area,border_radius=round(24*u))
        pygame.draw.rect(surface,(132,118,143),area,width=max(1,round(2*u)),border_radius=round(24*u))
        label(self,surface,'Fase %d'%a.session.level_id,32 if wide else 26,side/2,24 if wide else 14,u,True)
        label(self,surface,'Organizadas: %d de %d'%(a.session.organized_count(),a.session.color_count()),16,side/2,78 if wide else 58,u,color=a.theme['text_soft'])
        self.board.draw(surface);self.draw_message(surface)
        pos=pygame.mouse.get_pos()
        for i,b in enumerate(self.buttons):
            if not b.key.startswith('stuck_'):b.draw(surface,a.theme,a.fonts,u,b.enabled and b.rect.collidepoint(pos),i==self.focus)
        if self.stuck_popup:self.draw_stuck_popup(surface,*surface.get_size())
    Play.draw=play_draw

    def levels_buttons(self,w,h):
        u,cw,ch=metrics(w,h);cols=4 if cw>=720 else 2;rows=math.ceil(len(self.app.levels.ids())/cols)
        width=min(180,(cw-32-(cols-1)*12)/cols);height=min(148,(ch-210-(rows-1)*12)/rows)
        start=(cw-(width*cols+(cols-1)*12))/2;out=[back(self,u)]
        for i,lid in enumerate(self.app.levels.ids()):
            out.append(self.btn('lvl:%d'%lid,'', (start+(i%cols)*(width+12))*u,(140+(i//cols)*(height+12))*u,width*u,height*u,enabled=self.app.progress.is_unlocked(lid,self.app.levels.ids())))
        out.append(self.btn('reset','Confirmar nova partida' if self.confirm_reset else 'Nova partida',(cw-min(300,cw-32))/2*u,(ch-56)*u,min(300,cw-32)*u,44*u,style='secondary'))
        return out
    def levels_draw(self,surface):
        u,cw,ch=head(self,surface,'Fases');pos=pygame.mouse.get_pos()
        for b in self.buttons:
            if not b.key.startswith('lvl:'):b.draw(surface,self.app.theme,self.app.fonts,u,b.rect.collidepoint(pos),False);continue
            r=b.rect;lid=int(b.key[4:]);done=self.app.progress.is_completed(lid)
            draw_panel(surface,r,self.app.theme,u,radius=round(20*u))
            compact=r.height<112*u
            d=min(44*u,r.height*.28) if compact else min(64*u,r.height*.42)
            center=(r.centerx,round(r.y+(8 if compact else 12)*u+d/2));tone=self.app.theme['peony'] if done else self.app.theme['lavender'] if b.enabled else (234,219,211)
            pygame.draw.circle(surface,tone,center,round(d/2));glyph(surface,'check' if done else 'play_game' if b.enabled else 'lock',center,d*.54,self.app.theme['text'])
            y=(center[1]+d/2)/u+(6 if compact else 8);label(self,surface,'Fase %d'%lid,15 if compact else 18,r.centerx/u,y,u,True)
            label(self,surface,'Concluída' if done else 'Disponível' if b.enabled else 'Bloqueada',11 if compact else 12,r.centerx/u,y+(22 if compact else 25),u,color=self.app.theme['text_soft'])
    ns['LevelsScreen'].build_buttons=levels_buttons;ns['LevelsScreen'].draw=levels_draw

    def settings_buttons(self,w,h):
        u,cw,ch=metrics(w,h);width=min(720,cw-32);x=(cw-width)/2;row=min(78,(ch-160)/5);bw=min(180,width*.44);out=[back(self,u)]
        for i,key in enumerate(['sound','volume','motion','contrast','patterns']):
            bx=x+width-bw;y=140+i*row
            if key=='volume':
                out.extend([self.btn('vol_down','−',bx*u,y*u,40*u,44*u,style='secondary'),self.btn('vol_up','+',(bx+bw-40)*u,y*u,40*u,44*u,style='secondary')])
            else:out.append(self.btn(key,self._value(key),bx*u,y*u,bw*u,44*u,style='secondary'))
        return out
    def settings_draw(self,surface):
        u,cw,ch=head(self,surface,'Ajustes');width=min(720,cw-32);x=(cw-width)/2;row=min(78,(ch-160)/5);bw=min(180,width*.44)
        for i,key in enumerate(['sound','volume','motion','contrast','patterns']):
            font=self.app.fonts.get(15*u)
            for j,line in enumerate(wrap_text(self.LABELS[key],font,(width-bw-16)*u)):
                draw_text(surface,line,font,self.app.theme['text'],topleft=(round(x*u),round((146+i*row+j*18)*u)))
            if key=='volume':label(self,surface,'%d%%'%round(self.app.settings.volume*100),14,x+width-bw/2,152+i*row,u)
        self.draw_buttons(surface)
    ns['SettingsScreen'].build_buttons=settings_buttons;ns['SettingsScreen'].draw=settings_draw

    def pause_buttons(self,w,h):
        u,cw,ch=metrics(w,h);width=min(340,cw-32)
        return [self.btn(key,text,(cw-width)/2*u,(170+i*56)*u,width*u,44*u,style='primary' if i==0 else 'secondary') for i,(key,text) in enumerate([('resume','Continuar'),('restart','Reiniciar fase'),('menu','Fases')])]
    def pause_draw(self,surface):
        u,cw,ch=head(self,surface,'Jogo pausado');para(self,surface,'Continue quando quiser. Seu progresso está guardado.',16,cw/2,114,cw-32,u);self.draw_buttons(surface)
    ns['PauseScreen'].build_buttons=pause_buttons;ns['PauseScreen'].draw=pause_draw

    complete_action=ns['CompleteScreen'].on_button
    def complete_button(self,key):
        if key=='menu':self.app.go(Screen.LEVELS)
        else:complete_action(self,key)
    def complete_buttons(self,w,h):
        u,cw,ch=metrics(w,h);width=min(360,cw-32);nxt=self.app.levels.next_id(self.app.session.level_id)
        items=[('next','Próxima fase')] if nxt is not None else []
        items += [('again','Jogar novamente'),('menu','Fases')]
        return [self.btn(key,text,(cw-width)/2*u,(ch-len(items)*56+i*56)*u,width*u,44*u,style='primary' if i==0 else 'secondary') for i,(key,text) in enumerate(items)]
    def complete_draw(self,surface):
        u,cw,ch=head(self,surface,'Você conseguiu!');image=load_mascot('mascot_happy',round(80*u))
        if image:surface.blit(image,image.get_rect(midtop=(round(cw/2*u),round(130*u))))
        para(self,surface,'Muito bem por ter encontrado sua solução.',17,cw/2,230,cw-32,u);self.draw_buttons(surface)
    ns['CompleteScreen'].on_button=complete_button;ns['CompleteScreen'].build_buttons=complete_buttons;ns['CompleteScreen'].draw=complete_draw
