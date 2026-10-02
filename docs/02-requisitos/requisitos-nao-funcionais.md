# Requisitos Não Funcionais

Os requisitos não funcionais definem características de qualidade, restrições e condições que o **MKpause** deve atender durante sua utilização.

Diferentemente dos requisitos funcionais, que descrevem o que o sistema faz, os requisitos não funcionais estabelecem **como o sistema deve se comportar** em aspectos como segurança, privacidade, usabilidade, acessibilidade, desempenho e confiabilidade.

---

# 🔐 Segurança

## RNF01 — Autenticação

O sistema deve exigir autenticação para acesso às funcionalidades e informações restritas da plataforma.

---

## RNF02 — Controle de acesso

O sistema deve controlar o acesso às funcionalidades e informações de acordo com o perfil do usuário autenticado.

---

## RNF03 — Controle por vínculo

O sistema deve considerar os vínculos existentes entre estudantes e profissionais antes de disponibilizar informações de acompanhamento.

---

## RNF04 — Proteção das credenciais

As senhas dos usuários não devem ser armazenadas em texto puro.

Devem ser utilizados mecanismos seguros para armazenamento e validação das credenciais.

---

## RNF05 — Proteção contra acesso não autorizado

O sistema deve impedir que usuários acessem informações ou funcionalidades para as quais não possuem autorização.

---

## RNF06 — Encerramento de sessão

O sistema deve permitir que o usuário encerre sua sessão de autenticação de forma segura.

---

# 🔒 Privacidade

## RNF07 — Proteção dos dados dos estudantes

As informações pessoais e de acompanhamento dos estudantes devem possuir acesso restrito aos usuários autorizados.

---

## RNF08 — Minimização de acesso

Cada perfil deve visualizar somente as informações necessárias para executar suas respectivas funções no sistema.

---

## RNF09 — Privacidade dos registros

Registros de humor, sessões, alertas, observações e fichas de acompanhamento não devem ser disponibilizados publicamente.

---

## RNF10 — Identificação do usuário responsável

Registros que dependam da atuação de um profissional devem manter informações suficientes para identificar o usuário responsável pela ação.

---

# ♿ Acessibilidade

## RNF11 — Interface acessível

A interface deve ser desenvolvida considerando princípios de acessibilidade digital.

---

## RNF12 — Contraste

Os elementos visuais devem possuir contraste suficiente para permitir a leitura e identificação dos componentes da interface.

---

## RNF13 — Navegação compreensível

A navegação deve apresentar textos, botões e ações de forma clara e compreensível para os usuários.

---

## RNF14 — Dependência de cor

Informações importantes não devem ser comunicadas exclusivamente por meio de cores.

Ícones, textos ou outros indicadores devem ser utilizados quando necessários para complementar a informação visual.

---

## RNF15 — Navegação por teclado

As principais funcionalidades da aplicação web devem ser acessíveis por meio de navegação utilizando teclado.

---

# 🖥️ Usabilidade

## RNF16 — Consistência da interface

Elementos que desempenham funções semelhantes devem possuir comportamento e apresentação consistentes entre as diferentes telas da plataforma.

---

## RNF17 — Feedback das ações

O sistema deve fornecer retorno visual ao usuário após ações relevantes, como:

- salvar informações;
- concluir uma sessão;
- registrar humor;
- emitir um alerta;
- registrar uma observação;
- realizar operações administrativas.

---

## RNF18 — Mensagens de erro

Mensagens de erro devem apresentar informações compreensíveis ao usuário e, quando possível, indicar como corrigir o problema.

---

## RNF19 — Confirmação de ações críticas

Operações que possam causar perda ou remoção de informações devem solicitar confirmação antes de serem concluídas quando aplicável.

---

## RNF20 — Facilidade de uso

Os principais fluxos do estudante, especialmente o início e a realização de uma sessão de autorregulação, devem evitar etapas desnecessárias e apresentar instruções claras.

---

# 📱 Compatibilidade

## RNF21 — Interface responsiva

A interface web deve adaptar sua apresentação a diferentes tamanhos de tela.

---

## RNF22 — Navegadores modernos

O sistema deve ser compatível com versões atuais dos principais navegadores utilizados pelos usuários.

---

# ⚡ Desempenho

## RNF23 — Tempo de resposta adequado

As operações comuns da plataforma devem apresentar retorno em tempo adequado para não prejudicar a experiência do usuário em condições normais de utilização.

---

## RNF24 — Carregamento de conteúdo

Conteúdos utilizados durante sessões de autorregulação devem ser carregados de maneira que não interrompa desnecessariamente o fluxo da sessão.

---

# 💾 Integridade e Confiabilidade

## RNF25 — Integridade dos dados

O sistema deve manter a consistência das informações armazenadas e de seus relacionamentos.

---

## RNF26 — Persistência dos registros

Após confirmação de uma operação de registro, as informações devem permanecer armazenadas de forma persistente.

---

## RNF27 — Preservação do histórico

Alterações cadastrais não devem comprometer registros históricos necessários para compreender sessões, alertas e acompanhamentos realizados anteriormente.

---

## RNF28 — Tratamento de falhas

Falhas durante operações de gravação não devem resultar em registros parcialmente armazenados que comprometam a integridade dos dados.

---

# 🧩 Manutenibilidade

## RNF29 — Organização do código

O código-fonte deve ser organizado de forma modular, separando responsabilidades sempre que aplicável.

---

## RNF30 — Padronização

O projeto deve manter padrões consistentes de nomenclatura, organização de arquivos e estrutura de código.

---

## RNF31 — Documentação

As principais funcionalidades, regras, estruturas e decisões técnicas do sistema devem possuir documentação atualizada no repositório do projeto.

---

## RNF32 — Versionamento

O código-fonte e a documentação do MKpause devem ser mantidos utilizando sistema de controle de versão.

---

# 📊 Rastreabilidade

## RNF33 — Rastreabilidade dos registros

Registros relevantes ao acompanhamento devem possuir informações que permitam identificar quando foram criados e a qual estudante estão relacionados.

---

## RNF34 — Consistência entre documentação e sistema

Alterações relevantes nas funcionalidades ou regras do sistema devem ser refletidas na documentação correspondente.

---

# Resumo

| Categoria | Requisitos |
|---|---|
| Segurança | RNF01–RNF06 |
| Privacidade | RNF07–RNF10 |
| Acessibilidade | RNF11–RNF15 |
| Usabilidade | RNF16–RNF20 |
| Compatibilidade | RNF21–RNF22 |
| Desempenho | RNF23–RNF24 |
| Integridade e Confiabilidade | RNF25–RNF28 |
| Manutenibilidade | RNF29–RNF32 |
| Rastreabilidade | RNF33–RNF34 |

---

## Observação

Alguns requisitos não funcionais poderão receber métricas e critérios de aceitação mais específicos durante as etapas de projeto, implementação e testes.

Esses critérios devem ser definidos com base nas condições reais de utilização do sistema, evitando a adoção de valores arbitrários que não possam ser posteriormente validados.

---

## Relação com outros documentos

Os requisitos não funcionais devem ser considerados em conjunto com:

- [Requisitos Funcionais](./requisitos-funcionais.md)
- [Requisitos de Dados](./requisitos-de-dados.md)
- [Regras de Negócio](./regras-de-negocio.md)
- [Casos de Uso](../03-casos-de-uso/casos-de-uso.md)

Eles também devem orientar decisões futuras relacionadas à arquitetura, interface, banco de dados, segurança e testes do MKpause.