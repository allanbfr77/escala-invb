import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

/** Indisponibilidades manuais do ministério em tempo real. */
export function useIndisponibilidadesMinisterio(ministerioId, enabled = true) {
  const [indisponiveisMap, setIndisponiveisMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled || !ministerioId) {
      setIndisponiveisMap({});
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const q = query(
      collection(db, "indisponibilidades"),
      where("ministerioId", "==", ministerioId)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const map = {};
        snap.docs.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data.pessoaNome) return;
          map[data.pessoaNome] = new Set(data.datas || []);
        });
        setIndisponiveisMap(map);
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao escutar indisponibilidades:", err);
        setLoading(false);
      }
    );

    return unsub;
  }, [ministerioId, enabled]);

  return { indisponiveisMap, loading };
}
