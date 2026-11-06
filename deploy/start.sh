#!/bin/sh
# Inicia o MKpause no container: prepara o banco, sobe PHP-FPM e Nginx.
# Se um dos dois parar, o container termina para a hospedagem reiniciar.
set -e

PORT="${PORT:-10000}"
# O módulo de indicadores confere a sessão chamando /api/auth/eu/ pelo próprio Nginx.
export MKPAUSE_API_URL="${MKPAUSE_API_URL:-http://127.0.0.1:${PORT}}"

sed "s/__PORT__/${PORT}/" /app/deploy/nginx.conf > /tmp/mkpause-nginx.conf
nginx -e stderr -t -c /tmp/mkpause-nginx.conf

cd /app/backend
mkdir -p storage/framework/cache/data storage/framework/views storage/logs bootstrap/cache
php artisan config:cache
php artisan route:cache
php artisan mkpause:aplicar-esquema
php artisan mkpause:criar-demo

php-fpm8.2 --nodaemonize --fpm-config /app/deploy/php-fpm.conf &
FPM=$!
nginx -e stderr -c /tmp/mkpause-nginx.conf -g 'daemon off;' &
NGINX=$!

parar() { kill "$FPM" "$NGINX" 2>/dev/null || true; }
trap parar TERM INT

# Espera o primeiro dos dois terminar e derruba o outro.
while kill -0 "$FPM" 2>/dev/null && kill -0 "$NGINX" 2>/dev/null; do
    sleep 1
done
parar
exit 1
