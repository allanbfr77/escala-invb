import { funcoesPorMinisterio } from "../data/funcoes";
import { canonicalizarFuncaoEscala } from "./gridAbreviacoes";
import { ministerioPermiteEscalaFlexivel } from "./regrasMinisterio";
import { pessoaNomeFirestore } from "./nomeExibicao";

/** Normaliza turno gravado ou exibido para a chave do mapa de escalas. */
function normalizarTurnoCanonico(turno) {
  if (turno == null || turno === "" || turno === "único") return "único";
  const folded = String(turno)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  if (folded === "manha") return "manhã";
  if (folded === "noite") return "noite";
  return turno;
}

/** Turno persistido no mapa de escalas (alinhado a PlanilhaMinisterio / Sidebar). */
export function turnoSalvoEscala(dataObj) {
  return normalizarTurnoCanonico(dataObj?.turno);
}

export function chaveSlotEscala(dataObj, funcao) {
  const turno = turnoSalvoEscala(dataObj);
  return `${dataObj.data}-${turno}-${funcao}`;
}

/** Interpreta chave do mapa de escalas (data-turno-funcao). */
export function parseChaveEscala(chave, ministerioId) {
  if (!chave || chave.length < 12) return null;
  const data = chave.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;

  const funcoes = funcoesPorMinisterio[ministerioId] || [];
  const rest = chave.slice(11);
  const ordenadas = [...funcoes].sort((a, b) => b.length - a.length);

  for (const funcao of ordenadas) {
    const sufixo = `-${funcao}`;
    if (!rest.endsWith(sufixo)) continue;
    const turno = rest.slice(0, -sufixo.length);
    return {
      data,
      turno: normalizarTurnoCanonico(turno),
      funcao,
    };
  }

  const separador = rest.indexOf("-");
  if (separador === -1) return null;
  const turno = rest.slice(0, separador);
  const funcaoRaw = rest.slice(separador + 1);
  if (!funcaoRaw) return null;

  return {
    data,
    turno: normalizarTurnoCanonico(turno),
    funcao: canonicalizarFuncaoEscala(ministerioId, funcaoRaw),
  };
}

export function encontrarDataObjNasDatas(datas, data, turnoKey) {
  const exato = datas.find((dt) => dt.data === data && turnoSalvoEscala(dt) === turnoKey);
  if (exato) return exato;
  const porData = datas.filter((dt) => dt.data === data);
  if (porData.length === 1) return porData[0];
  return null;
}

/**
 * Voluntário já escalado neste culto (data + turno) no mesmo ministério.
 * Ministérios flexíveis (comunicação): só oculta em outras funções, não na atual.
 * Outros ministérios: qualquer função/sala no mesmo culto oculta a pessoa.
 */
export function pessoaJaEscaladaNoMesmoMinisterioNoCulto({
  escalas,
  ministerioId,
  dataObj,
  pessoaNome,
  funcaoAtual = null,
}) {
  if (!escalas || !ministerioId || !dataObj || !pessoaNome) return false;

  const pl = pessoaNomeFirestore(pessoaNome);
  if (pl === "disponível") return false;

  const funcoes = funcoesPorMinisterio[ministerioId] || [];
  const turno = turnoSalvoEscala(dataObj);
  const flexivel = ministerioPermiteEscalaFlexivel(ministerioId);

  return funcoes.some((funcao) => {
    if (flexivel && funcao === funcaoAtual) return false;
    const ocupante = escalas[`${dataObj.data}-${turno}-${funcao}`];
    return (
      ocupante &&
      ocupante !== "disponível" &&
      pessoaNomeFirestore(ocupante) === pl
    );
  });
}

/**
 * Filtra nomes exibíveis no select/checkbox, mantendo indisponibilidade opcional.
 */
export function filtrarPessoasDisponiveisNoCulto(
  pessoas,
  { escalas, ministerioId, dataObj, funcaoAtual, pessoaIndisponivel }
) {
  return (pessoas || []).filter((nome) => {
    if (pessoaIndisponivel?.(nome, dataObj)) return false;
    if (
      pessoaJaEscaladaNoMesmoMinisterioNoCulto({
        escalas,
        ministerioId,
        dataObj,
        pessoaNome: nome,
        funcaoAtual,
      })
    ) {
      return false;
    }
    return true;
  });
}
