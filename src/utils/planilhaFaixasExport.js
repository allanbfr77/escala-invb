import {
  montarFaixasPlanilha,
  formatarCabecalhoData,
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

function corFuncaoExport(ministerioId, funcao, fallback) {
  const config = getConfigPlanilhaMinisterio(ministerioId);
  const grupo = config?.grupoCorObreiro(funcao) || "";
  return CORES_GRUPO_FUNCAO_EXPORT[grupo] || fallback;
}

function turnoSalvo(dataObj) {
  return dataObj?.turno === "único" ? "único" : dataObj?.turno;
}

function escalaKey(dataObj, funcao) {
  return `${dataObj.data}-${turnoSalvo(dataObj)}-${funcao}`;
}

function valorCelulaExport(escalas, dataObj, funcao, LT) {
  const raw = escalas[escalaKey(dataObj, funcao)];
  if (!raw || raw === "disponível") {
    const cor = raw === "disponível" ? LT.slotDisponivel : LT.textDim;
    return { html: "—", bg: LT.cellEmpty, color: cor };
  }
  return { html: nomeParaExibicao(raw), bg: LT.surface, color: LT.text };
}

function buildBlocoFaixaHTML(faixa, { ministerioId, funcoes, escalas, LT, thBase, cellBorder }) {
  const st = FAIXA_EXPORT[faixa.id] || FAIXA_EXPORT["domingo-manha"];
  const colunasAtivas = faixa.colunas.filter(Boolean);
  const titulo = faixa.titulo.toUpperCase();

  let thead = `<tr><th style="${thBase}padding:10px 8px;text-align:center;vertical-align:middle;min-width:96px;background:${LT.surface};color:${LT.textMuted};font-size:9px;">FUNÇÃO</th>`;
  for (const dataObj of colunasAtivas) {
    thead += `<th style="${thBase}padding:6px 8px;text-align:center;font-size:9px;font-weight:500;background:${st.dataBg};color:${st.dataFg};min-width:72px;">${formatarCabecalhoData(dataObj)}</th>`;
  }
  thead += "</tr>";

  let tbody = "";
  funcoes.forEach((funcao, rowIdx) => {
    const rowBg = rowIdx % 2 === 0 ? LT.surface : LT.zebra;
    const corFuncao = corFuncaoExport(ministerioId, funcao, LT.text);
    tbody += `<tr style="background:${rowBg};">`;
    tbody += `<td style="${cellBorder}padding:7px 8px;text-align:center;vertical-align:middle;font-size:9px;font-weight:700;color:${corFuncao};font-family:'Outfit',sans-serif;white-space:nowrap;background:${rowBg};">${funcao}</td>`;

    for (const dataObj of colunasAtivas) {
      const cel = valorCelulaExport(escalas, dataObj, funcao, LT);
      tbody += `<td style="${cellBorder}padding:6px 8px;text-align:center;vertical-align:middle;background:${rowBg};">
        <span style="font-size:10px;font-weight:500;color:${cel.color};font-family:'Outfit',sans-serif;white-space:nowrap;">${cel.html}</span>
      </td>`;
    }
    tbody += "</tr>";
  });

  return `
    <section style="margin-bottom:22px;">
      <div style="font-family:'Outfit',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.5px;
        text-transform:uppercase;color:${st.headerFg};background:${st.headerBg};
        border:1px solid ${st.headerBorder};border-bottom:none;
        padding:10px 14px;border-radius:10px 10px 0 0;">
        ${titulo}
      </div>
      <div style="border-radius:0 0 10px 10px;border:1px solid ${st.headerBorder};border-top:none;
        background:${LT.surface};overflow:hidden;">
        <table style="border-collapse:collapse;font-size:13px;width:100%;">
          <thead>${thead}</thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>
    </section>
  `;
}

/**
 * Gera HTML da planilha para download: blocos empilhados (Domingo Manhã → Domingo Noite → Quarta).
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

  const blocos = faixas.map((faixa) =>
    buildBlocoFaixaHTML(faixa, {
      ministerioId,
      funcoes,
      escalas,
      LT,
      thBase,
      cellBorder,
    })
  );

  return `
    <div style="display:flex;flex-direction:column;gap:0;width:100%;max-width:720px;">
      ${blocos.join("")}
    </div>
  `;
}
