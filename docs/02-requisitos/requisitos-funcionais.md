**Português** · [English](./requisitos-funcionais.en.md)

# Requisitos Funcionais

Os requisitos funcionais descrevem as funcionalidades que o **MKpause** deve disponibilizar aos diferentes usuários do sistema.

Os requisitos estão organizados de acordo com o perfil responsável pela interação com cada funcionalidade.

---

## Estudante

### RF01 — Realizar login

**Descrição:**
O sistema deve permitir que o estudante realize login utilizando suas credenciais cadastradas.

**Ator:** Estudante

---

### RF02 — Acessar atividades e jogos

**Descrição:**
O sistema deve permitir que o estudante acesse atividades e jogos disponibilizados para auxiliar no processo de autorregulação.

**Ator:** Estudante

---

### RF03 — Acessar vídeos

**Descrição:**
O sistema deve permitir que o estudante visualize vídeos disponibilizados como recursos de apoio à autorregulação.

**Ator:** Estudante

---

### RF04 — Registrar humor inicial

**Descrição:**
O sistema deve permitir que o estudante registre seu estado emocional antes de realizar uma atividade de autorregulação.

**Ator:** Estudante

---

### RF05 — Registrar sessão de autorregulação

**Descrição:**
O sistema deve registrar as informações relacionadas à sessão de autorregulação realizada pelo estudante.

**Ator:** Estudante

---

### RF06 — Registrar humor final

**Descrição:**
O sistema deve permitir que o estudante registre seu estado emocional após a realização da atividade de autorregulação.

**Ator:** Estudante

---

### RF07 — Registrar observações da sessão

**Descrição:**
O sistema deve permitir o registro de informações ou observações relacionadas à experiência do estudante durante a sessão.

**Ator:** Estudante

---

### RF08 — Solicitar auxílio

**Descrição:**
O sistema deve permitir que o estudante solicite auxílio por meio da emissão de um alerta quando necessitar de acompanhamento.

**Ator:** Estudante

**Relacionamentos:**
O alerta poderá ser encaminhado aos profissionais responsáveis pelo acompanhamento do estudante de acordo com os vínculos cadastrados no sistema.

---

## Psicólogo Clínico

### RF10 — Realizar login

**Descrição:**
O sistema deve permitir que o psicólogo clínico realize login utilizando suas credenciais cadastradas.

**Ator:** Psicólogo Clínico

---

### RF11 — Consultar estudantes acompanhados

**Descrição:**
O sistema deve permitir que o psicólogo clínico consulte os estudantes vinculados ao seu acompanhamento.

**Ator:** Psicólogo Clínico

---

### RF12 — Consultar histórico do estudante

**Descrição:**
O sistema deve permitir que o psicólogo clínico consulte o histórico de sessões dos estudantes vinculados ao seu acompanhamento.

**Ator:** Psicólogo Clínico

---

### RF13 — Consultar registros de humor

**Descrição:**
O sistema deve permitir que o psicólogo clínico consulte os registros de humor relacionados às sessões dos estudantes acompanhados.

**Ator:** Psicólogo Clínico

---

### RF14 — Consultar observações

**Descrição:**
O sistema deve permitir que o psicólogo clínico consulte observações relacionadas aos estudantes sob seu acompanhamento, respeitando suas permissões de acesso.

**Ator:** Psicólogo Clínico

---

### RF16 — Consultar ficha de acompanhamento

**Descrição:**
O sistema deve permitir que o psicólogo clínico consulte a ficha de acompanhamento dos estudantes vinculados a ele.

**Ator:** Psicólogo Clínico

---

### RF17 — Registrar informações de acompanhamento

**Descrição:**
O sistema deve permitir que o psicólogo clínico registre informações relacionadas ao acompanhamento do estudante dentro das permissões estabelecidas para seu perfil.

**Ator:** Psicólogo Clínico

---

### RF18 — Consultar avisos

**Descrição:**
O sistema deve permitir que o psicólogo clínico consulte avisos disponibilizados na plataforma.

**Ator:** Psicólogo Clínico

---

## Profissionais Escolares

Os requisitos desta seção contemplam funcionalidades disponibilizadas aos profissionais responsáveis pelo acompanhamento do estudante no ambiente escolar, considerando as permissões específicas de **Professor** e **Psicólogo Escolar**.

---

### RF19 — Realizar login

**Descrição:**
O sistema deve permitir que professores e psicólogos escolares realizem login utilizando suas credenciais cadastradas.

**Atores:** Professor e Psicólogo Escolar

---

### RF20 — Consultar estudantes vinculados

