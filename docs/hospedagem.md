# Hospedagem grátis (Render + Neon)

O MKpause fica num serviço só no **Render**: o Django responde a API em `/api/`
e entrega a interface web compilada nas outras rotas. O banco PostgreSQL fica no
**Neon**, que no plano grátis não expira (o PostgreSQL grátis do Render é apagado
depois de 30 dias).

Limites do plano grátis do Render: o site "dorme" após uns 15 minutos sem uso e
o primeiro acesso depois disso demora cerca de 1 minuto.

> Netlify, Vercel e Cloudflare Pages hospedam só a interface: não rodam Django
> nem PostgreSQL. Por isso o Render.

## 1. Banco no Neon

1. Crie uma conta em https://neon.tech (dá para entrar com o GitHub).
2. Crie um projeto (região mais próxima: São Paulo, se houver).
3. Em **Connection string**, copie a URL. Ela começa com `postgresql://` e
   termina com `?sslmode=require`.

As tabelas são criadas sozinhas no primeiro deploy (`python manage.py aplicar_esquema`,
que roda a V1 de `database/migrations/`).

## 2. Site no Render

1. Crie uma conta em https://render.com entrando com o GitHub.
2. **New → Blueprint** e escolha o repositório `liz-whs/MKpause`, branch `backend`.
   (Quem não for dono do repositório precisa que a dona dê acesso, ou use um fork.)
3. O Render lê o `render.yaml` e pede duas variáveis:
   - `DATABASE_URL`: a URL do Neon do passo 1;
   - `DEMO_SENHA`: a senha das contas de demonstração (pelo menos 8 caracteres).
4. Clique em **Apply**. O primeiro build leva alguns minutos.
5. O endereço fica algo como `https://mkpause.onrender.com`.

## Contas de demonstração

Criadas no deploy pelo `python manage.py criar_demo`, todas com a `DEMO_SENHA`:

| Perfil | E-mail |
|---|---|
| Administração | `admin.demo@mkpause.dev` |
| Estudante | `ana.demo@mkpause.dev` |
| Professor | `professor.demo@mkpause.dev` |
| Psicóloga escolar | `psicologo.demo@mkpause.dev` |
| Psicólogo clínico | `clinico.demo@mkpause.dev` |

## Atualizar o site

Cada push na branch escolhida faz um deploy novo automaticamente.
