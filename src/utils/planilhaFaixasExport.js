import {
  montarFaixasPlanilha,
  formatarCabecalhoData,
  COLUNAS_POR_FAIXA,
} from "./planilhaFaixasLayout";
import { nomeParaExibicao } from "./nomeExibicao";
import { getConfigPlanilhaMinisterio } from "./planilhaMinisterioConfig";

/** Cores de função no export (tema claro — alinhado à planilha na tela). */
const CORES_GRUPO_FUNCAO_EXPORT = {
  ministrante: "#2563eb",
  bvocal: "#059669",
  musico: "#ea580c",
  projecao: "#2563eb",
  "mesa-som": "#059669",
  transmissao: "#ea580c",
  "intro-1": "#2563eb",
  "intro-2": "#059669",
  "intro-3": "#ea580c",
};

function corFuncaoExport(ministerioId, funcao, fallback) {
  const config = getConfigPlanilhaMinisterio(ministerioId);
  const grupo = config?.grupoCorObreiro(funcao) || "";
  return CORES_GRUPO_FUNCAO_EXPORT[grupo] || fallback;
}

const FAIXA_EXPORT = {
  "domingo-manha": {
    headerBg: "rgba(180, 83, 9, 0.14)",
    headerFg: "#92400e",
    headerBorder: "rgba(180, 83, 9, 0.35)",
    dataBg: "rgba(180, 83, 9, 0.06)",
    dataFg: "#92400e",
  },
  "domingo-noite": {
    headerBg: "rgba(29, 78, 216, 0.12)",
    headerFg: "#1e40af",
    headerBorder: "rgba(29, 78, 216, 0.32)",
    dataBg: "rgba(29, 78, 216, 0.05)",
    dataFg: "#1e40af",
  },
  quarta: {
    headerBg: "rgba(4, 120, 87, 0.12)",
    headerFg: "#047857",
    headerBorder: "rgba(4, 120, 87, 0.32)",
    dataBg: "rgba(4, 120, 87, 0.05)",
    dataFg: "#047857",
  },
};

function turnoSalvo(dataObj) {
  return dataObj?.turno === "único" ? "único" : dataObj?.turno;
}

function escalaKey(dataObj, funcao) {
  return `${dataObj.data}-${turnoSalvo(dataObj)}-${funcao}`;
}

function valorCelulaExport(escalas, dataObj, funcao, LT) {
  if (!dataObj) {
    return { html: "", bg: LT.cellEmpty };
  }
  const raw = escalas[escalaKey(dataObj, funcao)];
  if (!raw || raw === "disponível") {
    const cor = raw === "disponível" ? LT.slotDisponivel : LT.textDim;
    return { html: "—", bg: LT.cellEmpty, color: cor };
  }
  return { html: nomeParaExibicao(raw), bg: LT.surface, color: LT.text };
}

/**
 * Gera HTML da tabela no layout da planilha por faixas (funções × turnos/datas).
 */
export function buildPlanilhaFaixasTableHTML({
  ministerioId,
  datas,
  funcoes,
  escalas,
  LT,
}) {
  const { faixas } = montarFaixasPlanilha(datas);
  const divider = LT.border;

  const thBase = `font-family:'Outfit',sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:0.35px;border:1px solid ${divider};`;
  const cellBorder = `border:1px solid ${divider};`;

  let thead = "<thead>";

  thead += `<tr><th rowspan="2" style="${thBase}padding:10px 8px;text-align:center;vertical-align:middle;min-width:96px;background:${LT.surface};color:${LT.textMuted};font-size:9px;">FUNÇÃO</th>`;

  for (const faixa of faixas) {
    const st = FAIXA_EXPORT[faixa.id] || FAIXA_EXPORT["domingo-manha"];
    thead += `<th colspan="${COLUNAS_POR_FAIXA}" style="${thBase}padding:8px 4px;text-align:center;font-size:9px;background:${st.headerBg};color:${st.headerFg};border-bottom:2px solid ${st.headerBorder};">${faixa.titulo.toUpperCase()}</th>`;
  }
  thead += "</tr><tr>";

  for (const faixa of faixas) {
    const st = FAIXA_EXPORT[faixa.id] || FAIXA_EXPORT["domingo-manha"];
    faixa.colunas.forEach((dataObj, colIdx) => {
      const inicioFaixa = colIdx === 0 && faixa.id !== "domingo-manha";
      const borderLeft = inicioFaixa ? `border-left:2px solid ${st.headerBorder};` : "";
      if (!dataObj) {
        thead += `<th style="${thBase}padding:6px 4px;min-width:8px;max-width:12px;background:${LT.cellEmpty};${borderLeft}"></th>`;
        return;
      }
      thead += `<th style="${thBase}padding:6px 5px;text-align:center;font-size:9px;font-weight:500;background:${st.dataBg};color:${st.dataFg};${borderLeft}">${formatarCabecalhoData(dataObj)}</th>`;
    });
  }
  thead += "</tr></thead>";

  let tbody = "<tbody>";
  funcoes.forEach((funcao, rowIdx) => {
    const rowBg = rowIdx % 2 === 0 ? LT.surface : LT.zebra;
    tbody += `<tr style="background:${rowBg};">`;
    const corFuncao = corFuncaoExport(ministerioId, funcao, LT.text);
    tbody += `<td style="${cellBorder}padding:7px 6px;text-align:center;vertical-align:middle;font-size:9px;font-weight:700;color:${corFuncao};font-family:'Outfit',sans-serif;white-space:nowrap;background:${rowBg};">${funcao}</td>`;

    for (const faixa of faixas) {
      const st = FAIXA_EXPORT[faixa.id] || FAIXA_EXPORT["domingo-manha"];
      faixa.colunas.forEach((dataObj, colIdx) => {
        const inicioFaixa = colIdx === 0 && faixa.id !== "domingo-manha";
        const borderLeft = inicioFaixa ? `border-left:2px solid ${st.headerBorder};` : "";
        if (!dataObj) {
          tbody += `<td style="${cellBorder}padding:4px;background:${LT.cellEmpty};min-width:8px;${borderLeft}"></td>`;
          return;
        }
        const cel = valorCelulaExport(escalas, dataObj, funcao, LT);
        tbody += `<td style="${cellBorder}padding:6px 4px;text-align:center;vertical-align:middle;background:${rowBg};${borderLeft}">
          <span style="font-size:10px;font-weight:500;color:${cel.color};font-family:'Outfit',sans-serif;white-space:nowrap;">${cel.html}</span>
        </td>`;
      });
    }
    tbody += "</tr>";
  });
  tbody += "</tbody>";

  return `
    <div style="border-radius:10px;border:1px solid ${divider};background:${LT.surface};overflow:hidden;">
      <table style="border-collapse:collapse;font-size:13px;width:100%;">
        ${thead}
        ${tbody}
      </table>
    </div>
  `;
}
