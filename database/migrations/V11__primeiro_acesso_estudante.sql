-- Contas existentes não precisam refazer a apresentação; novas começam pendentes.
ALTER TABLE estudante ADD COLUMN primeiro_acesso_concluido BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE estudante ALTER COLUMN primeiro_acesso_concluido SET DEFAULT FALSE;
