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

/** Mesmas cores dos grids por função (azul / verde / amarelo) */
const CORES_FUNCAO = {
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

export function getTooltipAbrev(ministerioId, abrev) {
  if (!abrev || !ministerioId) return "";
  return TOOLTIP_POR_ABREV[ministerioId]?.[abrev.trim().toUpperCase()] ?? "";
}

function abrevParaFuncao(ministerioId, abrev) {
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
