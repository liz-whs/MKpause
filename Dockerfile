# MKpause: interface web (React) + backend (Laravel/PHP) + indicadores (PHP) num serviço só.
# Nginx atende a porta pública; /api/ e /indicadores/ vão para o PHP-FPM; o resto é a
# interface compilada. Ver docs/hospedagem.md.

FROM node:22-bookworm-slim AS interface
WORKDIR /web
COPY src/web/package*.json ./
RUN npm ci
COPY src/web/ ./
RUN npm run build

FROM composer:2 AS dependencias
WORKDIR /backend
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --no-interaction --prefer-dist --ignore-platform-reqs
COPY backend/ ./
RUN composer dump-autoload --no-dev --optimize --classmap-authoritative --no-scripts

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
        nginx php8.2-fpm php8.2-cli php8.2-pgsql php8.2-mbstring php8.2-xml php8.2-curl php8.2-intl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home app
WORKDIR /app
COPY --chown=app:app database/migrations/ /app/database/migrations/
COPY --chown=app:app src/indicadores/ /app/src/indicadores/
COPY --chown=app:app deploy/ /app/deploy/
COPY --from=dependencias --chown=app:app /backend/ /app/backend/
COPY --from=interface --chown=app:app /web/dist/ /app/src/web/dist/
RUN chmod +x /app/deploy/start.sh
USER app
ENV LOG_CHANNEL=stderr CACHE_STORE=file SESSION_DRIVER=database
EXPOSE 10000
CMD ["/app/deploy/start.sh"]
