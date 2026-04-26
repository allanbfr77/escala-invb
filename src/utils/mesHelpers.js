/** Piso absoluto do sistema */
export const MES_ABSOLUTO = "2026-05";

/** Mês mínimo navegável: max(MES_ABSOLUTO, mês civil atual − 1) */
export function getMesMinimo() {
  const hoje = new Date();
  const umMesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const y = umMesAtras.getFullYear();
  const m = String(umMesAtras.getMonth() + 1).padStart(2, "0");
  const candidato = `${y}-${m}`;
  return candidato < MES_ABSOLUTO ? MES_ABSOLUTO : candidato;
}

/** Mês máximo navegável: Dezembro do ano corrente */
export function getMesMaximo() {
  return `${new Date().getFullYear()}-12`;
}

/**
 * Mês exibido por padrão:
 *   - Dia >= 20 → mês seguinte (foco no planejamento)
 *   - Dia  < 20 → mês atual
 * Sempre limitado entre mesMinimo e mesMaximo.
 */
export function getMesInicial() {
  const hoje = new Date();
  const base = hoje.getDate() >= 20
    ? new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)
    : hoje;
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, "0");
  const candidato = `${y}-${m}`;
  const min = getMesMinimo();
  const max = getMesMaximo();
  if (candidato < min) return min;
  if (candidato > max) return max;
  return candidato;
}
