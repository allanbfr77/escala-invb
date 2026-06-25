import { funcoesPorMinisterio } from "../data/funcoes";
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
