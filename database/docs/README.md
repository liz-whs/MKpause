# Documentação do banco de dados — MKpause

Esta pasta reúne a documentação técnica das versões do esquema do banco de dados.

## Documentos

- [`v1-esquema-inicial.md`](v1-esquema-inicial.md): descreve a migração `V1__criacao_do_esquema_inicial.sql`, incluindo tabelas, relacionamentos, restrições, índices, funções, gatilhos, responsabilidades do backend e pendências conhecidas.
- [`v2-responsavel-como-contato.md`](v2-responsavel-como-contato.md): documenta a migração `V2__ajusta_responsavel_como_contato.sql`, que transforma o responsável em contato sem login, suas pré-condições e a validação local informada pela equipe.
- [`v3-codigos-de-cadastro-e-vinculo.md`](v3-codigos-de-cadastro-e-vinculo.md): documenta a migração `V3__codigos_de_cadastro_e_vinculo.sql`, suas três tabelas, relacionamentos, restrições e regras de cadastro/vínculo a implementar no backend.

## Organização

- `../migrations/`: arquivos SQL versionados e executáveis pelo Flyway.
- `./`: documentação explicativa de cada versão do banco.

As migrações já aplicadas não devem ser editadas. Mudanças futuras devem ser registradas em novas migrações versionadas e refletidas na documentação correspondente.

A documentação distingue entre:
- regras garantidas diretamente pelo PostgreSQL;
- regras que precisam ser implementadas pelo backend;
- decisões aprovadas que ainda não estão refletidas no esquema atual.
