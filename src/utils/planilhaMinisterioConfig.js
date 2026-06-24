import { funcoesPorMinisterio } from "../data/funcoes";
import {
  pessoasPorFuncaoLouvor,
  pessoasPorFuncaoComunicacao,
  pessoasPorFuncaoRecepcao,
  pessoasPorFuncaoInfantil,
} from "../data/pessoas";

export const NOMES_MINISTERIOS = {
  comunicacao: "Comunicações",
  louvor: "Louvor",
  recepcao: "Introdução",
  infantil: "Infantil",
};

/** Ministérios que usam a planilha em faixas (substitui DashboardGrid). */
export const MINISTERIOS_PLANILHA_FAIXAS = ["louvor", "comunicacao", "recepcao", "infantil"];

function getPessoasIntroducaoPorFuncao(funcao) {
  if (funcao === "INTRODUTOR(A) 1") {
    return pessoasPorFuncaoRecepcao.INTRODUTOR || [];
  }
  if (funcao === "INTRODUTOR(A) 2" || funcao === "INTRODUTOR(A) 3") {
    return pessoasPorFuncaoRecepcao.INTRODUTORA || [];
  }
  return [];
}

const CONFIG = {
  louvor: {
    labelCarregando: "louvor",
    getPessoasPorFuncao: (funcao) => pessoasPorFuncaoLouvor[funcao] || [],
    grupoCorObreiro: (funcao) => {
      if (funcao === "MINISTRANTE") return "ministrante";
      if (funcao.startsWith("BVOCAL")) return "bvocal";
      if (funcao.startsWith("MÚSICO")) return "musico";
      return "";
    },
  },
  comunicacao: {
    labelCarregando: "comunicações",
    getPessoasPorFuncao: (funcao) => pessoasPorFuncaoComunicacao[funcao] || [],
    grupoCorObreiro: (funcao) => {
      if (funcao === "PROJEÇÃO") return "projecao";
      if (funcao === "MESA DE SOM") return "mesa-som";
      if (funcao === "TRANSMISSÃO") return "transmissao";
      return "";
    },
  },
  recepcao: {
    labelCarregando: "introdução",
    getPessoasPorFuncao: getPessoasIntroducaoPorFuncao,
    grupoCorObreiro: (funcao) => {
      if (funcao === "INTRODUTOR(A) 1") return "intro-1";
      if (funcao === "INTRODUTOR(A) 2") return "intro-2";
      if (funcao === "INTRODUTOR(A) 3") return "intro-3";
      return "";
    },
  },
  infantil: {
    labelCarregando: "infantil",
    getPessoasPorFuncao: (funcao) => pessoasPorFuncaoInfantil[funcao] || [],
    grupoCorObreiro: (funcao) => {
      if (funcao === "BERÇÁRIO") return "ministrante";
      if (funcao === "MATERNAL") return "bvocal";
      if (funcao === "JUNIORES") return "musico";
      return "";
    },
  },
};

export function ministerioUsaPlanilhaFaixas(ministerioId) {
  return MINISTERIOS_PLANILHA_FAIXAS.includes(ministerioId);
}

export function ministerioTemConfigPlanilhaFaixas(ministerioId) {
  return !!CONFIG[ministerioId];
}

export function getConfigPlanilhaMinisterio(ministerioId) {
  return CONFIG[ministerioId] || null;
}

export function getFuncoesPlanilha(ministerioId) {
  return funcoesPorMinisterio[ministerioId] || [];
}
