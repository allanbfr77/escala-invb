import { db } from "../firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { turnoSalvoEscala } from "./escalaDisponibilidade";
import { pessoaNomeFirestore } from "./nomeExibicao";
import { ministeriosDaPessoa } from "./ministeriosPorPessoa";

function docIdIndisponibilidade(ministerioId, pessoaNome) {
  const pl = pessoaNomeFirestore(pessoaNome);
  return `${ministerioId}_${pl.replace(/\s+/g, "_").replace(/\./g, "")}`;
}

function chaveIndisponibilidade(data, turno) {
  return `${data}|${turnoSalvoEscala({ turno })}`;
}

/**
 * Remove espelhos de indisponibilidade gravados por importação antiga
 * quando a escala de origem é removida em outro ministério.
 */
export async function removerIndisponibilidadeEspelhada({
  pessoaNome,
  data,
  turno,
  ministerioOrigem,
}) {
  const pl = pessoaNomeFirestore(pessoaNome);
  if (!pl || !data || !ministerioOrigem) return;

  const chave = chaveIndisponibilidade(data, turno);
  const ministerios = ministeriosDaPessoa(pl);

  await Promise.all(
    [...ministerios]
      .filter((mid) => mid !== ministerioOrigem)
      .map(async (ministerioId) => {
        const docRef = doc(db, "indisponibilidades", docIdIndisponibilidade(ministerioId, pl));
        const snap = await getDoc(docRef);
        if (!snap.exists()) return;

        const atual = new Set(snap.data().datas || []);
        if (!atual.has(chave)) return;

        atual.delete(chave);
        if (atual.size === 0) {
          await deleteDoc(docRef);
        } else {
          await setDoc(docRef, {
            ministerioId,
            pessoaNome: pl,
            datas: [...atual],
          });
        }
      })
  );
}
