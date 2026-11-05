FROM node:22-bookworm-slim AS interface
WORKDIR /web
COPY src/web/package*.json ./
RUN npm ci
COPY src/web/ ./
RUN npm run build

FROM python:3.13-slim-bookworm
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 DJANGO_API=http://127.0.0.1:8000
RUN apt-get update && apt-get install -y --no-install-recommends nginx php8.2-fpm php8.2-cli php8.2-pgsql ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home app
WORKDIR /app
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY --chown=app:app backend/ /app/backend/
COPY --chown=app:app database/migrations/ /app/database/migrations/
COPY --chown=app:app src/indicadores/ /app/src/indicadores/
COPY --chown=app:app deploy/ /app/deploy/
COPY --from=interface --chown=app:app /web/dist/ /app/src/web/dist/
USER app
EXPOSE 10000
CMD ["python", "/app/deploy/start.py"]
