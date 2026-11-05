# Dashboard do psicólogo clínico — entrega V5

## Escopo

Esta entrega cria um **endpoint de leitura**, sem novos campos ou tabelas. Os resultados são calculados a partir de `sessao`, `registro_humor` e `atividade`. O frontend React desenhará os gráficos.

**Atenção ao versionamento:** a migração SQL V4 existente trata de convites e e-mails. "V5 do dashboard" é o nome desta entrega funcional, **não** uma nova migração SQL.

## Endpoint

```http
GET /api/estudantes/{id_estudante}/dashboard/?dias=14
```

- Login por sessão obrigatório.
- Acesso exclusivo ao perfil `psicologo_clinico`, com **vínculo ativo** com o estudante. A autorização é conferida no backend em todas as requisições, por `pode(usuario, "ver_historico", estudante)`.
- `dias` é opcional. Valores aceitos: `7`, `14`, `30`, `90`; padrão `14`. O intervalo inclui hoje, no fuso horário configurado no Django.
- Sem acesso: HTTP 403; sem login: HTTP 401; ID inexistente: HTTP 404; filtro inválido: HTTP 400.
- O backend retorna somente sessões **CONCLUIDAS com PRE e POS válidos (1–5)**, ordenadas do registro mais antigo ao mais recente no período.
- Nenhum resultado: contagens `0`, lista de evolução vazia e percentual `null`.

### Exemplo ilustrativo de resposta

```json
{
  "estudante": { "id_estudante": 12, "nome": "Estudante Exemplo" },
  "periodo": { "dias": 14, "inicio": "2026-10-22", "fim": "2026-11-04" },
  "resumo": {
    "sessoes_concluidas": 2,
    "humor_aumentou": 1,
    "humor_manteve": 1,
    "humor_diminuiu": 0,
    "percentual_aumento": 50.0
  },
  "evolucao": [
    { "id_sessao": 21, "data": "2026-11-02", "iniciada_em": "2026-11-02T14:00:00+00:00", "humor_antes": 2, "humor_depois": 4 },
    { "id_sessao": 22, "data": "2026-11-03", "iniciada_em": "2026-11-03T14:00:00+00:00", "humor_antes": 3, "humor_depois": 3 }
  ],
  "distribuicao_humor": [
    { "estado": 1, "antes": 0, "depois": 0 },
    { "estado": 2, "antes": 1, "depois": 0 },
    { "estado": 3, "antes": 1, "depois": 1 },
    { "estado": 4, "antes": 0, "depois": 1 },
    { "estado": 5, "antes": 0, "depois": 0 }
  ],
  "atividades": [
    { "tipo": "RESPIRACAO", "quantidade": 2 },
    { "tipo": "JOGO", "quantidade": 0 },
    { "tipo": "VIDEO", "quantidade": 0 }
  ],
  "aviso": "Indicadores descritivos de autorrelato; não constituem diagnóstico."
}
```

### Significado dos indicadores

- **Humor:** escala ordinal 1–5 já usada no banco, em que valores maiores representam um registro mais favorável, conforme a regra atual.
- **Humor aumentou/manteve/diminuiu:** comparação **numérica dentro da mesma sessão**, não uma conclusão clínica.
- **Percentual de aumento:** `humor_aumentou / sessoes_concluidas * 100`, com uma casa decimal. Sem sessões, é `null` (não `0%`).
- **Distribuição:** quantidade de registros de cada valor 1–5 antes e depois.
- **Atividades:** número de sessões por tipo cadastrado no banco. Não confundir com nomes específicos de jogos: dois jogos do tipo `JOGO` entram no mesmo grupo.
- **Evolução:** um ponto por sessão, mesmo que ocorram várias no mesmo dia; não fazer média automática entre sessões sem decisão explícita da equipe.

### Integração com o frontend existente

Arquivos atuais:
- `src/web/src/features/clinical/Clinico.tsx`: a página `ClinicoEstudante` possui cartões de resumo, histórico e observações. Inserir a seção de gráficos nessa mesma página, abaixo dos indicadores, mantendo histórico e ficha.
- `src/web/src/data/servidor.ts`: adicionar a tipagem e a chamada HTTP usando `chamar('GET', ...)`, que já envia o cookie de sessão.
- `src/web/src/data/api.ts`: opcionalmente expor cache/estado dos indicadores; evitar requisições duplicadas e permitir seleção de período.

Exemplo de chamada:

```ts
const dados = await chamar<DashboardClinico>('GET', `estudantes/${idNumerico}/dashboard/?dias=14`);
```

A interface deve mostrar estado de carregamento, ausência de dados e erros (inclusive perda de autorização após desativação de vínculo); não deve preencher dados reais com mocks caso o servidor falhe. Os mocks existentes continuam apropriados para testes locais.

**Não misturar métricas:** o texto atual de interface "terminaram mais leves" usa `ehLeve(s.depois)`, enquanto este endpoint usa `humor_depois > humor_antes`. Se a equipe quiser exibir os dois, usar rótulos distintos.

## Testes

```powershell
cd backend
python manage.py test acompanhamento.test_dashboard
python manage.py test contas sessoes alertas atividades acompanhamento nucleo
```

Os testes automatizados em `acompanhamento/test_dashboard.py` cobrem resultado vazio, contas e distribuições, períodos, perfil, vínculo e sessão incompleta/cancelada. A execução da suíte deve ser confirmada no ambiente de desenvolvimento ou CI antes do merge.

## Limites da entrega

Esta V5 não cria páginas React nem altera migrations. Não fornece interpretação clínica, pontuação de risco, diagnóstico, eficácia terapêutica ou previsões. A visualização só pode ser disponibilizada depois da validação de acesso e preservando a confidencialidade dos registros.


## Entrega e aprovação

**Branch:** `feat/dashboard-clinico-v5`.

### Arquivos do Pull Request

| Arquivo | Papel |
|---|---|
| `backend/acompanhamento/dashboard.py` | Consulta sessões concluídas e agrega indicadores por estudante, com filtro de datas e verificação de vínculo. |
| `backend/acompanhamento/test_dashboard.py` | Testa os totais, ausência de dados, filtro, permissões e descarte de sessões incompletas/canceladas. |
| `backend/mkpause/urls.py` | Registra a URL HTTP pública do endpoint protegido por autenticação. |
| `docs/dashboard-clinico-v5.md` | Contrato da API, decisões, integração e critérios de validação. |

### Checklist de validação antes do merge

- [ ] Rodar o teste focalizado e a suíte completa no backend; verificar o resultado no CI quando disponível.
- [ ] Conferir o endpoint com sessão de psicólogo clínico e vínculo ativo.
- [ ] Conferir 401 sem autenticação e 403 para professor ou clínico sem vínculo.
- [ ] Conferir períodos 7/14/30/90 dias, inclusive dias com múltiplas sessões.
- [ ] Confirmar que o frontend não denomina `percentual_aumento` como efeito terapêutico.
- [ ] Conferir tratamento de tela vazia, carregamento e erro de acesso no frontend após integração.

**Fora do escopo deste PR:** desenhar gráficos React, armazenar indicadores duplicados, criar tabelas ou gerar diagnóstico clínico.
