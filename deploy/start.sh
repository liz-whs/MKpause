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

# Benchmark opcional com dados fictícios, antes de inicializar o Laravel e o banco.
if [ "${MKPAUSE_BENCHMARK_SENHA:-false}" = "true" ]; then
    if ! php <<'PHP'
<?php
require 'app/Mkpause/SenhaPbkdf2.php';

// Hashes fictícios pré-calculados para medir apenas as verificações.
$senha = 'senha-ficticia-para-teste';
$hashPbkdf2 = 'pbkdf2_sha256$1200000$mkpauseBenchmark$RqGOUsY7AmGrmlSjehdDMX9ziKdCxxJ4KiuZQjXhMEg=';
$inicio = hrtime(true);
$conferePbkdf2 = \App\Mkpause\SenhaPbkdf2::conferir($senha, $hashPbkdf2);
$duracao = (hrtime(true) - $inicio) / 1e6;

printf("mkpause.login.benchmark algoritmo=pbkdf2 iteracoes=1200000 verificacao_ms=%.1f confere=%s\n", $duracao, $conferePbkdf2 ? 'sim' : 'nao');

if (!in_array('argon2id', password_algos(), true)) {
    echo "mkpause.login.benchmark algoritmo=argon2id suporte=nao\n";
    exit($conferePbkdf2 ? 0 : 1);
}

$hashArgon2id = '$argon2id$v=19$m=19456,t=2,p=1$bWtwYXVzZUJlbmNobWFyaw$1UID9YTX7BxmkVXMyXAQ8wGVYoPBk8506Jsma1VMc60';
$inicio = hrtime(true);
$confereArgon2id = password_verify($senha, $hashArgon2id);
$duracao = (hrtime(true) - $inicio) / 1e6;

printf("mkpause.login.benchmark algoritmo=argon2id memoria_kib=19456 iteracoes=2 paralelismo=1 verificacao_ms=%.1f confere=%s\n", $duracao, $confereArgon2id ? 'sim' : 'nao');
exit($conferePbkdf2 && $confereArgon2id ? 0 : 1);
PHP
    then
        echo 'mkpause.login.benchmark falhou' >&2
    fi
fi

mkdir -p storage/framework/cache/data storage/framework/views storage/logs bootstrap/cache
php artisan package:discover --ansi
php artisan config:cache
php artisan route:cache
php artisan mkpause:aplicar-esquema
php artisan mkpause:sincronizar-atividades
if [ "${MKPAUSE_DEMO:-false}" = "true" ]; then
    php artisan mkpause:criar-demo
fi

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
