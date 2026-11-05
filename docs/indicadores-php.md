# Hospedagem do módulo PHP

O serviço Python atual em `render.yaml` permanece disponível. Para executar PHP e Django juntos, foi preparada a opção `render.indicadores.yaml`, com Docker, Nginx, PHP-FPM e Gunicorn. O Render documenta Docker como a opção para linguagens sem runtime nativo, incluindo PHP: [Docker no Render](https://render.com/docs/docker).

## Arquitetura

- Nginx atende a porta pública definida por `PORT`.
- `/indicadores/` é executado pelo PHP-FPM, acessível apenas internamente.
- As demais rotas chegam ao Django/Gunicorn, que também entrega a interface compilada.
- O PHP confirma a sessão no Django por `DJANGO_API=http://127.0.0.1:8000` e usa a conexão PostgreSQL para leitura.
- Pacotes `.tar.gz` dos jogos são servidos sem `Content-Encoding`, pois o pygbag os descompacta no navegador.
- O inicializador aplica o esquema existente e cria as contas demo conforme a configuração, então inicia os três processos. Se um falhar, os outros são encerrados para que a hospedagem detecte a falha.

## Preparar o serviço

Use a opção Docker do Render apontando para `Dockerfile`, ou o Blueprint alternativo `render.indicadores.yaml`. Confira os campos na [referência de Blueprints](https://render.com/docs/blueprint-spec). Esta preparação não publica ou altera o serviço existente automaticamente.

Configure `DATABASE_URL`, `DEMO_SENHA` e `DJANGO_SECRET_KEY` com os valores do ambiente atual. Preserve a chave do Django para manter a validade das sessões e dos links assinados existentes. `PUBLIC_BASE_URL` precisa apontar para o endereço público usado para convites. As configurações de SMTP continuam necessárias para envio real de e-mail.

Para uma conta exclusiva de leitura, configure `INDICADORES_DATABASE_URL`; caso contrário, a conexão usa a configuração comum, mas mantém as transações PHP em modo somente leitura. O `.dockerignore` impede a cópia de `.env`, chaves, bancos locais, ambientes virtuais e caixas de e-mail para a imagem.

Teste após hospedar: login administrativo, painel agregado, recusa para outros perfis, saúde do PHP, jogos, vídeo e fluxo de convite. Dados insuficientes no painel são esperados quando o banco tem menos de cinco estudantes participantes.

## Validação e limites

Foram preparados os arquivos Docker, Nginx, PHP-FPM e inicialização. O ambiente de desenvolvimento desta rodada não tem Docker instalado; a imagem completa ainda precisa ser construída e executada antes do deploy. A integração PHP/Django/PostgreSQL e os testes de interface são verificáveis localmente e foram executados separadamente. Nenhum deploy foi acionado nesta implementação.
