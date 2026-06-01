/** Nomes legados → forma canônica de exibição (maiúsculas). */
const NOMES_CANONICOS = {
  "luciana fernandes": "LUCIANA F.",
};

/**
 * Normaliza nome para exibição e comparação (preserva "disponível").
 */
export function normalizarNomePessoa(nome) {
  if (!nome || typeof nome !== "string") return nome;
  const trimmed = nome.trim();
  if (!trimmed) return nome;
  if (trimmed.toLowerCase() === "disponível") return "disponível";
  return NOMES_CANONICOS[trimmed.toLowerCase()] ?? trimmed.toUpperCase();
}

/** Valor gravado em Firestore (pessoaNome em minúsculas). */
export function pessoaNomeFirestore(nome) {
  const canon = normalizarNomePessoa(nome);
  if (canon === "disponível") return canon;
  return String(canon).toLowerCase();
}

/** Nome formatado para UI, exportação e relatórios. */
export function nomeParaExibicao(nome) {
  const canon = normalizarNomePessoa(nome);
  if (!canon) return "";
  if (canon === "disponível") return "DISPONÍVEL";
  return canon;
}

/** Aplica normalização a todos os valores do mapa de escalas. */
export function normalizarMapaEscalas(mapa) {
  if (!mapa || typeof mapa !== "object") return mapa;
  const out = {};
  for (const [chave, valor] of Object.entries(mapa)) {
    out[chave] = typeof valor === "string" ? normalizarNomePessoa(valor) : valor;
  }
  return out;
}
