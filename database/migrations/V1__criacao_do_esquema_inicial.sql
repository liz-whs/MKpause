-- MKpause - V1: esquema inicial
-- SGBD: PostgreSQL
-- Gerenciado pelo Flyway.
--
-- IMPORTANTE:
-- 1. Esta migration cria a estrutura do banco antes do backend.
-- 2. A tabela usuario centraliza a identidade dos usuarios do sistema.
-- 3. A integracao com a autenticacao do Django sera definida no backend.
-- 4. Cadastros devem ser desativados (ativo = FALSE), nao apagados fisicamente,
--    para preservar o historico.
--
-- Convencao fisica: nomes em snake_case e minusculos no PostgreSQL.
CREATE TABLE usuario (
    id_usuario BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome_completo VARCHAR(150) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE estudante (
    id_estudante BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario BIGINT NOT NULL UNIQUE
        REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    data_nascimento DATE,
    telefone VARCHAR(30),
    instituicao_ensino VARCHAR(160),
    turma VARCHAR(80),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE professor (
    id_professor BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario BIGINT NOT NULL UNIQUE
        REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    telefone VARCHAR(30),
    instituicao_ensino VARCHAR(160),
    cargo VARCHAR(120),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE psicologo_escolar (
    id_psicologo_escolar BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario BIGINT NOT NULL UNIQUE
        REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    telefone VARCHAR(30),
    registro_profissional VARCHAR(40) NOT NULL,
    estado_registro CHAR(2) NOT NULL,
    instituicao_ensino VARCHAR(160),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_psicologo_escolar_uf
        CHECK (estado_registro ~ '^[A-Z]{2}$')
);

CREATE TABLE psicologo_clinico (
    id_psicologo_clinico BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario BIGINT NOT NULL UNIQUE
        REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    telefone VARCHAR(30),
    registro_profissional VARCHAR(40) NOT NULL,
    estado_registro CHAR(2) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_psicologo_clinico_uf
        CHECK (estado_registro ~ '^[A-Z]{2}$')
);

CREATE TABLE responsavel (
    id_responsavel BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario BIGINT NOT NULL UNIQUE
        REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    telefone VARCHAR(30),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE administrador (
    id_administrador BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario BIGINT NOT NULL UNIQUE
        REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE atividade (
    id_atividade BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome VARCHAR(160) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(40) NOT NULL,
    conteudo_ou_referencia TEXT,
    disponivel BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_atividade_tipo CHECK (
        tipo IN ('JOGO', 'VIDEO', 'EXERCICIO', 'RESPIRACAO', 'OUTRO')
    )
);

CREATE TABLE sessao (
    id_sessao BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_estudante BIGINT NOT NULL
        REFERENCES estudante(id_estudante) ON DELETE RESTRICT,
    id_atividade BIGINT NOT NULL
        REFERENCES atividade(id_atividade) ON DELETE RESTRICT,
    iniciada_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    terminada_em TIMESTAMPTZ,
    nivel_avaliado SMALLINT,
    duracao_segundos INTEGER,
    observacoes_sessao TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'EM_ANDAMENTO',
    CONSTRAINT ck_sessao_nivel CHECK (nivel_avaliado IS NULL OR nivel_avaliado BETWEEN 1 AND 3),
    CONSTRAINT ck_sessao_duracao CHECK (duracao_segundos IS NULL OR duracao_segundos >= 0),
    CONSTRAINT ck_sessao_status CHECK (
        status IN ('EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA')
    ),
    CONSTRAINT ck_sessao_termino CHECK (
        terminada_em IS NULL OR terminada_em >= iniciada_em
    ),
    CONSTRAINT uq_sessao_id_estudante
        UNIQUE (id_sessao, id_estudante)
);

CREATE TABLE registro_humor (
    id_registro_humor BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_sessao BIGINT NOT NULL
        REFERENCES sessao(id_sessao) ON DELETE RESTRICT,
    estado SMALLINT NOT NULL,
    momento VARCHAR(10) NOT NULL,
    registrado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_registro_humor_estado CHECK (estado BETWEEN 1 AND 5),
    CONSTRAINT ck_registro_humor_momento CHECK (momento IN ('PRE', 'POS')),
    CONSTRAINT uq_registro_humor_sessao_momento UNIQUE (id_sessao, momento)
);

CREATE TABLE alerta (
    id_alerta BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_estudante BIGINT NOT NULL
        REFERENCES estudante(id_estudante) ON DELETE RESTRICT,
    id_sessao BIGINT,
    nivel SMALLINT NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) NOT NULL DEFAULT 'ABERTO',
    descricao TEXT,
    CONSTRAINT ck_alerta_nivel CHECK (nivel IN (2, 3)),
    CONSTRAINT ck_alerta_status CHECK (
        status IN ('ABERTO', 'EM_ACOMPANHAMENTO', 'RESOLVIDO', 'CANCELADO')
    ),
    CONSTRAINT fk_alerta_sessao_estudante
        FOREIGN KEY (id_sessao, id_estudante)
        REFERENCES sessao(id_sessao, id_estudante)
        ON DELETE RESTRICT
);

CREATE TABLE destinatario_alerta (
    id_destinatario_alerta BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_alerta BIGINT NOT NULL
        REFERENCES alerta(id_alerta) ON DELETE RESTRICT,
    id_usuario BIGINT NOT NULL
        REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    tipo_destinatario VARCHAR(30) NOT NULL,
    status_notificacao VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    enviado_em TIMESTAMPTZ,
    lido_em TIMESTAMPTZ,
    CONSTRAINT ck_destinatario_alerta_tipo CHECK (
        tipo_destinatario IN ('PROFESSOR', 'PSICOLOGO_ESCOLAR')
    ),
    CONSTRAINT ck_destinatario_alerta_status CHECK (
        status_notificacao IN ('PENDENTE', 'ENVIADA', 'LIDA', 'FALHA')
    ),
    CONSTRAINT uq_destinatario_alerta_usuario UNIQUE (id_alerta, id_usuario)
);

CREATE TABLE observacao (
    id_observacao BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_alerta BIGINT NOT NULL
        REFERENCES alerta(id_alerta) ON DELETE RESTRICT,
    id_autor BIGINT NOT NULL
        REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    conteudo TEXT NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ,
    CONSTRAINT ck_observacao_conteudo CHECK (length(trim(conteudo)) > 0)
);

CREATE TABLE ficha_acompanhamento (
    id_ficha BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_estudante BIGINT NOT NULL UNIQUE
        REFERENCES estudante(id_estudante) ON DELETE RESTRICT,
    informacoes_acompanhamento TEXT,
    criada_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizada_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE aviso (
    id_aviso BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    titulo VARCHAR(180) NOT NULL,
    conteudo TEXT NOT NULL,
    publicado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_autor BIGINT NOT NULL
        REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    publico_destinatario VARCHAR(30) NOT NULL DEFAULT 'TODOS',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_aviso_publico CHECK (
        publico_destinatario IN (
            'TODOS', 'ESTUDANTES', 'PROFESSORES',
            'PSICOLOGOS_ESCOLARES', 'PSICOLOGOS_CLINICOS', 'RESPONSAVEIS'
        )
    )
);

CREATE TABLE professor_estudante (
    id_professor BIGINT NOT NULL
        REFERENCES professor(id_professor) ON DELETE RESTRICT,
    id_estudante BIGINT NOT NULL
        REFERENCES estudante(id_estudante) ON DELETE RESTRICT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_professor, id_estudante)
);

CREATE TABLE psicologo_escolar_estudante (
    id_psicologo_escolar BIGINT NOT NULL
        REFERENCES psicologo_escolar(id_psicologo_escolar) ON DELETE RESTRICT,
    id_estudante BIGINT NOT NULL
        REFERENCES estudante(id_estudante) ON DELETE RESTRICT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_psicologo_escolar, id_estudante)
);

CREATE TABLE psicologo_clinico_estudante (
    id_psicologo_clinico BIGINT NOT NULL
        REFERENCES psicologo_clinico(id_psicologo_clinico) ON DELETE RESTRICT,
    id_estudante BIGINT NOT NULL
        REFERENCES estudante(id_estudante) ON DELETE RESTRICT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_psicologo_clinico, id_estudante)
);

CREATE TABLE estudante_responsavel (
    id_estudante BIGINT NOT NULL
        REFERENCES estudante(id_estudante) ON DELETE RESTRICT,
    id_responsavel BIGINT NOT NULL
        REFERENCES responsavel(id_responsavel) ON DELETE RESTRICT,
    grau_parentesco VARCHAR(60),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_estudante, id_responsavel)
);

-- Índices para consultas frequentes e relacionamentos.
CREATE INDEX idx_sessao_estudante_iniciada
    ON sessao (id_estudante, iniciada_em DESC);
CREATE INDEX idx_registro_humor_sessao
    ON registro_humor (id_sessao);
CREATE INDEX idx_alerta_estudante_criado
    ON alerta (id_estudante, criado_em DESC);
CREATE INDEX idx_alerta_sessao
    ON alerta (id_sessao);
CREATE INDEX idx_destinatario_alerta_usuario_status
    ON destinatario_alerta (id_usuario, status_notificacao);
CREATE INDEX idx_observacao_alerta_criado
    ON observacao (id_alerta, criado_em DESC);
CREATE INDEX idx_professor_estudante_estudante
    ON professor_estudante (id_estudante);
CREATE INDEX idx_psicologo_escolar_estudante_estudante
    ON psicologo_escolar_estudante (id_estudante);
CREATE INDEX idx_psicologo_clinico_estudante_estudante
    ON psicologo_clinico_estudante (id_estudante);
CREATE INDEX idx_estudante_responsavel_responsavel
    ON estudante_responsavel (id_responsavel);

-- Verifica se o destinatario possui perfil correspondente ativo.
CREATE OR REPLACE FUNCTION fn_validar_destinatario_alerta()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM usuario u
        WHERE u.id_usuario = NEW.id_usuario
          AND u.ativo = TRUE
    ) THEN
        RAISE EXCEPTION
            'O destinatario deve possuir um usuario ativo.';
    END IF;

    IF NEW.tipo_destinatario = 'PROFESSOR' THEN
        IF NOT EXISTS (
            SELECT 1
            FROM professor p
            WHERE p.id_usuario = NEW.id_usuario
              AND p.ativo = TRUE
        ) THEN
            RAISE EXCEPTION
                'O destinatario informado nao possui perfil ativo de professor.';
        END IF;

    ELSIF NEW.tipo_destinatario = 'PSICOLOGO_ESCOLAR' THEN
        IF NOT EXISTS (
            SELECT 1
            FROM psicologo_escolar pe
            WHERE pe.id_usuario = NEW.id_usuario
              AND pe.ativo = TRUE
        ) THEN
            RAISE EXCEPTION
                'O destinatario informado nao possui perfil ativo de psicologo escolar.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validar_destinatario_alerta