**Descrição:**
O sistema deve permitir que o professor e o psicólogo escolar consultem os estudantes vinculados a eles.

**Atores:** Professor e Psicólogo Escolar

> A associação dos dois atores ao mesmo requisito não significa que ambos precisem executar a ação simultaneamente. Cada profissional pode utilizar a funcionalidade de acordo com seu vínculo e suas permissões.

---

### RF21 — Receber alertas

**Descrição:**
O sistema deve permitir que os profissionais escolares recebam alertas relacionados aos estudantes vinculados a eles.

**Atores:** Professor e Psicólogo Escolar

---

### RF22 — Consultar alertas

**Descrição:**
O sistema deve permitir que professores e psicólogos escolares consultem os alertas recebidos relacionados aos estudantes acompanhados.

**Atores:** Professor e Psicólogo Escolar

---

### RF23 — Registrar observações

**Descrição:**
O sistema deve permitir que professores e psicólogos escolares registrem observações relacionadas aos estudantes vinculados.

**Atores:** Professor e Psicólogo Escolar

---

### RF24 — Consultar informações autorizadas

**Descrição:**
O sistema deve permitir que professores e psicólogos escolares consultem informações dos estudantes de acordo com as permissões estabelecidas para cada perfil.

**Atores:** Professor e Psicólogo Escolar

---

### RF25 — Consultar avisos

**Descrição:**
O sistema deve permitir que professores e psicólogos escolares consultem avisos disponibilizados na plataforma.

**Atores:** Professor e Psicólogo Escolar

---

## Administrador

### RF26 — Realizar login

**Descrição:**
O sistema deve permitir que o administrador realize login utilizando suas credenciais cadastradas.

**Ator:** Administrador

---

### RF27 — Gerenciar estudantes

**Descrição:**
O sistema deve permitir que o administrador cadastre, consulte, atualize e remova estudantes.

**Ator:** Administrador

---

### RF28 — Gerenciar professores

**Descrição:**
O sistema deve permitir que o administrador cadastre, consulte, atualize e remova professores.

**Ator:** Administrador

---

### RF29 — Gerenciar psicólogos escolares

**Descrição:**
O sistema deve permitir que o administrador cadastre, consulte, atualize e remova psicólogos escolares.

**Ator:** Administrador

---

### RF30 — Gerenciar psicólogos clínicos

**Descrição:**
O sistema deve permitir que o administrador cadastre, consulte, atualize e remova psicólogos clínicos.

**Ator:** Administrador

---

### RF31 — Gerenciar fichas de acompanhamento

**Descrição:**
O sistema deve permitir que o administrador cadastre, consulte, atualize e gerencie fichas de acompanhamento relacionadas aos estudantes.

**Ator:** Administrador

---

### RF32 — Gerenciar vínculos entre estudantes e professores

**Descrição:**
O sistema deve permitir que o administrador estabeleça e gerencie os vínculos entre estudantes e professores.

**Ator:** Administrador

---

### RF33 — Gerenciar vínculos entre estudantes e psicólogos

**Descrição:**
O sistema deve permitir que o administrador estabeleça e gerencie os vínculos entre estudantes e psicólogos escolares ou clínicos.

**Ator:** Administrador

---

### RF35 — Gerenciar conteúdos de autorregulação

**Descrição:**
O sistema deve permitir o gerenciamento dos conteúdos disponibilizados aos estudantes durante as sessões de autorregulação, incluindo atividades, jogos, vídeos e demais recursos previstos pela plataforma.

**Ator:** Administrador

---

## Resumo dos Requisitos

| Intervalo | Perfil | Quantidade |
|---|---|---:|
| RF01–RF08 | Estudante | 8 |
| RF10–RF14, RF16–RF18 | Psicólogo Clínico | 8 |
| RF19–RF25 | Professor / Psicólogo Escolar | 7 |
| RF26–RF33, RF35 | Administrador | 9 |
| **Total** | | **32** |

---

## Relação com outros artefatos

Estes requisitos devem permanecer consistentes com os demais documentos do projeto:

- [Requisitos de Dados](./requisitos-de-dados.md)
- [Regras de Negócio](./regras-de-negocio.md)
- [Atores](../03-casos-de-uso/atores.md)
- [Casos de Uso](../03-casos-de-uso/casos-de-uso.md)
- [Modelo Conceitual](../04-modelagem-de-dados/modelo-conceitual.md)
- [Modelo Lógico](../04-modelagem-de-dados/modelo-logico.md)

Alterações realizadas nos requisitos funcionais devem ser analisadas nos demais artefatos para garantir a rastreabilidade e a consistência da documentação.
