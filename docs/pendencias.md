# Pendências: documentação × sistema

Levantamento do que a documentação (`docs/02-requisitos/`) pede e ainda falta
no **banco** (`database/`), no **backend** (`backend/`) ou na **interface web**
(`src/web/`). Situação em 01/11/2026, com a interface ligada ao backend.

Legenda: ✅ feito · ⚠️ parcial ou adaptado · ❌ falta

## Resumo

| Requisito | Banco | Backend | Interface | O que falta |
|---|:-:|:-:|:-:|---|
| RF09 Histórico do estudante | ✅ | ✅ | ❌ | Tela de histórico para o estudante |
| RF13 Registros de humor | ⚠️ | ✅ | ⚠️ | Banco guarda humor 1–5; a interface usa 6 emoções |
| RF14/RN18 Observações por estudante | ⚠️ | ⚠️ | ✅ | No banco a observação é presa a um alerta |
| RF15 Clínico recebe alertas | ❌ | ⚠️ | ⚠️ | Banco não aceita o clínico como destinatário |
| RF17 Registro do clínico | ⚠️ | ✅ | ⚠️ | Não há tabela de registros; vai em JSON na ficha |
| RF18/RF25 Avisos da plataforma | ✅ | ✅ | ❌ | Telas para ler e publicar avisos |
| RF28–RF30 Cadastro de profissionais | ✅ | ✅ | ❌ | Formulário de cadastro e edição |
| RF31 Ficha de acompanhamento | ⚠️ | ✅ | ⚠️ | Campos da ficha não existem no banco |
| RF34/RN23–RN25 Responsáveis e convite | ⚠️ | ⚠️ | ⚠️ | Convite não existe; V2 ainda não aplicada |
| RF35 Conteúdos | ✅ | ✅ | ⚠️ | Interface só oculta/exclui; não cadastra nem edita |
| RN13 Destinatários (clínico) | ❌ | ⚠️ | — | Igual ao RF15 |
| RNF06/RNF19 etc. | — | — | ⚠️ | Ver "Outros pontos" |

## Detalhes

### RF09 — Estudante consulta o próprio histórico
- **Backend:** `GET /api/sessoes/` já devolve as sessões do estudante.
- **Interface:** ❌ não há tela. O `api.ts` diz que "o estudante não recebe
  contagem nem histórico de pausas", uma decisão do protótipo que **contraria o RF09**.
  É preciso decidir com o grupo: mudar o requisito ou criar a tela.

### RF13 — Registros de humor
- **Banco:** `registro_humor.estado` é um número de 1 a 5.
- **Interface:** usa 6 emoções (feliz, calmo, ansioso, triste, irritado, cansado).
- **Hoje:** a integração converte emoção → número e guarda a emoção exata no
  texto de `observacoes_sessao`, porque "ansioso" e "irritado" dariam o mesmo número.
- **Falta:** uma migração (V3) com a emoção como coluna própria, ou um acordo de
  escala única entre banco e interface. O critério de nível em `sessoes/regras.py`
  também é provisório.

### RF14 / RN18 — Observação associada ao estudante
- **Banco:** `observacao.id_alerta` é obrigatório; não há `id_estudante`.
  O RN18 pede observação **associada ao estudante**.
- **Hoje:** a interface grava na do alerta mais recente; se o estudante não tem
  alerta, a observação **não é salva** no servidor.
- **Falta:** migração deixando `id_alerta` opcional e adicionando `id_estudante`,
  e ajuste em `alertas/views.py` (ou um endpoint `estudantes/<id>/observacoes/`).

### RF15 / RN13 — Psicólogo clínico recebe alertas
- **Banco:** `ck_destinatario_alerta_tipo` só aceita `PROFESSOR` e `PSICOLOGO_ESCOLAR`.
- **Backend:** o clínico só **consulta** os alertas dos vinculados; não é notificado
  e não pode marcar como lido.
- **Interface:** o "visto" do clínico fica só na tela (some ao recarregar).
- **Falta:** migração incluindo `PSICOLOGO_CLINICO` no CHECK e ajuste em `alertas/regras.py`.

### RF17 / RF31 — Ficha de acompanhamento e registros clínicos
- **Banco:** a ficha tem só `informacoes_acompanhamento` (texto).
  A interface usa responsável, parentesco, contato, início, encaminhamento
  e uma lista de registros do clínico (autor, data, texto).
