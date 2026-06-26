// Mapeamento abreviação ↔ função por ministério (grid planilha)

import { funcoesPorMinisterio } from "../data/funcoes";
import { ministerioPermiteEscalaFlexivel } from "./regrasMinisterio";

const MAPA = {
  infantil: {
    B: "BERÇÁRIO",
    M: "MATERNAL",
    J: "JUNIORES",
  },
  louvor: {
    M: "MINISTRANTE",
    BV1: "BVOCAL 1",
    BV2: "BVOCAL 2",
    BV3: "BVOCAL 3",
    BV4: "BVOCAL 4",
    MS1: "MÚSICO 1",
    MS2: "MÚSICO 2",
    MS3: "MÚSICO 3",
    MS4: "MÚSICO 4",
  },
  comunicacao: {
    P: "PROJEÇÃO",
    S: "MESA DE SOM",
    T: "TRANSMISSÃO",
  },
  recepcao: {
    I1: "INTRODUTOR(A) 1",
    I2: "INTRODUTOR(A) 2",
    I3: "INTRODUTOR(A) 3",
  },
};

const DIAS_ABREV = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

/** Mesmas cores dos grids por função (azul / verde / amarelo) */
export const CORES_FUNCAO = {
  azul: "#60a5fa",
  verde: "#34d399",
  amarelo: "#f59e0b",
};

const COR_POR_ABREV = {
  infantil: { B: "azul", M: "verde", J: "amarelo" },
  louvor: {
    M: "azul",
    BV1: "verde",
    BV2: "verde",
    BV3: "verde",
    BV4: "verde",
    MS1: "amarelo",
    MS2: "amarelo",
    MS3: "amarelo",
    MS4: "amarelo",
  },
  comunicacao: { P: "azul", S: "verde", T: "amarelo" },
  recepcao: { I1: "azul", I2: "verde", I3: "amarelo" },
};

const TOOLTIP_POR_ABREV = {
  infantil: { B: "Berçário", M: "Maternal", J: "Juniores" },
  louvor: {
    M: "Ministrante",
    BV1: "Back Vocal 1",
    BV2: "Back Vocal 2",
    BV3: "Back Vocal 3",
    BV4: "Back Vocal 4",
    MS1: "Músico 1",
    MS2: "Músico 2",
    MS3: "Músico 3",
    MS4: "Músico 4",
  },
  comunicacao: { P: "Projeção", S: "Som", T: "Transmissão" },
  recepcao: {
    I1: "Introdutor(a) 1",
    I2: "Introdutor(a) 2",
    I3: "Introdutor(a) 3",
  },
};

export function getTomAbrev(ministerioId, abrev) {
  if (!abrev || !ministerioId) return null;
  return COR_POR_ABREV[ministerioId]?.[abrev.trim().toUpperCase()] ?? null;
}

export function getCorAbrev(ministerioId, abrev) {
  const tom = getTomAbrev(ministerioId, abrev);
  return tom ? CORES_FUNCAO[tom] : null;
}

const BADGE_EXPORT_LIGHT = {
  azul: { color: "#1d4ed8", background: "rgba(29, 78, 216, 0.12)" },
  verde: { color: "#047857", background: "rgba(4, 120, 87, 0.12)" },
  amarelo: { color: "#b45309", background: "rgba(180, 83, 9, 0.12)" },
};

/** Estilos inline para badge em exportação (paleta light fixa) */
export function estiloBadgeAbrevExport(ministerioId, abrev) {
  const tom = getTomAbrev(ministerioId, abrev);
  if (!tom) return "";
  const { color, background } = BADGE_EXPORT_LIGHT[tom];
  return [
    "display:inline-flex",
    "align-items:center",
    "justify-content:center",
    "border-radius:6px",
    "padding:2px 8px",
    "font-size:12px",
    "font-weight:700",
    "font-family:'JetBrains Mono',monospace",
    "line-height:1.2",
    `color:${color}`,
    `background:${background}`,
  ].join(";");
}

export function getTooltipAbrev(ministerioId, abrev) {
  if (!abrev || !ministerioId) return "";
  return TOOLTIP_POR_ABREV[ministerioId]?.[abrev.trim().toUpperCase()] ?? "";
}

export function abrevParaFuncao(ministerioId, abrev) {
  if (!abrev || !ministerioId) return null;
  const normalizado = abrev.trim().toUpperCase();
  return MAPA[ministerioId]?.[normalizado] ?? null;
}

