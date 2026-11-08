-- Não deduzir autorização a partir do nome de escola autodeclarado.
CREATE TABLE escola (id_escola BIGSERIAL PRIMARY KEY, nome VARCHAR(160) NOT NULL UNIQUE);
ALTER TABLE usuario ADD COLUMN id_escola BIGINT REFERENCES escola(id_escola);
CREATE INDEX usuario_escola_idx ON usuario(id_escola);
ALTER TABLE codigo_cadastro ADD COLUMN id_escola BIGINT REFERENCES escola(id_escola);
-- Códigos legados sem instituição ficam indisponíveis até serem substituídos.
ALTER TABLE atividade ADD COLUMN id_escola BIGINT REFERENCES escola(id_escola);
CREATE INDEX atividade_escola_idx ON atividade(id_escola);
