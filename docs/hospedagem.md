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
que aplica só as versões V1 a V4 que faltam).

## 2. Site no Render

1. Entre em https://render.com com o GitHub.
2. **New → Blueprint**, repositório `liz-whs/MKpause`, branch desejada e **Blueprint path
   `render.indicadores.yaml`**.
3. Preencha as variáveis pedidas:
   - `DATABASE_URL`: a URL do Neon;
   - `DJANGO_SECRET_KEY`: uma chave longa e aleatória (se já existia um serviço, use a mesma, para manter sessões, códigos e convites válidos);
   - `DEMO_SENHA`: senha das contas de demonstração (pelo menos 8 caracteres);
   - `PUBLIC_BASE_URL`: o endereço público do serviço (ex.: `https://mkpause.onrender.com`);
   - `INDICADORES_DATABASE_URL`: opcional (URL sem pooler, só para o módulo de indicadores).
4. Clique em **Apply**. O primeiro build leva alguns minutos.

> Os nomes `DJANGO_*` vêm do backend anterior e foram mantidos para não mudar o Render.

## Contas de demonstração

Criadas a cada início pelo `php artisan mkpause:criar-demo` (contas existentes não mudam), todas
com a `DEMO_SENHA`:

| Perfil | E-mail |
|---|---|
| Administração | `admin.demo@mkpause.dev` |
| Estudante | `ana.demo@mkpause.dev` |
| Professor | `professor.demo@mkpause.dev` |
| Psicóloga escolar | `psicologo.demo@mkpause.dev` |
| Psicólogo clínico | `clinico.demo@mkpause.dev` |

## Atualizar o site

Cada push na branch escolhida faz um deploy novo automaticamente.
