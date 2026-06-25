/** Nomes legados → forma canônica de exibição (maiúsculas). */
const NOMES_CANONICOS = {
  "luciana fernandes": "LUCIANA F.",
};

/** Chave de comparação: minúsculas, sem acentos e espaços extras. */
function chaveComparacaoNome(nome) {
  return String(nome)
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/**
 * Normaliza nome para exibição e comparação (preserva "disponível").
 */
export function normalizarNomePessoa(nome) {
  if (!nome || typeof nome !== "string") return nome;
  const trimmed = nome.trim().replace(/\s+/g, " ");
  if (!trimmed) return nome;
  if (chaveComparacaoNome(trimmed) === "disponivel") return "disponível";
  return NOMES_CANONICOS[chaveComparacaoNome(trimmed)] ?? trimmed.toUpperCase();
}

/** Valor gravado em Firestore (pessoaNome em minúsculas). */
export function pessoaNomeFirestore(nome) {
  const canon = normalizarNomePessoa(nome);
  if (canon === "disponível") return canon;
  return chaveComparacaoNome(canon);
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
