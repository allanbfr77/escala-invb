// ===== src/context/EscalaContext.jsx =====
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { gerarDatasEscala } from "../utils/dateHelper";

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

  // Gerar datas do mês
  useEffect(() => {
    const mesAlvo = mes || new Date().toISOString().slice(0, 7);
    setDatas(gerarDatasEscala(mesAlvo));
  }, [mes]);

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
          const turnoKey = d.turno || "único";
          mapa[`${d.data}-${turnoKey}-${d.funcao}`] = d.pessoaNome;
        });
        setEscalas(mapa);
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
    <EscalaContext.Provider value={{ escalas, datas, loading, error, retry, setLoading }}>
      {children}
    </EscalaContext.Provider>
  );
}

export const useEscalas = () => useContext(EscalaContext);
