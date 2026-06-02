import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { calcularRelatorioUnificado, getIntervaloMes } from "../utils/relatorioUnificado";

export function useRelatorioUnificado(mes) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dados, setDados] = useState(null);

  useEffect(() => {
    if (!mes) return;

    let cancelled = false;
    let unsubEscalas = null;
    setLoading(true);
    setError(null);

    const { inicio, fim } = getIntervaloMes(mes);
    const escalasQuery = query(
      collection(db, "escalas"),
      where("data", ">=", inicio),
      where("data", "<=", fim)
    );

    let cultosExtrasDocs = [];
    let indispDocs = [];

    const recalcular = (escalasDocs) => {
      if (cancelled) return;
      setDados(calcularRelatorioUnificado(mes, escalasDocs, cultosExtrasDocs, indispDocs));
      setLoading(false);
    };

    Promise.all([
      getDocs(collection(db, "cultos_extras")),
      getDocs(collection(db, "indisponibilidades")),
    ])
      .then(([extrasSnap, indispSnap]) => {
        if (cancelled) return;

        cultosExtrasDocs = extrasSnap.docs.map((d) => d.data());
        indispDocs = indispSnap.docs.map((d) => d.data());

        unsubEscalas = onSnapshot(
          escalasQuery,
          (escalasSnap) => {
            recalcular(escalasSnap.docs.map((d) => d.data()));
          },
          () => {
            if (cancelled) return;
            setError("Erro ao carregar o relatório. Verifique sua conexão e tente novamente.");
            setLoading(false);
          }
        );
      })
      .catch(() => {
        if (cancelled) return;
        setError("Erro ao carregar o relatório. Verifique sua conexão e tente novamente.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
      unsubEscalas?.();
    };
  }, [mes]);

  return { loading, error, dados };
}
