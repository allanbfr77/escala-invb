import { turnoSalvoEscala } from "./escalaDisponibilidade";
import { pessoaNomeFirestore } from "./nomeExibicao";
import { chaveIndisponibilidadeColuna } from "./indisponibilidadeHelpers";
import { NOMES_MINISTERIOS } from "./planilhaMinisterioConfig";

/** Chave única: pessoaLower|data|turno */
export function chaveEscalaCruzada(pessoaNome, data, turno) {
  const pl =
    typeof pessoaNome === "string"
      ? pessoaNomeFirestore(pessoaNome)
      : pessoaNome;
  const turnoNorm = turno ?? "único";
  return `${pl}|${data}|${turnoNorm}`;
}

/**
 * Monta mapa pessoa|data|turno → { ministerioId, funcao, criadoEm }.
 * Se houver duplicata (edge case), prevalece quem escalou primeiro (criadoEm).
 */
export function montarMapaEscalasCruzadas(docs, pessoasLowerSet) {
  const map = new Map();

  for (const docSnap of docs || []) {
    const d = docSnap.data?.() ?? docSnap;
    if (!d?.pessoaNome || !d?.data) continue;
    if (pessoasLowerSet && !pessoasLowerSet.has(d.pessoaNome)) continue;

    const turno = turnoSalvoEscala({ turno: d.turno });
    const key = chaveEscalaCruzada(d.pessoaNome, d.data, turno);
    const entry = {
      ministerioId: d.ministerioId,
      funcao: d.funcao,
      criadoEm: d.criadoEm || "",
    };

    const atual = map.get(key);
    if (!atual) {
      map.set(key, entry);
      continue;
    }

    if (entry.criadoEm && (!atual.criadoEm || entry.criadoEm < atual.criadoEm)) {
      map.set(key, entry);
    }
  }

  return map;
}

/** Escala em outro ministério no mesmo culto (null se livre ou escalada aqui). */
export function getEscalaExterna(mapa, ministerioIdAtual, pessoaNome, dataObj) {
  if (!mapa?.size || !ministerioIdAtual || !dataObj || !pessoaNome) return null;

  const turno = turnoSalvoEscala(dataObj);
  const key = chaveEscalaCruzada(pessoaNome, dataObj.data, turno);
  const entry = mapa.get(key);
  if (!entry || entry.ministerioId === ministerioIdAtual) return null;
  return entry;
}

export function pessoaEscaladaEmOutroMinisterioNoCulto(
  mapa,
  ministerioIdAtual,
  pessoaNome,
  dataObj
) {
  return !!getEscalaExterna(mapa, ministerioIdAtual, pessoaNome, dataObj);
}

export const ABREV_MINISTERIOS_INDISP = {
  infantil: "Min. Infantil",
  louvor: "Min. Louvor",
  comunicacao: "Min. Comunicações",
  recepcao: "Min. Introdução",
};

export function abrevMinisterioIndisp(ministerioId) {
  if (!ministerioId) return "";
  return ABREV_MINISTERIOS_INDISP[ministerioId] || NOMES_MINISTERIOS[ministerioId] || ministerioId;
}

export function nomeMinisterioEscalaExterna(entry) {
  if (!entry?.ministerioId) return "";
  return NOMES_MINISTERIOS[entry.ministerioId] || entry.ministerioId;
}

/** Conta bloqueios manuais e escalas externas separadamente no mês. */
export function contarResumoBloqueiosIndisponibilidade(
  indisponiveisSet,
  datas,
  mapaEscalasCruzadas,
  ministerioId,
  pessoaNome
) {
  let manual = 0;
  let externo = 0;

  if (!datas?.length) {
    return { manual: 0, externo: 0, total: 0 };
  }

  for (const d of datas) {
    const chave = chaveIndisponibilidadeColuna(d);
    if (indisponiveisSet?.has(chave)) manual++;
    if (getEscalaExterna(mapaEscalasCruzadas, ministerioId, pessoaNome, d)) externo++;
  }

  return { manual, externo, total: manual + externo };
}

/** Conta bloqueios manuais + escalas em outros ministérios no mês. */
export function contarBloqueiosIndisponibilidade(
  indisponiveisSet,
  datas,
  mapaEscalasCruzadas,
  ministerioId,
  pessoaNome
) {
  const { total } = contarResumoBloqueiosIndisponibilidade(
    indisponiveisSet,
    datas,
    mapaEscalasCruzadas,
    ministerioId,
    pessoaNome
  );
  return total;
}
