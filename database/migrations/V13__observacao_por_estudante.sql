-- Observações escolares passam a pertencer ao estudante: dá para registrar mesmo sem alerta.
-- O alerta continua opcional, para as observações feitas a partir de um alerta.
ALTER TABLE observacao ADD COLUMN id_estudante BIGINT REFERENCES estudante(id_estudante) ON DELETE RESTRICT;

UPDATE observacao o SET id_estudante = a.id_estudante
FROM alerta a
WHERE a.id_alerta = o.id_alerta AND o.id_estudante IS NULL;

ALTER TABLE observacao ALTER COLUMN id_estudante SET NOT NULL;
ALTER TABLE observacao ALTER COLUMN id_alerta DROP NOT NULL;

CREATE INDEX IF NOT EXISTS ix_observacao_estudante ON observacao (id_estudante, criado_em DESC);
