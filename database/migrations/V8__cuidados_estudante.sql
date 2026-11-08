CREATE TABLE cuidado_estudante (
 id_estudante BIGINT NOT NULL REFERENCES estudante(id_estudante),
 dia DATE NOT NULL,
 cuidado VARCHAR(16) NOT NULL CHECK (cuidado IN ('agua','alongar','longe')),
 PRIMARY KEY (id_estudante,dia,cuidado)
);