- **Hoje:** tudo vai em JSON dentro de `informacoes_acompanhamento`.
  Não dá para consultar nem validar esses campos no banco, e dois clínicos
  salvando ao mesmo tempo podem sobrescrever registros.
- **Falta:** colunas próprias na ficha e uma tabela `registro_clinico`
  (id, ficha, autor, criado_em, texto).

### RF18 / RF25 — Avisos da plataforma
- **Banco e backend:** ✅ tabela `aviso` e `GET/POST/PATCH/DELETE /api/avisos/`.
- **Interface:** ❌ nenhuma tela lê ou publica esses avisos. O que a interface chama
  de "Avisos" é o **aviso de saída** do estudante (outra coisa, ver abaixo).
- **Falta:** lista de avisos para cada perfil e tela de publicação no admin.

### RF28–RF30 — Cadastro de professores e psicólogos
- **Backend:** ✅ `admin/professores/`, `admin/psicologos-escolares/`, `admin/psicologos-clinicos/`.
- **Interface:** ⚠️ lista e desativa, mas **não cadastra nem edita**
  (no `src/web/README.md` está como "tela sem desenho no protótipo").
- **Falta:** formulário: nome, e-mail, senha inicial; professor: cargo/disciplina;
  psicólogos: registro (CRP) e UF.

### RF34 / RN23–RN25 — Responsáveis e convite
- **Banco:** a V2 (`responsavel` como contato sem login) está em
  `database/migrations/` mas ainda não foi aplicada no banco local; o
  backend ainda segue a V1 (cria um `usuario` sem senha para o responsável).
- **Backend:** ✅ cadastro e vínculo; ❌ convite (RN24) e confirmação do vínculo (RN25).
- **Interface:** o responsável é só texto dentro da ficha; não usa
  `admin/responsaveis/` nem `admin/vinculos/responsaveis/`. "Reenviar convite"
  não faz nada no servidor.
- **Falta:** aplicar a V2 e ajustar `contas/models.py`; definir e implementar o convite.

### RF35 — Conteúdos de autorregulação
- **Backend:** ✅ cria, edita e oculta atividades.
- **Interface:** ⚠️ só oculta/mostra e "exclui" (no servidor vira indisponível).
  Não cadastra conteúdo novo nem edita nome/duração.
- **Interface:** só conhece 3 atividades fixas (respiração, PianoPause, vídeo);
  um conteúdo novo cadastrado no backend não aparece.
- **Admin:** o contador de usos fica sempre em 0 (o admin não carrega as sessões).

## Coisas da interface que a documentação não prevê

Precisam entrar na documentação ou sair da interface:

- **Aviso de saída da sala** (nível 2: "Preciso sair da sala", destino, "Voltei").
  Não existe nos requisitos nem no banco. Hoje é gravado como **alerta de nível 2**
  com o destino na descrição, e o "Voltei" muda o status para `CANCELADO`
  (o ideal seria um status próprio ou uma tabela).
- **Cuidados do dia / sequência de dias** (água, alongar...): só no navegador
  (`sessionStorage`), some ao sair. Não está nos requisitos nem no banco.
- **Apelido e preferência de notificações** do estudante: só no navegador.
- **Matrícula do estudante:** aparece na interface, mas não existe no banco
  (hoje mostra o id).
- **Perfil dos profissionais** (commit novo da `interface-web`): conferir se os
  dados mostrados existem no backend.

## Outros pontos

- **Login com Google** (botão na tela "Entrar"): não existe no backend; hoje
  leva ao primeiro acesso sem autenticar.
- **"Esqueci minha senha"** e **troca de senha** pelo próprio usuário: não existem
  (nem rota no backend). Estudantes cadastrados pela interface recebem a senha
  provisória `mkpause-<matrícula>`.
- **Quem acompanha você** (estudante): sempre vazio, porque o backend não tem rota
  para o estudante ver os profissionais vinculados.
- **RNF17/RNF18 (feedback e erros):** os erros do servidor aparecem num `alert()`
  do navegador; falta um aviso no padrão visual da interface.
- **RN37 (emergências):** o backend devolve a mensagem com 192/188 ao emitir alerta;
  conferir se a interface mostra esse texto em todas as telas de nível 3.
- **Testes do backend:** `python manage.py test` encontra o `testar_api.py`, que pede
  entrada no terminal e quebra a execução. Renomear ou mover o script.
