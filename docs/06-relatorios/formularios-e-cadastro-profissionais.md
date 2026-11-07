# Formulários e cadastro de profissionais

Alterações locais em 06/11/2026.

## Máscaras e limites

- Datas de nascimento e início do acompanhamento usam `DD/MM/AAAA`, com até dez caracteres. O envio do nascimento à API mantém o formato `AAAA-MM-DD`.
- Datas inexistentes são recusadas; nascimento no futuro também é recusado no formulário e no servidor.
- Telefones com DDD usam `(00) 0000-0000` ou `(00) 00000-0000`, aceitando digitação e colagem. A colagem com `+55` é normalizada. O servidor também valida e normaliza o telefone.
- Os campos de texto passam a ter limites definidos. Padrões: texto curto, 150; e-mail, 254; senha, 128; texto longo, 5.000 caracteres. Campos específicos: matrícula, 30; cargo, 120; escola, 160; CRP, 40; UF, 2; parentesco, 80; contato da ficha, 254; encaminhamento, 2.000.
- O contato da ficha continua aceitando texto misto de telefone e e-mail; não recebe uma máscara que apague esse conteúdo.

## Administração

Em **Usuários**, cada aba possui seu próprio botão: **Cadastrar professor**, **Cadastrar psicólogo escolar** ou **Cadastrar psicólogo clínico**.

O formulário exige nome, e-mail e senha inicial. Para psicólogos, também exige registro no CRP e UF válida. Professor pode informar disciplina/cargo; professor e psicólogo escolar podem informar a instituição. Telefone é opcional, mas precisa estar completo quando informado.

O cadastro usa as rotas administrativas existentes do Laravel. Após confirmação, a interface retorna à aba do perfil cadastrado. Em caso de erro, mantém os campos preenchidos. A nova conta pode fazer login e conserva as permissões do perfil, sem receber acesso administrativo. Não são criados vínculos automáticos com estudantes.

## Validação

- 175 testes da interface aprovados, incluindo máscaras, colagem, exclusão, calendário, três perfis e preservação do formulário em falhas.
- 21 testes PHP e 172 verificações aprovados, incluindo criação dos três perfis com login real, bloqueio de acesso administrativo, limites, telefone, datas inválidas/futuras e e-mail duplicado.
- TypeScript, build de produção e verificação de espaços do diff aprovados.

Sem migração de banco, commit ou publicação nesta entrega.
