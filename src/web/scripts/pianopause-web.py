"""Apresentação web do piano pause; mantém melodias e regras do jogo original."""
import math
from pathlib import Path
import pygame

BG=(246,239,228);SURFACE=(255,250,247);INK=(89,65,49);MUTED=(110,84,66)
LINE=(230,216,198);BOARD=(168,157,177);EDGE=(132,118,143)


def aplicar(g):
    ctx={'size':None,'fonts':{},'buttons':{},'sound':True,'images':{}}
    root=Path(g['__file__']).parent
    from piano_audio import aplicar_audio
    aplicar_audio(g,root)
    def resize(size=None):
        if size is None:
            try:
                import platform
                win=platform.window
                size=(float(win.innerWidth),float(win.innerHeight),float(win.devicePixelRatio or 1))
            except Exception:return
        cw,ch,dpr=size;cw=max(1,round(cw));ch=max(1,round(ch))
        factor=min(max(2,dpr),math.sqrt(5_000_000/(cw*ch)))
        signature=(cw,ch,factor)
        if ctx['size']==signature:return
        old=g['tabuleiro'].height
        wide=cw>=720 and cw/ch>=1.3;side=min(320,max(250,cw*.24)) if wide else cw
        area=pygame.Rect(round(side+16),12,round(cw-side-32),ch-24) if wide else pygame.Rect(12,88,cw-24,max(130,ch-248))
        for note in g['teclas']:note['y']*=area.height/max(1,old)
        g.update(LARGURA=cw,ALTURA=ch,ESCALA=factor,tabuleiro=area,largura_coluna=area.width/4,
                 altura_tecla=round(area.height*90/445),LINHA_TOQUE=area.bottom-round(area.height*105/445))
        g['tela']=pygame.display.set_mode((round(cw*factor),round(ch*factor)))
        g['camada_transicao']=pygame.Surface(g['tela'].get_size());g['camada_transicao'].fill(BG)
        g['particulas'].clear();ctx.update(size=signature,wide=wide,side=side)
        try:
            import platform
            win=platform.window;win.config.user_canvas_managed=1
            style=win.document.createElement('style')
            style.textContent='html,body{margin:0;overflow:hidden}#canvas{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;margin:0!important;image-rendering:auto!important}'
            win.document.head.appendChild(style)
        except Exception:pass
    def rect(r):return pygame.Rect(*(round(v*g['ESCALA']) for v in r))
    def font(size,title=False,bold=False):
        pixels=max(14,round(size*g['ESCALA']));key=(pixels,title,bold)
        if key not in ctx['fonts']:
            name='Fraunces-SemiBold.ttf' if title else 'Lexend-SemiBold.ttf' if bold else 'Lexend-Regular.ttf'
            ctx['fonts'][key]=pygame.font.Font(str(root/'fontes'/name),pixels)
        return ctx['fonts'][key]
    def text(value,x,y,size=16,title=False,color=INK):
        image=font(size,title).render(str(value),True,color)
        g['tela'].blit(image,image.get_rect(midtop=(round(x*g['ESCALA']),round(y*g['ESCALA']))))
    def paragraph(value,x,y,width,size=16):
        line='';lines=[]
        for word in value.split():
            new=(line+' '+word).strip()
            if line and font(size).size(new)[0]>width*g['ESCALA']:lines.append(line);line=word
            else:line=new
        if line:lines.append(line)
        for line in lines:text(line,x,y,size,color=MUTED);y+=size*1.45
        return y
    def button(key,value,r,selected=False):
        r=pygame.Rect(r);ctx['buttons'][key]=r
        mouse=g['para_logica'](pygame.mouse.get_pos());hover=r.collidepoint(mouse)
        color=INK if hover else (204,195,209) if selected else SURFACE
        pygame.draw.rect(g['tela'],color,rect(r),border_radius=round(22*g['ESCALA']))
        pygame.draw.rect(g['tela'],INK,rect(r),width=max(1,round(g['ESCALA'])),border_radius=round(22*g['ESCALA']))
        image=font(15,bold=True).render(value,True,SURFACE if hover else INK)
        g['tela'].blit(image,image.get_rect(center=rect(r).center))
    def mascot(name,x,y,height=50):
        key=(name,round(height*g['ESCALA']))
        if key not in ctx['images']:
            image=pygame.image.load(str(root/('mascote-'+name+'.png'))).convert_alpha()
            ctx['images'][key]=pygame.transform.smoothscale(image,(round(image.get_width()*key[1]/image.get_height()),key[1]))
        image=ctx['images'][key];g['tela'].blit(image,image.get_rect(midtop=(round(x*g['ESCALA']),round(y*g['ESCALA']))))
    def helper(message):
        cw,ch=g['LARGURA'],g['ALTURA'];wide=ctx['wide'];side=ctx['side']
        r=pygame.Rect(16,158,side-32,min(218,max(128,ch-320))) if wide else pygame.Rect(12,ch-144,cw-24,76)
        pygame.draw.rect(g['tela'],SURFACE,rect(r),border_radius=round(20*g['ESCALA']))
        pygame.draw.rect(g['tela'],LINE,rect(r),width=max(1,round(g['ESCALA'])),border_radius=round(20*g['ESCALA']))
        if wide:
            mascot('calmo',r.centerx,r.y+12)
            paragraph(message,r.centerx,r.y+78,r.width-28,16 if ch>=600 else 14)
        else:
            mascot('calmo',r.x+30,r.y+16,38)
            f=font(13);lines=[];line=''
            for word in message.split():
                new=(line+' '+word).strip()
                if line and f.size(new)[0]>(r.width-80)*g['ESCALA']:lines.append(line);line=word
                else:line=new
            lines.append(line);y=r.centery-len(lines)*9
            for line in lines:
                image=f.render(line,True,MUTED);g['tela'].blit(image,image.get_rect(topleft=(round((r.x+66)*g['ESCALA']),round(y*g['ESCALA']))));y+=18
    def board():
        surface=g['tela'];area=g['tabuleiro'];scale=g['ESCALA']
        pygame.draw.rect(surface,BOARD,rect(area),border_radius=round(24*scale))
        previous=surface.get_clip();surface.set_clip(rect(area).inflate(-2,-2))
        for column in range(1,4):
            x=area.x+column*g['largura_coluna']
            pygame.draw.line(surface,(194,184,201),(round(x*scale),round(area.top*scale)),(round(x*scale),round(area.bottom*scale)),max(1,round(scale)))
        for note in g['teclas']:
            x=area.x+note['coluna']*g['largura_coluna']+6;y=area.y+note['y']
            r=(x,y,g['largura_coluna']-12,g['altura_tecla'])
            pygame.draw.rect(surface,g['CORES_NOTAS'][note['coluna']],rect(r),border_radius=round(12*scale))
            pygame.draw.rect(surface,INK,rect(r),width=max(1,round(scale)),border_radius=round(12*scale))
        pygame.draw.line(surface,EDGE,(round(area.left*scale),round(g['LINHA_TOQUE']*scale)),(round(area.right*scale),round(g['LINHA_TOQUE']*scale)),max(2,round(2*scale)))
        g['desenhar_particulas']();surface.set_clip(previous)
        pygame.draw.rect(surface,EDGE,rect(area),width=max(2,round(2*scale)),border_radius=round(24*scale))
    def playing(paused=False):
        resize();ctx['buttons'].clear();g['tela'].fill(BG)
        cw,ch=g['LARGURA'],g['ALTURA'];side=ctx['side'];wide=ctx['wide']
        text('Nível 1',side/2,24 if wide else 12,32 if wide else 26,True)
        text('Notas tocadas: %d'%g['notas_tocadas'],side/2,78 if wide else 52,16,color=MUTED)
        board();helper('Continue quando quiser. A música pode esperar.' if paused else 'Toque nas teclas no seu próprio ritmo. Você pode pausar quando quiser.')
        if paused:
            center=g['tabuleiro'].center;r=pygame.Rect(center[0]-40,center[1]-40,80,80);ctx['buttons']['continue']=r
            layer=pygame.Surface((round(84*g['ESCALA']),round(84*g['ESCALA'])),pygame.SRCALPHA);rad=round(40*g['ESCALA']);c=round(42*g['ESCALA'])
            pygame.draw.circle(layer,(*SURFACE,38),(c,c),rad);pygame.draw.circle(layer,(*SURFACE,130),(c,c),rad,width=max(1,round(g['ESCALA'])))
            pygame.draw.lines(layer,(*SURFACE,230),True,[(c-5*g['ESCALA'],c-9*g['ESCALA']),(c-5*g['ESCALA'],c+9*g['ESCALA']),(c+8*g['ESCALA'],c)],width=max(1,round(2.2*g['ESCALA'])))
            g['tela'].blit(layer,(round((center[0]-42)*g['ESCALA']),round((center[1]-42)*g['ESCALA'])))
        else:
            width=side-32 if wide else (cw-40)/2
            button('pause','Pausar',(16,ch-112 if wide else ch-56,width,44))
            button('settings','Ajustes',(16 if wide else 24+width,ch-60 if wide else ch-56,width,44))
    def settings():
        resize();ctx['buttons'].clear();g['tela'].fill(BG);cw,ch=g['LARGURA'],g['ALTURA']
        text('Ajustes',cw/2,76,28,True);width=min(480,cw-32);x=(cw-width)/2
        text('Ritmo das notas',cw/2,150,17)
        button('slow','Lento',(x,188,(width-12)/2,44),g['ritmo']=='Lento')
        button('moderate','Moderado',(x+(width+12)/2,188,(width-12)/2,44),g['ritmo']=='Moderado')
        text('Som',cw/2,264,17)
        button('sound','Ligado' if ctx['sound'] else 'Desligado',(x,300,width,44))
        button('back','Voltar ao jogo',(16,12,156,44))
    def final():
        resize();ctx['buttons'].clear();g['tela'].fill(BG);cw,ch=g['LARGURA'],g['ALTURA']
        text('Muito bem!',cw/2,76,28,True);mascot('feliz',cw/2,135,80)
        paragraph('Você dedicou um momento a si.',cw/2,244,cw-32,17)
        button('restart','Jogar novamente',((cw-min(360,cw-32))/2,ch-68,min(360,cw-32),48))
    def click(x,y):
        for key,r in list(ctx['buttons'].items()):
            if not r.collidepoint(x,y):continue
            if key=='pause':g['mudar_estado']('pausado')
            elif key in ('continue','back'):g['mudar_estado']('jogando')
            elif key=='settings':g['mudar_estado']('ajustes')
            elif key=='slow':g['ritmo']='Lento'
            elif key=='moderate':g['ritmo']='Moderado'
            elif key=='sound':
                ctx['sound']=not ctx['sound']
                for sound in g['sons']:sound.set_volume(g['VOLUME_FIXO'] if ctx['sound'] else 0)
            elif key=='restart':g['iniciar_jogo']()
            return
        if g['estado']=='jogando':g['tocar_tecla'](x,y)
    g.update(_piano_web_resize=resize,desenhar_jogo=playing,desenhar_pausa=lambda:playing(True),desenhar_ajustes=settings,desenhar_final=final,clique=click)