function chaveFuncaoComparacao(funcao) {
  return String(funcao)
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/** Normaliza função gravada no Firestore (abreviação ou variação de acento) para o nome canônico. */
export function canonicalizarFuncaoEscala(ministerioId, funcao) {
  if (!funcao || !ministerioId) return funcao;
  const fromAbrev = abrevParaFuncao(ministerioId, funcao);
  if (fromAbrev) return fromAbrev;
  const funcoes = funcoesPorMinisterio[ministerioId] || [];
  const alvo = chaveFuncaoComparacao(funcao);
  const match = funcoes.find((f) => chaveFuncaoComparacao(f) === alvo);
  return match || String(funcao).trim();
}

export function funcaoParaAbrev(ministerioId, funcao) {
  if (!funcao || !ministerioId) return "";
  const mapa = MAPA[ministerioId];
  if (!mapa) return "";
  const entrada = Object.entries(mapa).find(([, f]) => f === funcao);
  return entrada ? entrada[0] : "";
}

export function abreviacoesValidas(ministerioId) {
  return Object.keys(MAPA[ministerioId] || {});
}

/** Comunicação: "PST" → ["P","S","T"]; demais ministérios: uma sigla ou vazio */
export function parseAbreviacoesCombinadas(ministerioId, valor) {
  const normalizado = (valor || "").trim().toUpperCase();
  if (!normalizado) return [];

  if (!ministerioPermiteEscalaFlexivel(ministerioId)) {
    return abrevParaFuncao(ministerioId, normalizado) ? [normalizado] : [];
  }

  const validas = abreviacoesValidas(ministerioId);
  const validasSet = new Set(validas);
  const seen = new Set();

  for (const ch of normalizado) {
    if (!validasSet.has(ch)) return [];
    seen.add(ch);
  }

  return validas.filter((a) => seen.has(a));
}

/** Ordem canônica das siglas na célula (ex.: PST, não TSP) */
export function formatarAbreviacoesCombinadas(ministerioId, abrevs) {
  if (!abrevs?.length) return "";
  if (!ministerioPermiteEscalaFlexivel(ministerioId)) {
    return abrevs[0] || "";
  }
  const validas = abreviacoesValidas(ministerioId);
  return validas.filter((a) => abrevs.includes(a)).join("");
}

function cellKeyPlanilha(pessoa, colId) {
  return `${pessoa.toLowerCase()}|${colId}`;
}

/** Monta mapa célula → sigla(s) a partir do estado das escalas */
export function buildCellsFromEscalas(escalas, datas, ministerioId) {
  const cells = {};
  const funcoes = funcoesPorMinisterio[ministerioId] || [];
  for (const dataObj of datas) {
    const turnoKey = dataObj.turno || "único";
    for (const funcao of funcoes) {
      const pessoaNome = escalas[`${dataObj.data}-${turnoKey}-${funcao}`];
      if (!pessoaNome || pessoaNome === "disponível") continue;
      const abrev = funcaoParaAbrev(ministerioId, funcao);
      if (!abrev) continue;
      const key = cellKeyPlanilha(pessoaNome, dataObj.id);
      if (ministerioPermiteEscalaFlexivel(ministerioId)) {
        const prev = cells[key] ? parseAbreviacoesCombinadas(ministerioId, cells[key]) : [];
        cells[key] = formatarAbreviacoesCombinadas(ministerioId, [...prev, abrev]);
      } else {
        cells[key] = abrev;
      }
    }
  }
  return cells;
}

export function getTooltipAbrevCombinadas(ministerioId, valor) {
  const abrevs = parseAbreviacoesCombinadas(ministerioId, valor);
  if (!abrevs.length) return "";
  return abrevs.map((a) => getTooltipAbrev(ministerioId, a)).filter(Boolean).join(" · ");
}

export function formatarCabecalhoColuna(dataObj) {
  const [ano, mes, dia] = dataObj.data.split("-");
  const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
  const diaSem = DIAS_ABREV[data.getDay()];
  const ddmm = `${dia}/${mes}`;
  const descricao = dataObj.descricao ? ` (${dataObj.descricao.toUpperCase()})` : "";
  const base = `${diaSem}, ${ddmm}${descricao}`;

  if (dataObj.turno === "manhã") return `${base} (M)`;
  if (dataObj.turno === "noite") return `${base} (N)`;
  return base;
}
