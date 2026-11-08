# Hospedagem grátis (Render + Neon)

O MKpause roda num serviço Docker no **Render**: Nginx entrega a interface web compilada,
manda `/api/` para o backend **Laravel (PHP-FPM)** e `/indicadores/` para o módulo de
indicadores (também PHP). O banco PostgreSQL fica no **Neon**, que no plano grátis não expira.

Limites do plano grátis do Render: o site "dorme" após uns 15 minutos sem uso e o primeiro
acesso depois disso demora cerca de 1 minuto.

## 1. Banco no Neon

1. Crie uma conta em https://neon.tech e um projeto (de preferência na mesma região do Render).
2. Em **Connect**, com **Connection pooling** ligado, copie a URL (`postgresql://...?sslmode=require`).

As tabelas são criadas sozinhas a cada início do serviço (`php artisan mkpause:aplicar-esquema`,
que aplica só as versões V1 a V8 que faltam).

## 2. Site no Render

1. Entre em https://render.com com o GitHub.
2. **New → Blueprint**, repositório `liz-whs/MKpause`, branch desejada e **Blueprint path
   `render.indicadores.yaml`**.
3. Preencha as variáveis pedidas:
   - `DATABASE_URL`: a URL do Neon;
   - `MKPAUSE_SECRET_KEY`: uma chave longa e aleatória;
   - `APP_DEBUG`: `false`;
   - `MKPAUSE_DEMO`: `false` em instalações com dados reais;
   - `PUBLIC_BASE_URL`: o endereço público do serviço (ex.: `https://mkpause.onrender.com`);
   - `INDICADORES_DATABASE_URL`: opcional (URL sem pooler, só para o módulo de indicadores).
4. Clique em **Apply**. O primeiro build leva alguns minutos.

> Se estiver migrando um serviço existente, mantenha o valor da chave secreta ao renomeá-la para `MKPAUSE_SECRET_KEY`; trocar o valor invalida sessões, códigos e convites existentes.

## Contas de demonstração

Bloqueadas por padrão. Somente uma instalação isolada, sem dados reais, deve habilitar `MKPAUSE_DEMO=true` e configurar `DEMO_SENHA`. Nesse caso, o início pode executar `php artisan mkpause:criar-demo`. As contas de demonstração usam a senha configurada e ficam associadas à Escola Modelo:

| Perfil | E-mail |
|---|---|
| Administração | `admin.demo@mkpause.dev` |
| Estudante | `ana.demo@mkpause.dev` |
| Professor | `professor.demo@mkpause.dev` |
| Psicóloga escolar | `psicologo.demo@mkpause.dev` |
| Psicólogo clínico | `clinico.demo@mkpause.dev` |

## Migração de instalações existentes

Antes de publicar, prepare um administrador real e a associação institucional de cada conta. Veja [Segurança e separação por escola](seguranca.md). Contas antigas sem escola definida ficam sem acesso aos dados; não existe mais administrador global entre escolas. Códigos antigos sem instituição devem ser substituídos.

## Atualizar o site

Cada push na branch escolhida faz um deploy novo automaticamente.
