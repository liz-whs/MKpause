"""Inicia Django, PHP-FPM e Nginx; encerra todos se um serviço falhar."""
import os
from pathlib import Path
import signal
import subprocess
import sys
import time


def main():
    raiz = Path(__file__).resolve().parent.parent
    porta = int(os.environ.get('PORT', '10000'))
    if not 1024 <= porta <= 65535:
        raise ValueError('PORT deve ser uma porta entre 1024 e 65535.')
    configuracao = Path('/tmp/mkpause-nginx.conf')
    configuracao.write_text((raiz / 'deploy/nginx.conf').read_text().replace('__PORT__', str(porta)))
    subprocess.run(['nginx', '-t', '-c', str(configuracao)], check=True)
    for comando in ['aplicar_esquema', 'criar_demo']:
        subprocess.run([sys.executable, str(raiz / 'backend/manage.py'), comando], check=True)
    processos = []
    encerrar = False

    def parar(*_):
        nonlocal encerrar
        encerrar = True

    signal.signal(signal.SIGTERM, parar)
    signal.signal(signal.SIGINT, parar)
    codigo = 0
    try:
        comandos = [
            ['php-fpm8.2', '--nodaemonize', '--fpm-config', str(raiz / 'deploy/php-fpm.conf')],
            ['gunicorn', 'mkpause.wsgi', '--chdir', str(raiz / 'backend'), '--bind', '127.0.0.1:8000',
             '--worker-class', 'gthread', '--workers', '1', '--threads', '8'],
            ['nginx', '-c', str(configuracao), '-g', 'daemon off;'],
        ]
        for comando in comandos:
            processos.append(subprocess.Popen(comando))
        while not encerrar:
            if any(p.poll() is not None for p in processos):
                codigo = 1
                break
            time.sleep(.5)
    finally:
        for p in reversed(processos):
            if p.poll() is None:
                p.terminate()
        for p in processos:
            try:
                p.wait(timeout=10)
            except subprocess.TimeoutExpired:
                p.kill()
                p.wait()
    return codigo


if __name__ == '__main__':
    raise SystemExit(main())
