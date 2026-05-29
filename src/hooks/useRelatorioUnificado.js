import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { calcularRelatorioUnificado, getIntervaloMes } from "../utils/relatorioUnificado";

export function useRelatorioUnificado(mes) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dados, setDados] = useState(null);

  useEffect(() => {
    if (!mes) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const { inicio, fim } = getIntervaloMes(mes);

    Promise.all([
      getDocs(
        query(
          collection(db, "escalas"),
          where("data", ">=", inicio),
          where("data", "<=", fim)
        )
      ),
      getDocs(collection(db, "cultos_extras")),
      getDocs(collection(db, "indisponibilidades")),
    ])
      .then(([escalasSnap, extrasSnap, indispSnap]) => {
        if (cancelled) return;

        const escalasDocs = escalasSnap.docs.map((d) => d.data());
        const cultosExtrasDocs = extrasSnap.docs.map((d) => d.data());
        const indispDocs = indispSnap.docs.map((d) => d.data());

        setDados(calcularRelatorioUnificado(mes, escalasDocs, cultosExtrasDocs, indispDocs));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Erro ao carregar o relatório. Verifique sua conexão e tente novamente.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mes]);

  return { loading, error, dados };
}
