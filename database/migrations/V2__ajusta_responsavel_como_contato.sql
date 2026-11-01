-- MKpause - V2: responsável passa a ser contato sem login.
-- Pré-requisitos: V1 aplicada pelo Flyway e backup verificado.
-- Esta migração foi desenhada para uma tabela responsavel sem registros.
-- Se houver registros, interrompe sem modificar a estrutura.

-- Bloqueia alterações concorrentes enquanto conferimos a ausência de dados.
LOCK TABLE public.responsavel IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.responsavel) THEN
        RAISE EXCEPTION
            'V2 cancelada: a tabela responsavel possui registros. Migrar os dados antes de remover id_usuario.';
    END IF;
END;
$$;

-- Campos próprios do contato, sem necessidade de uma conta em usuario.
ALTER TABLE public.responsavel
    ADD COLUMN nome_completo VARCHAR(150) NOT NULL,
    ADD COLUMN email VARCHAR(254);

-- Elimina a dependência do responsável em relação à conta autenticável.
-- PostgreSQL remove também as restrições da própria coluna (FK/UNIQUE).
ALTER TABLE public.responsavel
    DROP COLUMN id_usuario;

-- Não alteramos id_responsavel nem estudante_responsavel:
-- a chave estrangeira do vínculo permanece válida.
