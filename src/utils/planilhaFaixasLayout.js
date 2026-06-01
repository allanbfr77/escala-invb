/** Colunas fixas por faixa (Domingo Manhã / Noite / Quarta) */
export const COLUNAS_POR_FAIXA = 5;

const ordenarPorData = (a, b) => a.data.localeCompare(b.data);

function padronizarCinco(itens) {
  const cols = [];
  for (let i = 0; i < COLUNAS_POR_FAIXA; i++) {
    cols.push(itens[i] ?? null);
  }
  return cols;
}

function alocarCultosExtras(extras, colunasQuarta, colunasDomingoManha) {
  const quarta = [...colunasQuarta];
  const domingoManha = [...colunasDomingoManha];

  for (const extra of extras) {
    if (!quarta[4]) {
      quarta[4] = extra;
      continue;
    }
    if (!domingoManha[4]) {
      domingoManha[4] = extra;
      continue;
    }
    const idxQuarta = quarta.findIndex((c) => c === null);
    if (idxQuarta !== -1) {
      quarta[idxQuarta] = extra;
      continue;
    }
    const idxDom = domingoManha.findIndex((c) => c === null);
    if (idxDom !== -1) {
      domingoManha[idxDom] = extra;
    }
  }

  return { quarta, domingoManha };
}

export function montarFaixasPlanilha(datas) {
  const lista = datas || [];
  const extras = lista.filter((d) => d.tipo === "extra").sort(ordenarPorData);
  const regulares = lista.filter((d) => d.tipo !== "extra");

  const domingoManhaReg = regulares
    .filter((d) => d.tipo === "domingo" && d.turno === "manhã")
    .sort(ordenarPorData);
  const domingoNoiteReg = regulares
    .filter((d) => d.tipo === "domingo" && d.turno === "noite")
    .sort(ordenarPorData);
  const quartasReg = regulares.filter((d) => d.tipo === "quarta").sort(ordenarPorData);

  let colDomingoManha = padronizarCinco(domingoManhaReg);
  const colDomingoNoite = padronizarCinco(domingoNoiteReg);
  let colQuarta = padronizarCinco(quartasReg);

  if (extras.length > 0) {
    const alocado = alocarCultosExtras(extras, colQuarta, colDomingoManha);
    colQuarta = alocado.quarta;
    colDomingoManha = alocado.domingoManha;
  }

  return {
    faixas: [
      {
        id: "domingo-manha",
        titulo: "Domingo Manhã",
        colunas: colDomingoManha,
      },
      {
        id: "domingo-noite",
        titulo: "Domingo Noite",
        colunas: colDomingoNoite,
      },
      {
        id: "quarta",
        titulo: "Quarta-feira",
        colunas: colQuarta,
      },
    ],
  };
}

export function colunasComData(faixas) {
  return faixas.flatMap((f) => f.colunas.filter(Boolean));
}

export function formatarCabecalhoData(dataObj) {
  if (!dataObj) return "";
  const [, mes, dia] = dataObj.data.split("-");
  const diaMes = `${dia}/${mes}`;
  if (dataObj.tipo === "quarta") return `QUA ${diaMes}`;
  if (dataObj.turno === "manhã") return `DOM ${diaMes}`;
  if (dataObj.turno === "noite") return `DOM ${diaMes}`;
  if (dataObj.tipo === "extra" && dataObj.descricao) {
    return dataObj.descricao.toUpperCase().slice(0, 12);
  }
  return diaMes;
}
