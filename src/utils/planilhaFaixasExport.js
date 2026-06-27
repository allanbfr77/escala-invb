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

const SVG_SOL = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;

const SVG_LUA = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

/** Tipografia da planilha exportada (900×1200 — retrato, legível no celular). */
const EXPORT_FONT = {
  faixaTitulo: 22,
  thFuncao: 17,
  thData: 17,
  tdFuncao: 16,
  celula: 20,
};

function largurasColunasExport(numDatas) {
  const funcPct = numDatas >= 4 ? 20 : 24;
  const dataPct = numDatas > 0 ? (100 - funcPct) / numDatas : 0;
  return { funcPct, dataPct };
}

function buildColgroupHTML(numDatas) {
  const { funcPct, dataPct } = largurasColunasExport(numDatas);
  let html = `<colgroup><col style="width:${funcPct}%;" />`;
  for (let i = 0; i < numDatas; i++) {
    html += `<col style="width:${dataPct}%;" />`;
  }
  html += "</colgroup>";
  return html;
}

function iconeFaixaExport(faixaId) {
  if (faixaId === "domingo-manha") return SVG_SOL;
  if (faixaId === "domingo-noite") return SVG_LUA;
  return "";
}

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

const COR_DISPONIVEL_LOUVOR_EXPORT = "#DC2626";

function corDisponivelExport(ministerioId, LT) {
  if (ministerioId === "louvor") return COR_DISPONIVEL_LOUVOR_EXPORT;
  return LT.slotDisponivel;
}

function valorCelulaExport(escalas, dataObj, funcao, LT, ministerioId) {
  const raw = escalas[escalaKey(dataObj, funcao)];
  if (!raw) {
    return { html: "—", bg: LT.cellEmpty, color: LT.textDim };
  }
  if (raw === "disponível") {
    return {
      html: nomeParaExibicao(raw),
      bg: LT.surface,
      color: corDisponivelExport(ministerioId, LT),
    };
  }
  return { html: nomeParaExibicao(raw), bg: LT.surface, color: LT.text };
}

/** Espaço vertical entre blocos (faixas) na exportação. */
const EXPORT_FAIXA_RESPIRO = 22;

function buildFaixaDividerHTML(LT) {
  const cor = LT.dividerFaixa || "#94A3B8";
  return `
    <div role="presentation" aria-hidden="true"
      style="width:100%;background:${LT.bg};padding:${EXPORT_FAIXA_RESPIRO}px 0;">
      <div style="border:none;border-top:2px solid ${cor};width:100%;opacity:0.9;"></div>
    </div>
  `;
}

function buildBlocoFaixaHTML(faixa, { ministerioId, funcoes, escalas, LT, thBase, cellBorder }) {
  const colunasAtivas = faixa.colunas.filter(Boolean);
  const titulo = faixa.titulo.toUpperCase();
  const icone = iconeFaixaExport(faixa.id);

  const numDatas = colunasAtivas.length;
  const colgroup = buildColgroupHTML(numDatas);

  let thead = `<tr><th style="${thBase}padding:12px 8px;text-align:center;vertical-align:middle;background:${LT.surface};color:${LT.text};font-size:${EXPORT_FONT.thFuncao}px;">FUNÇÃO</th>`;
  for (const dataObj of colunasAtivas) {
    thead += `<th style="${thBase}padding:10px 6px;text-align:center;font-size:${EXPORT_FONT.thData}px;font-weight:600;background:${LT.surface};color:${LT.text};">${formatarCabecalhoData(dataObj)}</th>`;
  }
  thead += "</tr>";

  let tbody = "";
  funcoes.forEach((funcao) => {
    const corFuncao = corFuncaoExport(ministerioId, funcao, LT.text);
    tbody += `<tr>`;
    tbody += `<td style="${cellBorder}padding:10px 6px;text-align:center;vertical-align:middle;font-size:${EXPORT_FONT.tdFuncao}px;font-weight:700;color:${corFuncao};font-family:'Outfit',sans-serif;word-break:break-word;line-height:1.25;background:${LT.surface};">${funcao}</td>`;

    for (const dataObj of colunasAtivas) {
      const cel = valorCelulaExport(escalas, dataObj, funcao, LT, ministerioId);
      tbody += `<td style="${cellBorder}padding:9px 6px;text-align:center;vertical-align:middle;background:${cel.bg};">
        <span style="font-size:${EXPORT_FONT.celula}px;font-weight:600;color:${cel.color};font-family:'Outfit',sans-serif;word-break:break-word;line-height:1.25;">${cel.html}</span>
      </td>`;
    }
    tbody += "</tr>";
  });

  return `
    <section style="display:block;margin:0;background:${LT.bg};">
      <div style="font-family:'Outfit',sans-serif;font-size:${EXPORT_FONT.faixaTitulo}px;font-weight:700;letter-spacing:0.5px;
        text-transform:uppercase;color:${LT.text};background:${LT.surface};
        border:1px solid ${LT.border};border-bottom:none;
        padding:14px 16px;border-radius:12px 12px 0 0;
        display:flex;align-items:center;justify-content:center;gap:10px;">
        ${icone}
        <span>${titulo}</span>
      </div>
      <div style="border-radius:0 0 12px 12px;border:1px solid ${LT.border};border-top:none;
        background:${LT.surface};overflow:hidden;margin-bottom:2px;">
        <table style="border-collapse:collapse;width:100%;table-layout:fixed;">
          ${colgroup}
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

  const blocosHtml = blocos
    .map((html, idx) => (idx === 0 ? html : buildFaixaDividerHTML(LT) + html))
    .join("");

  return `
    <div style="display:flex;flex-direction:column;gap:0;width:100%;padding-bottom:4px;">
      ${blocosHtml}
    </div>
  `;
}
