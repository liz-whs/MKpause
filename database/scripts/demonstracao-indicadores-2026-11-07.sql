-- Dados SINTETICOS solicitados para conferir os indicadores em 07/11/2026.
-- Execute no PostgreSQL do MKpause (por exemplo, no editor SQL do Neon).
-- Cria 15 sessoes concluidas e 30 humores, sem alterar registros existentes,
-- contas, senhas, turmas, vinculos ou alertas. A repeticao nao duplica a carga.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SELECT pg_advisory_xact_lock(761107, 1);

DO $carga$
DECLARE
    emails CONSTANT text[] := ARRAY[
        'ana.demo@mkpause.dev', 'emelize@marista.com',
        'giovanna@positivo.com', 'maicris@maicris.com', 'otavio@lerote.com'
    ];
    marca CONSTANT text := '[MKPAUSE-TESTE-INDICADORES-2026-11-07] DADOS SINTETICOS';
    estudante_teste record;
    exemplo record;
    atividade_teste bigint;
    sessao_teste bigint;
    inicio timestamptz;
    quantidade integer;
BEGIN
    SELECT count(*) INTO quantidade FROM estudante e
    JOIN usuario u ON u.id_usuario = e.id_usuario
    WHERE lower(u.email) = ANY(emails) AND u.ativo AND e.ativo;
    IF quantidade <> 5 OR (
        SELECT count(DISTINCT lower(u.email)) FROM estudante e
        JOIN usuario u ON u.id_usuario = e.id_usuario
        WHERE lower(u.email) = ANY(emails) AND u.ativo AND e.ativo
    ) <> 5 THEN
        RAISE EXCEPTION 'Carga cancelada: as cinco contas devem existir, estar ativas e ter um unico perfil de estudante cada.';
    END IF;
    IF (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date <= DATE '2026-11-06' THEN
        RAISE EXCEPTION 'Carga cancelada: as datas de teste devem ser anteriores a hoje.';
    END IF;

    FOR exemplo IN SELECT * FROM (VALUES
        (DATE '2026-11-04', 'RESPIRACAO', 3, 4),
        (DATE '2026-11-05', 'JOGO',       4, 4),
        (DATE '2026-11-06', 'VIDEO',      4, 3)
    ) AS casos(dia, tipo, humor_pre, humor_pos)
    LOOP
        SELECT min(id_atividade) INTO atividade_teste FROM atividade
        WHERE tipo = exemplo.tipo AND disponivel;
        IF atividade_teste IS NULL THEN
            RAISE EXCEPTION 'Carga cancelada: falta atividade disponivel do tipo %.', exemplo.tipo;
        END IF;
        inicio := (exemplo.dia + TIME '10:00') AT TIME ZONE 'America/Sao_Paulo';
        FOR estudante_teste IN
            SELECT e.id_estudante FROM estudante e
            JOIN usuario u ON u.id_usuario = e.id_usuario
            WHERE lower(u.email) = ANY(emails) AND u.ativo AND e.ativo
            ORDER BY e.id_estudante
        LOOP
            IF EXISTS (SELECT 1 FROM sessao WHERE
                id_estudante = estudante_teste.id_estudante
                AND observacoes_sessao = marca AND iniciada_em = inicio
            ) THEN CONTINUE; END IF;

            INSERT INTO sessao (id_estudante, id_atividade, iniciada_em,
                terminada_em, nivel_avaliado, duracao_segundos, observacoes_sessao, status)
            VALUES (estudante_teste.id_estudante, atividade_teste, inicio,
                inicio + INTERVAL '3 minutes', 1, 180, marca, 'CONCLUIDA')
            RETURNING id_sessao INTO sessao_teste;
            INSERT INTO registro_humor (id_sessao, estado, momento, registrado_em)
            VALUES (sessao_teste, exemplo.humor_pre, 'PRE', inicio),
                   (sessao_teste, exemplo.humor_pos, 'POS', inicio + INTERVAL '3 minutes');
        END LOOP;
    END LOOP;

    SELECT count(*) INTO quantidade FROM sessao
    WHERE observacoes_sessao = marca;
    IF quantidade <> 15 OR (
        SELECT count(*) FROM registro_humor h JOIN sessao s ON s.id_sessao = h.id_sessao
        WHERE s.observacoes_sessao = marca
    ) <> 30 THEN
        RAISE EXCEPTION 'Carga cancelada: a verificacao de 15 sessoes e 30 humores falhou.';
    END IF;
END;
$carga$;

-- Resultado esperado: cinco contas, cada uma com tres sessoes, de 04 a 06/11.
SELECT u.email, count(*) AS sessoes_de_teste,
    min(s.iniciada_em AT TIME ZONE 'America/Sao_Paulo') AS primeira,
    max(s.iniciada_em AT TIME ZONE 'America/Sao_Paulo') AS ultima
FROM sessao s JOIN estudante e ON e.id_estudante = s.id_estudante
JOIN usuario u ON u.id_usuario = e.id_usuario
WHERE s.observacoes_sessao = '[MKPAUSE-TESTE-INDICADORES-2026-11-07] DADOS SINTETICOS'
GROUP BY u.email ORDER BY u.email;
COMMIT;
