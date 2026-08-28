import { db } from "../firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc } from "firebase/firestore";
import { nomeParaExibicao, pessoaNomeFirestore } from "./nomeExibicao";

/** Dupla em Comunicações (ex.: JEAN/ALAN) → só o primeiro nome no Louvor. */
export function extrairPrimeiroNomeDupla(nome) {
  if (!nome || typeof nome !== "string") return nome;
  const barra = nome.indexOf("/");
  if (barra === -1) return nome;
  return nome.slice(0, barra).trim();
}

export function nomeParaExibicaoMesaSomLouvor(nome) {
  return nomeParaExibicao(extrairPrimeiroNomeDupla(nome));
}

export function pessoaNomeMesaSomLouvor(nome) {
  return pessoaNomeFirestore(extrairPrimeiroNomeDupla(nome));
}

export const FUNCAO_MESA_SOM = "MESA DE SOM";
export const MINISTERIO_ORIGEM_MESA_SOM = "comunicacao";
export const MINISTERIO_DESTINO_MESA_SOM = "louvor";

export function ehCelulaMesaSomSomenteLeitura(ministerioId, funcao) {
  return ministerioId === MINISTERIO_DESTINO_MESA_SOM && funcao === FUNCAO_MESA_SOM;
}

export function deveEspelharMesaSom(ministerioId, funcao) {
  return ministerioId === MINISTERIO_ORIGEM_MESA_SOM && funcao === FUNCAO_MESA_SOM;
}

/**
 * Espelha MESA DE SOM de Comunicações → Louvor (upsert ou delete).
 * pessoaNome vazio remove o reflexo no Louvor.
 */
export async function espelharMesaSomLouvor({
  data,
  turno,
  pessoaNome,
  horaInicio,
  horaFim,
  usuario,
}) {
  if (!data || !turno) return;

  const qEspelho = query(
    collection(db, "escalas"),
    where("ministerioId", "==", MINISTERIO_DESTINO_MESA_SOM),
    where("data", "==", data),
    where("funcao", "==", FUNCAO_MESA_SOM),
    where("turno", "==", turno)
  );
  const snap = await getDocs(qEspelho);
  for (const docSnap of snap.docs) await deleteDoc(docSnap.ref);

  const pl = pessoaNome ? pessoaNomeMesaSomLouvor(pessoaNome) : "";
  if (!pl) return;

  await addDoc(collection(db, "escalas"), {
    pessoaNome: pl,
    funcao: FUNCAO_MESA_SOM,
    ministerioId: MINISTERIO_DESTINO_MESA_SOM,
    data,
    turno,
    horaInicio: horaInicio || "19:00",
    horaFim: horaFim || "22:00",
    criadoPor: usuario?.uid || "",
    criadoPorEmail: usuario?.email || "",
    criadoEm: new Date().toISOString(),
    espelhadoDe: MINISTERIO_ORIGEM_MESA_SOM,
  });
}

/** Remove todos os espelhos MESA DE SOM do Louvor em um mês (YYYY-MM). */
export async function limparEspelhosMesaSomLouvorNoMes(mes) {
  if (!mes || !/^\d{4}-\d{2}$/.test(mes)) return;

  const [ano, mesNum] = mes.split("-");
  const inicio = `${ano}-${mesNum}-01`;
  const fim = `${ano}-${mesNum}-${new Date(ano, mesNum, 0).getDate()}`;

  const q = query(
    collection(db, "escalas"),
    where("ministerioId", "==", MINISTERIO_DESTINO_MESA_SOM),
    where("data", ">=", inicio),
    where("data", "<=", fim)
  );
  const snap = await getDocs(q);
  for (const docSnap of snap.docs) {
    if (docSnap.data().funcao !== FUNCAO_MESA_SOM) continue;
    await deleteDoc(docSnap.ref);
  }
}
