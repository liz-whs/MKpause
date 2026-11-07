# RF17, RNF01, RNF04 e RNF17

Implementação local em 06/11/2026, após aprovação da análise.

## RF17 — Informações de acompanhamento

O formulário clínico só confirma e limpa o texto depois da resposta da API. Se houver erro, mantém o texto para nova tentativa. Sem ficha, informa que a administração precisa criá-la.

`POST /api/estudantes/{id}/registros/` recebe `texto` e `chave` (identificador da tentativa). Exige psicólogo clínico com vínculo ativo e ficha ativa. Autor, data e identificador do registro são definidos pelo servidor. A mesma tentativa não cria registros duplicados; se vier com outro texto, retorna conflito.

A inclusão bloqueia a ficha durante a transação e acrescenta o registro ao conteúdo existente. Atualizações administrativas da ficha também usam esse bloqueio e preservam os registros clínicos. A leitura da ficha pela escola e administração omite os registros clínicos. Informações anteriores são preservadas, sem nova migração.

## RNF01 — Autenticação

As páginas de estudante, escola, clínica e administração exigem sessão e perfil compatível. Visitantes são encaminhados à entrada; uma conta de outro perfil volta à própria área. A API continua aplicando suas verificações independentemente da interface.

Respostas 401 em operações restritas limpam a conta e o cache da interface. Falhas de rede ao consultar a conta não são tratadas como ausência de login: a tela oferece tentar novamente.

O login exige CSRF. Limites por minuto: 10 tentativas por combinação de IP e e-mail, mais 120 tentativas totais por IP. O bloqueio retorna 429 e `Retry-After`. O limite maior permite que vários estudantes compartilhem o IP da escola. O cache padrão usa arquivos, sem depender de uma tabela de cache adicional.

## RNF04 — Credenciais

Mantido o formato PBKDF2-SHA256 existente, com salt aleatório e 1.200.000 iterações para novas senhas. Hashes antigos válidos continuam funcionando. Hashes malformados ou com custo inválido são recusados. Login e respostas cadastrais não devolvem senha ou hash.

No cadastro administrativo, a senha inicial é informada explicitamente, com pelo menos oito caracteres. Foi retirada a geração de senha previsível a partir da matrícula. A senha não é persistida em localStorage ou sessionStorage.

## RNF17 — Feedback

Registros clínicos, observações, sessões, avisos, leitura de alertas e operações administrativas aguardam a confirmação da API. O cache só é atualizado após confirmação. A interface mostra o andamento e os erros, bloqueia novos envios enquanto a operação está pendente e mantém os formulários em caso de falha.

A conclusão da pausa só avança depois da confirmação de salvamento. Se o alerta do nível 3 falhar, a respiração permanece disponível e há um botão para tentar o envio novamente. O retorno à sala e a saída da conta também aguardam confirmação.

## Validação

Testes cobrem login real, logout, sessão ausente/inativa, perfil incorreto, CSRF, limites de login e expiração da janela, hashes de senha, preservação de registros antigos, reenvio sem duplicação, autor/data definidos pelo servidor, permissões e privacidade da ficha.

Na interface, os testes simulam falha de conexão, salvamento pendente, preservação do rascunho, nova tentativa, conclusão da sessão, expiração da autenticação e bloqueio de páginas por perfil. A simulação de contas usada pelos testes permanece restrita ao modo de testes.

Resultado: 165 testes da interface e 16 testes PHP (81 verificações) aprovados. TypeScript e build de produção aprovados. Os testes PHP usam SQLite em memória, sem gravar no banco real; o bloqueio de concorrência usa a transação e o bloqueio de linha do PostgreSQL na aplicação.

Não foi executado deploy ou alteração no banco de produção.
