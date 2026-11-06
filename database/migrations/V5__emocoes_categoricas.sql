-- V5: registra as seis emoções categóricas sem atribuir intensidade.
-- Preserva os registros históricos ordinais (estado 1 a 5) sem conversão arbitrária.
ALTER TABLE registro_humor
    ADD COLUMN emocao VARCHAR(16);

ALTER TABLE registro_humor
    ALTER COLUMN estado DROP NOT NULL;

ALTER TABLE registro_humor
    ADD CONSTRAINT ck_registro_humor_emocao
    CHECK (emocao IN ('feliz', 'calmo', 'ansioso', 'triste', 'irritado', 'cansado'));

ALTER TABLE registro_humor
    ADD CONSTRAINT ck_registro_humor_formato
    CHECK (
        (estado IS NOT NULL AND emocao IS NULL)
        OR (estado IS NULL AND emocao IS NOT NULL)
    );

COMMENT ON COLUMN registro_humor.estado IS
    'Registro ordinal legado 1 a 5; não converter automaticamente em emoção categórica.';
COMMENT ON COLUMN registro_humor.emocao IS
    'Nova seleção categórica do estudante, entre as seis emoções do frontend; sem intensidade.';
