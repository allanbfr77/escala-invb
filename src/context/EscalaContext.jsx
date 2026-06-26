// ===== src/context/EscalaContext.jsx =====
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { gerarDatasEscala } from "../utils/dateHelper";
import { normalizarMapaEscalas } from "../utils/nomeExibicao";
import { turnoSalvoEscala } from "../utils/escalaDisponibilidade";
import { canonicalizarFuncaoEscala } from "../utils/gridAbreviacoes";

const EscalaContext = createContext();

export function EscalaProvider({ children, ministerioId, mes }) {
  const [escalas, setEscalas]     = useState({});
  const [datas, setDatas]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    setRetryCount(c => c + 1);
  }, []);

  // Re-assina o snapshot quando o app volta ao primeiro plano (mobile)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setRetryCount(c => c + 1);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Gerar datas do mês + escutar cultos extras do ministério no Firestore
  useEffect(() => {
    const mesAlvo = mes || new Date().toISOString().slice(0, 7);
    const geradas = gerarDatasEscala(mesAlvo);

    if (!ministerioId) {
      setDatas(geradas);
      return;
    }

    const q = query(
      collection(db, "cultos_extras"),
      where("ministerioId", "==", ministerioId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const turnoOrder = { "manhã": 0, "único": 1, "noite": 2 };
      const extrasFormatted = snap.docs
        .map((docSnap) => ({ firestoreId: docSnap.id, ...docSnap.data() }))
        .filter((e) => {
          if (!e?.data) return false;
          const mesDoDocumento = e.mes || String(e.data).slice(0, 7);
          return mesDoDocumento === mesAlvo;
        })
        .map((e) => ({
          id: `${e.data}-extra-${e.turno ?? "único"}`,
          data: e.data,
          tipo: "extra",
          turno: e.turno ?? "único",
          firestoreId: e.firestoreId,
          descricao: e.nome || e.descricao || "",
        }));
      const todas = [...geradas, ...extrasFormatted].sort((a, b) => {
        if (a.data !== b.data) return a.data.localeCompare(b.data);
        return (turnoOrder[a.turno] ?? 1) - (turnoOrder[b.turno] ?? 1);
      });
      setDatas(todas);
    }, (err) => {
      console.error("Erro ao carregar cultos extras:", err);
      setDatas(geradas);
    });

    return () => unsub();
  }, [ministerioId, mes]);

  // Listener em tempo real
  useEffect(() => {
    if (!ministerioId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const mesAlvo = mes || new Date().toISOString().slice(0, 7);
    const [ano, mesNum] = mesAlvo.split("-");
    const inicio = `${ano}-${mesNum}-01`;
    const fim    = `${ano}-${mesNum}-${new Date(ano, mesNum, 0).getDate()}`;

    const q = query(
      collection(db, "escalas"),
      where("ministerioId", "==", ministerioId),
      where("data", ">=", inicio),
      where("data", "<=", fim)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const mapa = {};
        snapshot.forEach(doc => {
          const d = doc.data();
          const turnoKey = turnoSalvoEscala({ turno: d.turno });
          const funcaoKey = canonicalizarFuncaoEscala(ministerioId, d.funcao);
          mapa[`${d.data}-${turnoKey}-${funcaoKey}`] = d.pessoaNome;
        });
        setEscalas(normalizarMapaEscalas(mapa));
        setLoading(false);
        setError(null);
      },
      (err) => {
        if (err.code === "permission-denied") {
          setError("Sem permissão para acessar os dados. Verifique se você está autenticado.");
        } else {
          setError("Erro ao carregar a escala. Verifique sua conexão e tente novamente.");
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [ministerioId, mes, retryCount]);

  return (
    <EscalaContext.Provider value={{ escalas, datas, loading, error, retry }}>
      {children}
    </EscalaContext.Provider>
  );
}

export const useEscalas = () => useContext(EscalaContext);
