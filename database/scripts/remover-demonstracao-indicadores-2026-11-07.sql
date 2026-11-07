-- Execute apenas para REMOVER os dados sinteticos dessa carga de teste.
-- Os registros anteriores, contas e vinculos sao preservados.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SELECT pg_advisory_xact_lock(761107, 1);
DELETE FROM registro_humor h USING sessao s
WHERE h.id_sessao = s.id_sessao
  AND s.observacoes_sessao = '[MKPAUSE-TESTE-INDICADORES-2026-11-07] DADOS SINTETICOS';
DELETE FROM sessao
WHERE observacoes_sessao = '[MKPAUSE-TESTE-INDICADORES-2026-11-07] DADOS SINTETICOS';
COMMIT;
