import axe from 'axe-core';

/** Roda o axe no contêiner e devolve as violações (cor não é testável no jsdom). */
export async function violacoes(container: Element) {
  const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  return result.violations.map((v) => `${v.id}: ${v.help}`);
}
