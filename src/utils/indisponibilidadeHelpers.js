/** Chave de indisponibilidade alinhada ao Firestore e à sidebar: "YYYY-MM-DD|turno" */
export function chaveIndisponibilidadeColuna(dataObj) {
  const turno = dataObj.turno ?? "único";
  return `${dataObj.data}|${turno}`;
}

/**
 * Mapa Firestore: pessoaNome (lowercase) → Set("data|turno")
 * Retorna true se a pessoa está indisponível em todas as colunas do mês.
 */
export function estaIndisponivelTodoMes(pessoa, datas, indisponiveisMap) {
  const total = datas?.length ?? 0;
  if (total === 0) return false;

  const set = indisponiveisMap?.[pessoa.toLowerCase()];
  if (!set?.size) return false;

  let indisp = 0;
  for (const d of datas) {
    if (set.has(chaveIndisponibilidadeColuna(d))) indisp++;
  }
  return indisp >= total;
}

/**
 * Set planilha: "pessoa|data|turno"
 */
export function estaIndisponivelTodoMesFromSet(pessoa, datas, indispSet) {
  const total = datas?.length ?? 0;
  if (total === 0) return false;

  const pl = pessoa.toLowerCase();
  let indisp = 0;
  for (const d of datas) {
    const turno = d.turno ?? "único";
    if (indispSet.has(`${pl}|${d.data}|${turno}`)) indisp++;
  }
  return indisp >= total;
}

export function filtrarPessoasDisponiveisMes(pessoas, datas, indisponiveisMap) {
  return (pessoas || []).filter(
    (p) => !estaIndisponivelTodoMes(p, datas, indisponiveisMap)
  );
}
