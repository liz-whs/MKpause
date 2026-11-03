-- MKpause - V3: códigos de cadastro (gerados pelo admin) e de vínculo (gerados pelo estudante).
-- Os códigos nunca são guardados em texto: só o HMAC-SHA256 (codigo_hash) e os 3 últimos
-- caracteres (sufixo), para o admin reconhecer o código na lista.

CREATE TABLE codigo_cadastro (
    id_codigo_cadastro BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_hash CHAR(64) NOT NULL UNIQUE,
    sufixo VARCHAR(3) NOT NULL,
    perfil VARCHAR(20) NOT NULL,
    id_administrador BIGINT NOT NULL
        REFERENCES administrador(id_administrador) ON DELETE RESTRICT,
    -- Pré-preenchimento opcional (só faz sentido para estudante)
    turma VARCHAR(80),
    instituicao_ensino VARCHAR(160),
    usos_maximos INTEGER NOT NULL DEFAULT 1,
    usos INTEGER NOT NULL DEFAULT 0,
    expira_em TIMESTAMPTZ NOT NULL,
    revogado_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_codigo_cadastro_perfil CHECK (
        perfil IN ('ESTUDANTE', 'PROFESSOR', 'PSICOLOGO_ESCOLAR', 'PSICOLOGO_CLINICO')),
    CONSTRAINT ck_codigo_cadastro_usos CHECK (usos_maximos BETWEEN 1 AND 200 AND usos BETWEEN 0 AND usos_maximos),
    CONSTRAINT ck_codigo_cadastro_validade CHECK (expira_em > criado_em)
);

-- Quem usou cada código de cadastro (auditoria; um código pode ter vários usos).
CREATE TABLE uso_codigo_cadastro (
    id_codigo_cadastro BIGINT NOT NULL
        REFERENCES codigo_cadastro(id_codigo_cadastro) ON DELETE RESTRICT,
    id_usuario BIGINT NOT NULL UNIQUE
        REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    usado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_codigo_cadastro, id_usuario)
);

-- Código gerado pelo estudante; quando um profissional o usa, vira uma solicitação.
CREATE TABLE codigo_vinculo (
    id_codigo_vinculo BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_hash CHAR(64) NOT NULL UNIQUE,
    id_estudante BIGINT NOT NULL
        REFERENCES estudante(id_estudante) ON DELETE RESTRICT,
    expira_em TIMESTAMPTZ NOT NULL,
    revogado_em TIMESTAMPTZ,
    -- Preenchidos quando um profissional usa o código (no máximo um dos dois)
    id_professor BIGINT REFERENCES professor(id_professor) ON DELETE RESTRICT,
    id_psicologo_escolar BIGINT REFERENCES psicologo_escolar(id_psicologo_escolar) ON DELETE RESTRICT,
    resgatado_em TIMESTAMPTZ,
    -- Resposta do estudante
    status VARCHAR(25) NOT NULL DEFAULT 'ABERTO',
    respondido_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_codigo_vinculo_status CHECK (
        status IN ('ABERTO', 'AGUARDANDO_ESTUDANTE', 'ACEITO', 'RECUSADO', 'REVOGADO')),
    CONSTRAINT ck_codigo_vinculo_um_profissional CHECK (
        NOT (id_professor IS NOT NULL AND id_psicologo_escolar IS NOT NULL)),
    CONSTRAINT ck_codigo_vinculo_resgate CHECK (
        (status = 'ABERTO') = (resgatado_em IS NULL)
        OR status = 'REVOGADO'),
    CONSTRAINT ck_codigo_vinculo_validade CHECK (expira_em > criado_em)
);

CREATE INDEX ix_codigo_vinculo_estudante ON codigo_vinculo (id_estudante, status);
CREATE INDEX ix_codigo_cadastro_admin ON codigo_cadastro (id_administrador, criado_em DESC);