BEFORE INSERT OR UPDATE OF id_usuario, tipo_destinatario
ON destinatario_alerta
FOR EACH ROW
EXECUTE FUNCTION fn_validar_destinatario_alerta();


-- Permite observacoes de estudantes, professores e psicologos escolares.
CREATE OR REPLACE FUNCTION fn_validar_autor_observacao()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM usuario u
        WHERE u.id_usuario = NEW.id_autor
          AND u.ativo = TRUE
    ) THEN
        RAISE EXCEPTION
            'O autor da observacao deve possuir um usuario ativo.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM estudante e
        WHERE e.id_usuario = NEW.id_autor
          AND e.ativo = TRUE

        UNION ALL

        SELECT 1
        FROM professor p
        WHERE p.id_usuario = NEW.id_autor
          AND p.ativo = TRUE

        UNION ALL

        SELECT 1
        FROM psicologo_escolar pe
        WHERE pe.id_usuario = NEW.id_autor
          AND pe.ativo = TRUE
    ) THEN
        RAISE EXCEPTION
            'O autor deve possuir perfil ativo de estudante, professor ou psicologo escolar.';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validar_autor_observacao
BEFORE INSERT OR UPDATE OF id_autor
ON observacao
FOR EACH ROW
EXECUTE FUNCTION fn_validar_autor_observacao();
