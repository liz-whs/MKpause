-- V4: aceite do responsável e fila de envio. Não modifica migrações anteriores.
CREATE TABLE convite_responsavel (
    id_convite BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nonce UUID NOT NULL UNIQUE,
    id_estudante BIGINT NOT NULL REFERENCES estudante(id_estudante) ON DELETE RESTRICT,
    id_responsavel BIGINT NOT NULL REFERENCES responsavel(id_responsavel) ON DELETE RESTRICT,
    id_psicologo_clinico BIGINT REFERENCES psicologo_clinico(id_psicologo_clinico) ON DELETE RESTRICT,
    id_administrador BIGINT NOT NULL REFERENCES administrador(id_administrador) ON DELETE RESTRICT,
    email_destino VARCHAR(254) NOT NULL,
    parentesco VARCHAR(60),
    termo_versao VARCHAR(30) NOT NULL,
    termo_texto TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE'
        CHECK (status IN ('PENDENTE', 'ACEITO', 'RECUSADO', 'REVOGADO')),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_em TIMESTAMPTZ NOT NULL,
    respondido_em TIMESTAMPTZ,
    revogado_em TIMESTAMPTZ,
    CONSTRAINT ck_convite_validade CHECK (expira_em > criado_em)
);
CREATE INDEX ix_convite_estudante ON convite_responsavel (id_estudante, criado_em DESC);

CREATE TABLE notificacao_email (
    id_notificacao BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_convite BIGINT UNIQUE REFERENCES convite_responsavel(id_convite) ON DELETE RESTRICT,
    id_destinatario_alerta BIGINT UNIQUE REFERENCES destinatario_alerta(id_destinatario_alerta) ON DELETE RESTRICT,
    email_destino VARCHAR(254) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE'
        CHECK (status IN ('PENDENTE', 'PROCESSANDO', 'ENVIADA', 'FALHA', 'CANCELADA')),
    tentativas INTEGER NOT NULL DEFAULT 0 CHECK (tentativas >= 0),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    disponivel_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processando_em TIMESTAMPTZ,
    enviado_em TIMESTAMPTZ,
    erro VARCHAR(120),
    CONSTRAINT ck_email_origem CHECK ((id_convite IS NULL) <> (id_destinatario_alerta IS NULL))
);
CREATE INDEX ix_email_fila ON notificacao_email (status, disponivel_em);
