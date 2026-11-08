"""Telas auxiliares da versão integrada: medidas CSS e tipografia MKpause."""
import pygame
from .web_design import layout
from .ui import draw_text, draw_panel, wrap_text, draw_icon, _tinted, load_mascot
from .level_manager import CATEGORIES, category_by_key
from .themes import THEMES


def aplicar(ns):
    Card = ns['Card']
    def metrics(screen,w,h):
        u=layout(w,h)['unit']
        return u,w/u,h/u
    def rect(x,y,w,h,u):
        return pygame.Rect(*(round(v*u) for v in (x,y,w,h)))
    def text(screen,surface,label,size,x,y,u,heading=False,color=None):
        a=screen.app
        font=a.fonts.titulo(size*u) if heading else a.fonts.get(size*u)
        return draw_text(surface,label,font,color or a.theme['text'],midtop=(round(x*u),round(y*u)))
    def paragraph(screen,surface,label,size,x,y,width,u):
        font=screen.app.fonts.get(size*u)
        for line in wrap_text(label,font,width*u):
            draw_text(surface,line,font,screen.app.theme['text_soft'],midtop=(round(x*u),round(y*u)))
            y+=font.get_linesize()/u+3
        return y
    def back(screen,w,h,u):
        return screen.btn('back','Voltar',16*u,12*u,96*u,44*u,style='secondary')
    def header(screen,surface,label,subtitle=''):
        w,h=surface.get_size();u,cw,ch=metrics(screen,w,h)
        surface.fill(screen.app.theme['bg'])
        size=28
        while size>20 and screen.app.fonts.titulo(size*u).size(label)[0]>(cw-32)*u:size-=1
        text(screen,surface,label,size,cw/2,76,u,heading=True)
        if subtitle:paragraph(screen,surface,subtitle,15,cw/2,114,cw-32,u)
        return u,cw,ch
    def card(screen,r,paint,enabled=True):
        def draw(surface,area,hovered,active):
            u=layout(*surface.get_size())['unit']
            draw_panel(surface,area,screen.app.theme,u,radius=round(20*u))
            paint(surface,area,u)
            if hovered and active:pygame.draw.rect(surface,screen.app.theme['cacao'],area,width=max(1,round(u)),border_radius=round(20*u))
        return draw

    def difficulty_buttons(self,w,h):
        u,cw,ch=metrics(self,w,h);out=[back(self,w,h,u)]
        width=min(680,cw-32);height=min(116,(ch-180)/3-12)
        for i,cat in enumerate(CATEGORIES):
            enabled=self.app.progress.is_category_unlocked(cat,self.app.levels.ids())
            r=rect((cw-width)/2,150+i*(height+12),width,height,u)
            def paint(surface,area,u,cat=cat,enabled=enabled):
                a=self.app;y=area.y/u
                diameter=48 if cw<500 else 68
                center=(round(area.x+(16+diameter/2)*u),area.centery)
                tone={'easy':a.theme['peony'],'medium':a.theme['lavender'],'hard':a.theme['sky']}[cat.key] if enabled else (234,219,211)
                pygame.draw.circle(surface,tone,center,round(diameter*u/2))
                if enabled:
                    count={'easy':3,'medium':4,'hard':5}[cat.key]
                    step=max(3,round(diameter*.5*u/count))
                    size=max(2,round(step*.76))
                    span=(count-1)*step+size
                    start=(round(center[0]-span/2),round(center[1]-span/2))
                    for row in range(count):
                        for col in range(count):
                            cell=pygame.Rect(start[0]+col*step,start[1]+row*step,size,size)
                            pygame.draw.rect(surface,a.theme['text'],cell,border_radius=max(1,round(step*.18)))
                else:
                    # Centraliza o desenho visível, sem contar as margens transparentes do PNG.
                    icon=_tinted('icons','lock',round(diameter*.5*u*1.15),a.theme['text_soft'])
                    if icon is not None:
                        bounds=icon.get_bounding_rect(min_alpha=1)
                        glyph=icon.subsurface(bounds)
                        surface.blit(glyph,glyph.get_rect(center=center))
                x=area.x/u+16+diameter+16
                font=a.fonts.titulo((22 if cw<500 else 24)*u)
                draw_text(surface,cat.label,font,a.theme['text'],topleft=(round(x*u),round((y+16)*u)))
                subtitle='Tabuleiro %d × %d'%(cat.size,cat.size) if enabled else 'Conclua a dificuldade anterior'
                font=a.fonts.get((14 if cw<500 else 16)*u)
                available=area.right-x*u-(80 if enabled else 16)*u
                lines=wrap_text(subtitle,font,available)
                for j,line in enumerate(lines):draw_text(surface,line,font,a.theme['text_soft'],topleft=(round(x*u),round((y+50+j*19)*u)))
                if enabled:
                    done,total=a.progress.category_progress(cat)
                    cx=area.right-round(44*u)
                    for dot in range(total):
                        pos=(round(cx+(dot-(total-1)/2)*14*u),area.y+round(25*u))
                        pygame.draw.circle(surface,a.theme['cacao'] if dot<done else a.theme['lavender'],pos,round(4*u))
                    draw_text(surface,'%d de %d'%(done,total),a.fonts.get(12*u),a.theme['text_soft'],midtop=(cx,area.y+round(39*u)))
            out.append(Card('cat:'+cat.key,r,card(self,r,paint),enabled=enabled))
        return out
    def difficulty_draw(self,surface):
        header(self,surface,'Dificuldade');self.draw_buttons(surface)
    ns['DifficultyScreen'].build_buttons=difficulty_buttons
    ns['DifficultyScreen'].draw=difficulty_draw

    def levels_buttons(self,w,h):
        u,cw,ch=metrics(self,w,h);out=[back(self,w,h,u)]
        width=min(210,(cw-48)/3);height=min(210,max(144,width))
        x=(cw-(3*width+24))/2
        cat=category_by_key(self.app.state.category_key)
        for i,lid in enumerate(cat.level_ids):
            if not self.app.levels.has(lid):continue
            enabled=self.app.progress.is_level_unlocked(lid,self.app.levels.ids())
            r=rect(x+i*(width+12),172,width,height,u)
            def paint(surface,area,u,lid=lid,enabled=enabled):
                a=self.app;done=a.progress.is_completed(lid)
                diameter=min(82*u,area.width*.56)
                center=(area.centerx,area.y+round((58 if area.width/u>=150 else 46)*u))
                tone=a.theme['peony'] if done else a.theme['lavender'] if enabled else (234,219,211)
                pygame.draw.circle(surface,tone,center,round(diameter/2))
                icon=_tinted('icons','check' if done else 'play_game' if enabled else 'lock',round(diameter*.56),a.theme['cacao'])
                if icon is not None:
                    glyph=icon.subsurface(icon.get_bounding_rect(min_alpha=1))
                    surface.blit(glyph,glyph.get_rect(center=center))
                title_y=(center[1]+diameter/2)/u+12
                text(self,surface,'Nível %d'%lid,20,area.centerx/u,title_y,u,heading=True)
                text(self,surface,'Concluído' if done else 'Disponível' if enabled else 'Bloqueado',12,area.centerx/u,title_y+32,u,color=a.theme['text_soft'])
            out.append(Card('lvl:%d'%lid,r,card(self,r,paint),enabled=enabled))
        return out
    def levels_draw(self,surface):
        cat=category_by_key(self.app.state.category_key)
        done,total=self.app.progress.category_progress(cat)
        header(self,surface,cat.label,'Tabuleiro %d × %d · %d de %d concluídos'%(cat.size,cat.size,done,total));self.draw_buttons(surface)
    ns['LevelsScreen'].build_buttons=levels_buttons
    ns['LevelsScreen'].draw=levels_draw

    def themes_buttons(self,w,h):
        u,cw,ch=metrics(self,w,h);out=[back(self,w,h,u)]
        small=cw<720;width=min(760,cw-32) if small else min(260,(cw-64)/3)
        height=min(118,(ch-172)/3-12) if small else min(320,ch-200)
        for i,theme in enumerate(THEMES):
            x=(cw-width)/2 if small else (cw-(width*3+24))/2+i*(width+12)
            y=150+i*(height+12) if small else 160
            r=rect(x,y,width,height,u)
            def paint(surface,area,u,theme=theme):
                a=self.app
                if small:
                    preview=pygame.Rect(area.x+round(12*u),area.y+round(12*u),round((height-24)*u),round((height-24)*u))
                    cx=(preview.right+area.right)/2/u;top=area.y/u+22;available=area.width/u-height-24
                else:
                    preview=pygame.Rect(area.x+round(28*u),area.y+round(16*u),area.width-round(56*u),round((height-110)*u))
                    cx=area.centerx/u;top=area.bottom/u-86;available=width-24
                self.view.layout(preview,5);self.view.draw(surface,self.demo,theme,a.palette,True,a.settings.high_contrast,u,a.time)
                text(self,surface,theme.label,21,cx,top,u,heading=True)
                paragraph(self,surface,theme.description,13,cx,top+30,available,u)
                if a.progress.theme==theme.key:draw_icon(surface,'check',(area.right-18*u,area.y+18*u),16*u,a.theme['cacao'])
            out.append(Card('theme:'+theme.key,r,card(self,r,paint)))
        return out
    def themes_draw(self,surface):
        header(self,surface,'Temas');self.draw_buttons(surface)
    ns['ThemesScreen'].build_buttons=themes_buttons
    ns['ThemesScreen'].draw=themes_draw

    def settings_buttons(self,w,h):
        u,cw,ch=metrics(self,w,h);a=self.app;st=a.settings
        out=[back(self,w,h,u)];width=min(720,cw-32);x=(cw-width)/2
        row=min(80,(ch-172)/5);bw=min(180,width*.44)
        labels={'sound':'Ligados' if st.sound_enabled else 'Desligados','motion':'Reduzidas' if st.reduced_motion else 'Normais','contrast':'Alto' if st.high_contrast else 'Normal','symbols':'Mostrar' if st.show_symbols else 'Ocultar'}
        for i,(key,_) in enumerate(self.ROWS):
            bx=x+width-bw;y=146+i*row
            if key=='volume':
                out.append(self.btn('vol_down','−',bx*u,y*u,40*u,44*u,style='secondary'))
                out.append(self.btn('vol_up','+', (bx+bw-40)*u,y*u,40*u,44*u,style='secondary'))
            else:out.append(self.btn(key,labels[key],bx*u,y*u,bw*u,44*u,style='secondary'))
        return out
    def settings_draw(self,surface):
        u,cw,ch=header(self,surface,'Ajustes');width=min(720,cw-32);x=(cw-width)/2;row=min(80,(ch-172)/5);bw=min(180,width*.44)
        for i,(key,label) in enumerate(self.ROWS):
            font=self.app.fonts.get((15 if cw<500 else 17)*u)
            for j,line in enumerate(wrap_text(label,font,(width-bw-16)*u)):
                draw_text(surface,line,font,self.app.theme['text'],topleft=(round(x*u),round((150+i*row+j*20)*u)))
            if key=='volume':text(self,surface,'%d%%'%round(self.app.settings.volume*100),14,x+width-bw/2,158+i*row,u)
        self.draw_buttons(surface)
    ns['SettingsScreen'].build_buttons=settings_buttons
    ns['SettingsScreen'].draw=settings_draw

    def complete_buttons(self,w,h):
        u,cw,ch=metrics(self,w,h);width=min(360,cw-32);x=(cw-width)/2
        info=self.app.completion;next_=info is not None and info.next_id is not None
        return [self.btn('next' if next_ else 'difficulty','Próximo' if next_ else 'Fases',x*u,(ch-124)*u,width*u,48*u),
                self.btn('levels','Voltar às fases',x*u,(ch-64)*u,width*u,48*u,style='secondary')]
    def complete_draw(self,surface):
        u,cw,ch=header(self,surface,'Caminhos conectados!')
        head=load_mascot('mascot_happy',round(90*u))
        if head:surface.blit(head,head.get_rect(midtop=(round(cw*u/2),round(142*u))))
        info=self.app.completion
        y=paragraph(self,surface,'Você encontrou uma solução. Muito bem!',17,cw/2,250,cw-40,u)
        if info:
            y=paragraph(self,surface,'%s: %d de %d concluídos'%(info.category.label,info.done,info.total),16,cw/2,y+12,cw-40,u)
            if info.unlocked:paragraph(self,surface,'A dificuldade %s foi liberada!'%info.unlocked.label,15,cw/2,y+10,cw-40,u)
        self.draw_buttons(surface)
    ns['CompleteScreen'].build_buttons=complete_buttons
    ns['CompleteScreen'].draw=complete_draw
