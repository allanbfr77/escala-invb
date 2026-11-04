import { formatarData } from "./dateHelper";
import { chaveSlotEscala } from "./escalaDisponibilidade";
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

/** Par que não deve dividir o mesmo culto (data + turno) no Infantil. */
const PAR_ALAN_BIANCA = {
  alan: "BIANCA",
  bianca: "ALAN",
};

/**
 * Cultos em que o par de ALAN/BIANCA já está no mesmo turno.
 * Ignora a função que está sendo gravada: substituir a pessoa naquela vaga não deixa os dois juntos.
 */
export function listarConflitosAlanBiancaNoTurno(
  pessoaLower,
  datasNovas,
  escalasMap,
  funcaoIgnorar = null
) {
  const alvo = pessoaNomeFirestore(pessoaLower || "");
  const nomeParceiro = PAR_ALAN_BIANCA[alvo];
  if (!nomeParceiro) return [];

  const parceiroLower = pessoaNomeFirestore(nomeParceiro);
  const conflitos = [];

  for (const dataObj of datasNovas || []) {
    if (!dataObj?.data) continue;
    for (const funcao of FUNCOES_INFANTIL) {
      if (funcaoIgnorar && funcao === funcaoIgnorar) continue;
      const nome = escalasMap?.[chaveSlotEscala(dataObj, funcao)];
      if (nome && pessoaNomeFirestore(nome) === parceiroLower) {
        conflitos.push({ dataObj, funcao, nomeParceiro });
        break;
      }
    }
  }

  return conflitos;
}

export function mensagemAlertaAlanBianca(nomeInserido, conflitos) {
  const nomeParceiro = conflitos[0]?.nomeParceiro || "";
  const escalado = nomeParceiro === "ALAN" ? "escalado" : "escalada";
  const detalhes = conflitos
    .map((c) => {
      const label = formatarData(c.dataObj.data, c.dataObj.turno, c.dataObj.descricao);
      return `${label} — ${c.funcao}`;
    })
    .join("; ");
  const onde = conflitos.length > 1 ? "nestes cultos" : "neste culto";
  return [
    "A escala conjunta de ALAN e BIANCA influencia o Ministério de Comunicações.",
    `${nomeParceiro} já está ${escalado} ${onde}: ${detalhes}.`,
    `Deseja escalar ${nomeInserido} mesmo assim?`,
  ].join("\n\n");
}

/** Popup de confirmação. Sem conflito, ou sem modal disponível, segue a escala. */
export async function confirmarAlertaAlanBiancaSeHouver(pedirConfirmacao, nomeInserido, conflitos) {
  if (!conflitos?.length || !pedirConfirmacao) return true;
  return pedirConfirmacao({
    titulo: "ALAN e BIANCA no mesmo turno!",
    descricao: mensagemAlertaAlanBianca(nomeInserido, conflitos),
    confirmLabel: "Escalar mesmo assim",
    perigoso: true,
  });
}
