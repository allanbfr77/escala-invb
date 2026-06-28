import { pessoaNomeFirestore } from "./nomeExibicao";

export const MINISTERIO_INFANTIL_ID = "infantil";
const LIMITE_ESCALAS_INFANTIL_MES = 3;

const FUNCOES_INFANTIL = ["BERÇÁRIO", "MATERNAL", "JUNIORES"];

function cultoKey(data, turno) {
  return `${data}|${turno ?? "único"}`;
}

function dataPertenceAoMes(dataStr, mes) {
  return Boolean(dataStr && mes && dataStr.startsWith(`${mes}-`));
}

/** Cultos únicos (data + turno) em que a pessoa está escalada no Infantil no mês. */
export function contarCultosEscaladosInfantilNoMes(
  pessoaLower,
  mes,
  escalasMap,
  datasMes = []
) {
  const alvo = (pessoaLower || "").toLowerCase();
  if (!alvo || alvo === "disponível") return 0;

  return obterCultosEscaladosInfantilNoMes(alvo, mes, escalasMap, datasMes).size;
}

function obterCultosEscaladosInfantilNoMes(pessoaLower, mes, escalasMap, datasMes) {
  const cultos = new Set();

  for (const dataObj of datasMes) {
    if (!dataPertenceAoMes(dataObj.data, mes)) continue;
    const turno = dataObj.turno ?? "único";
    for (const funcao of FUNCOES_INFANTIL) {
      const nome = escalasMap?.[`${dataObj.data}-${turno}-${funcao}`];
      if (nome && pessoaNomeFirestore(nome) === pessoaLower) {
        cultos.add(cultoKey(dataObj.data, turno));
        break;
      }
    }
  }

  return cultos;
}

/**
 * true quando a pessoa já tem 3+ cultos no mês e a operação adiciona ao menos um culto novo.
 */
export function precisaConfirmarLimiteInfantil(
  pessoaLower,
  mes,
  escalasMap,
  datasNovas,
  datasMes = []
) {
  const alvo = (pessoaLower || "").toLowerCase();
  if (!alvo || alvo === "disponível") return false;

  const cultosAtuais = obterCultosEscaladosInfantilNoMes(alvo, mes, escalasMap, datasMes);
  if (cultosAtuais.size < LIMITE_ESCALAS_INFANTIL_MES) return false;

  return (datasNovas || []).some((dataObj) => {
    if (!dataObj?.data || !dataPertenceAoMes(dataObj.data, mes)) return false;
    return !cultosAtuais.has(cultoKey(dataObj.data, dataObj.turno));
  });
}

export function mensagemLimiteInfantil(nomeExibicao, cultosAtuais) {
  return `${nomeExibicao} já atingiu o limite de ${LIMITE_ESCALAS_INFANTIL_MES} escalas no Ministério Infantil neste mês (${cultosAtuais} confirmadas). Deseja confirmar mais uma escala mesmo assim?`;
}
