# Hospedagem do módulo PHP de indicadores

O módulo de indicadores roda no mesmo container do backend, descrito em
[hospedagem.md](./hospedagem.md):

- Nginx atende a porta pública definida por `PORT`.
- `/api/` vai para o backend Laravel e `/indicadores/` para o módulo de indicadores, ambos no PHP-FPM.
- As demais rotas entregam a interface compilada.
- O módulo confirma a sessão chamando `/api/auth/eu/` no próprio serviço (`DJANGO_API`, definido pelo `deploy/start.sh`) e usa a conexão PostgreSQL só para leitura.
- Pacotes `.tar.gz` dos jogos são servidos sem `Content-Encoding`, pois o pygbag os descompacta no navegador.
- O `deploy/start.sh` aplica o esquema e cria as contas demo antes de iniciar PHP-FPM e Nginx. Se um deles parar, o container termina para a hospedagem reiniciar.

Para uma conta exclusiva de leitura, configure `INDICADORES_DATABASE_URL`; caso contrário, a conexão usa a configuração comum, com transações em modo somente leitura.

Teste após hospedar: login administrativo, painel agregado, recusa para outros perfis, `GET /indicadores/api/saude`, jogos, vídeo e fluxo de convite. Dados insuficientes no painel são esperados quando o banco tem menos de cinco estudantes participantes.
