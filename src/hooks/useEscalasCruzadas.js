import { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { getIntervaloMes } from "../utils/relatorioUnificado";
import { montarMapaEscalasCruzadas } from "../utils/escalasCruzadas";

/**
 * Escuta escalas de todos os ministérios no mês (tempo real).
 * Retorna mapa pessoa|data|turno → { ministerioId, funcao, criadoEm }.
 */
export function useEscalasCruzadas({ mes, pessoasLowerSet, enabled = true }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled || !mes) {
      setDocs([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const { inicio, fim } = getIntervaloMes(mes);
    const q = query(
      collection(db, "escalas"),
      where("data", ">=", inicio),
      where("data", "<=", fim)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setDocs(snap.docs);
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao escutar escalas cruzadas:", err);
        setLoading(false);
      }
    );

    return unsub;
  }, [mes, enabled]);

  const mapa = useMemo(
    () => montarMapaEscalasCruzadas(docs, pessoasLowerSet),
    [docs, pessoasLowerSet]
  );

  return { mapa, loading };
}
