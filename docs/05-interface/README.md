# Interface — MKpause

Esta seção reúne a documentação relacionada à **interface e à experiência de uso do MKpause**, incluindo wireframes, protótipos e decisões de interface desenvolvidas durante o projeto.

As interfaces devem refletir os requisitos, casos de uso e regras de negócio definidos para o sistema.

---

## 📌 Estrutura

```text
05-interface/
├── README.md
├── wireframes/
└── prototipos/
```

### Wireframes

O diretório [`wireframes/`](./wireframes/) é destinado às representações estruturais das telas do MKpause.

Os wireframes são utilizados para definir aspectos como:

- organização das informações;
- hierarquia dos elementos;
- navegação;
- posicionamento de componentes;
- fluxos entre telas;
- ações disponíveis para cada perfil.

Nesta etapa, o foco principal está na **estrutura e no funcionamento da interface**, e não necessariamente em sua aparência final.

---

### Protótipos

O diretório [`prototipos/`](./prototipos/) reúne as versões visuais das interfaces desenvolvidas para o MKpause.

Os protótipos podem representar aspectos como:

- identidade visual;
- cores;
- tipografia;
- componentes;
- estados das telas;
- navegação;
- feedback visual;
- experiência de utilização.

---

# Perfis da Interface

Como o MKpause possui diferentes tipos de usuários, a interface deve considerar as necessidades e permissões específicas de cada perfil.

Entre os principais perfis estão:

- Estudante;
- Professor;
- Psicólogo Escolar;
- Psicólogo Clínico;
- Administrador.

As funcionalidades apresentadas em cada interface devem respeitar as permissões definidas para cada usuário.

---

# Fluxo do Estudante

Um dos principais fluxos da interface corresponde à realização de uma sessão de autorregulação.

De forma simplificada:

```text
Login
  ↓
Área do Estudante
  ↓
Iniciar Sessão
  ↓
Registrar Humor Inicial
  ↓
Realizar Atividade
  ↓
Registrar Humor Final
  ↓
Finalizar Sessão
  ↓
Histórico
```

Dependendo do estado identificado e das regras de negócio, o fluxo também pode envolver a emissão de um alerta.

---

# Interface dos Profissionais

Professor, Psicólogo Escolar e Psicólogo Clínico possuem interfaces voltadas principalmente ao acompanhamento dos estudantes aos quais possuem acesso.

Entre as funcionalidades previstas estão:

- consulta de estudantes;
- consulta de informações autorizadas;
- visualização de alertas;
- acompanhamento de registros;
- registro de observações, quando permitido;
- consulta de avisos.

As funcionalidades específicas podem variar de acordo com o perfil profissional.

---

# Interface Administrativa

A área administrativa deve fornecer recursos para gerenciamento da plataforma, incluindo:

- usuários;
- estudantes;
- profissionais;
- vínculos;
- fichas de acompanhamento;
- conteúdos;
- demais informações administrativas necessárias.

---

# Princípios de Interface

A interface do MKpause deve buscar:

- clareza;
- simplicidade;
- consistência;
- facilidade de navegação;
- acessibilidade;
- feedback adequado às ações;
- redução de passos desnecessários;
- linguagem adequada ao público;
- diferenciação clara entre ações e informações.

Como o sistema envolve informações sensíveis e situações de acompanhamento, a interface também deve evitar exposição desnecessária de dados.

---

# Responsividade

As interfaces devem ser planejadas considerando diferentes tamanhos de tela sempre que isso estiver dentro do escopo da implementação.

A organização das informações deve permanecer compreensível e utilizável nos dispositivos suportados pelo projeto.

---

# Acessibilidade

As decisões de interface devem considerar os requisitos de acessibilidade definidos para o MKpause.

Entre os pontos importantes estão:

- contraste adequado;
- textos legíveis;
- hierarquia visual clara;
- identificação compreensível dos controles;
- navegação consistente;
- não depender exclusivamente de cores para transmitir informações;
- feedback compreensível ao usuário.

---

# Validação

Os wireframes e protótipos devem ser validados pela equipe antes de serem considerados versões definitivas da documentação.

Durante a validação, devem ser observados principalmente:

- correspondência com os requisitos;
- consistência com os casos de uso;
- clareza dos fluxos;
- funcionalidades disponíveis para cada perfil;
- facilidade de utilização;
- consistência entre as telas.

---

# Status

> 🚧 **Em validação**

Os wireframes e protótipos do MKpause estão sujeitos a revisão pela equipe.

Após a validação, os arquivos aprovados devem ser adicionados aos respectivos diretórios desta seção.

---

## Documentos relacionados

- [Requisitos](../02-requisitos/)
- [Casos de Uso](../03-casos-de-uso/)
- [Modelagem de Dados](../04-modelagem-de-dados/)