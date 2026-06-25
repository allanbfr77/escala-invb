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

/**
 * Código curto do turno para bolinhas do painel: Q, DM, DN (ou abreviação de extra).
 */
export function codigoTurnoIndisponibilidade(dataObj) {
  if (dataObj.turno === "manhã") return "DM";
  if (dataObj.turno === "noite") return "DN";
  if (dataObj.tipo === "quarta" || dataObj.turno === "único") return "Q";
  if (dataObj.tipo === "extra" && dataObj.descricao) {
    return dataObj.descricao.slice(0, 2).toUpperCase();
  }
  return "Q";
}

/** Data compacta para bolinhas: "5/7" (sem zero à esquerda). */
export function dataTurnoIndisponibilidadeCurta(dataStr) {
  const [, mes, dia] = dataStr.split("-");
  return `${Number(dia)}/${Number(mes)}`;
}

/** Descrição acessível do turno (aria-label). */
export function descricaoTurnoIndisponibilidade(dataObj) {
  const codigo = codigoTurnoIndisponibilidade(dataObj);
  const data = dataTurnoIndisponibilidadeCurta(dataObj.data);
  const mapa = { Q: "Quarta", DM: "Domingo manhã", DN: "Domingo noite" };
  const tipo = mapa[codigo] ?? (dataObj.descricao || codigo);
  return `${tipo} ${data}`;
}

const COLUNAS_SEMANA = ["quarta", "manha", "noite"];

function parseDataLocal(dataStr) {
  const [ano, mes, dia] = dataStr.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

function diasEntre(dataA, dataB) {
  const ms = parseDataLocal(dataB).getTime() - parseDataLocal(dataA).getTime();
  return Math.round(ms / 86_400_000);
}

/** Coluna fixa da grade semanal: quarta | manha | noite */
function colunaSemanaDoCulto(dataObj) {
  if (dataObj.turno === "manhã") return "manha";
  if (dataObj.turno === "noite") return "noite";
  return "quarta";
}

/**
 * Agrupa cultos do mês em fileiras semanais (Q · DM · DN).
 * Cada fileira tem 3 slots; posição sem culto fica null (bolinha tracejada na UI).
 * Retorna: { key, sortDate, quarta, manha, noite }[]
 */
export function montarSemanasIndisponibilidade(datas) {
  if (!datas?.length) return [];

  const cultosPorColuna = {
    quarta: new Map(),
    manha: new Map(),
    noite: new Map(),
  };

  for (const d of datas) {
    const col = colunaSemanaDoCulto(d);
    cultosPorColuna[col].set(d.data, d);
  }

  const domingos = [...new Set([
    ...cultosPorColuna.manha.keys(),
    ...cultosPorColuna.noite.keys(),
  ])].sort();

  const quartas = [...cultosPorColuna.quarta.keys()].sort();

  const criarLinha = (key, sortDate) => ({
    key,
    sortDate,
    quarta: null,
    manha: null,
    noite: null,
  });

  const linhas = new Map();

  for (const domingo of domingos) {
    linhas.set(domingo, criarLinha(domingo, domingo));
    if (cultosPorColuna.manha.has(domingo)) {
      linhas.get(domingo).manha = cultosPorColuna.manha.get(domingo);
    }
    if (cultosPorColuna.noite.has(domingo)) {
      linhas.get(domingo).noite = cultosPorColuna.noite.get(domingo);
    }
  }

  for (const quarta of quartas) {
    const domingoPareado = domingos.find(
      (d) => d > quarta && diasEntre(quarta, d) <= 6
    );

    if (domingoPareado && linhas.has(domingoPareado)) {
      linhas.get(domingoPareado).quarta = cultosPorColuna.quarta.get(quarta);
    } else {
      const key = `wed-${quarta}`;
      if (!linhas.has(key)) {
        linhas.set(key, criarLinha(key, quarta));
      }
      linhas.get(key).quarta = cultosPorColuna.quarta.get(quarta);
    }
  }

  return [...linhas.values()].sort((a, b) => a.sortDate.localeCompare(b.sortDate));
}

export { COLUNAS_SEMANA };

/** Conta indisponibilidades alinhadas às colunas do mês (ignora datas de outros meses no Firestore). */
export function contarIndisponibilidadesNoMes(indisponiveisSet, datas) {
  if (!indisponiveisSet?.size || !datas?.length) return 0;

  let n = 0;
  for (const d of datas) {
    if (indisponiveisSet.has(chaveIndisponibilidadeColuna(d))) n++;
  }
  return n;
}
