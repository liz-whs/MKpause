-- Hora em que o alerta terminou: no nível 2, quando o estudante toca em "Voltei para a sala".
-- Alertas antigos ficam sem horário (NULL): o painel mostra "Voltou" sem hora para eles.
ALTER TABLE alerta ADD COLUMN finalizado_em TIMESTAMPTZ;
