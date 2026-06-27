import { pessoasPorMinisterio } from "../data/pessoas";
import { pessoaNomeFirestore } from "./nomeExibicao";

/** pessoaLower → Set(ministerioId) */
export function buildMinisteriosPorPessoa() {
  const map = new Map();

  for (const [ministerioId, pessoas] of Object.entries(pessoasPorMinisterio)) {
    for (const pessoa of pessoas || []) {
      const pl = pessoaNomeFirestore(pessoa);
      if (!map.has(pl)) map.set(pl, new Set());
      map.get(pl).add(ministerioId);
    }
  }

  return map;
}

export const MINISTERIOS_POR_PESSOA = buildMinisteriosPorPessoa();

export function ministeriosDaPessoa(pessoaNome) {
  const pl = pessoaNomeFirestore(pessoaNome);
  return MINISTERIOS_POR_PESSOA.get(pl) || new Set();
}
