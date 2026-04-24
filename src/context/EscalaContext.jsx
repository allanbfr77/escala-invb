// ===== src/context/EscalaContext.jsx =====
import { createContext, useContext, useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { gerarDatasEscala } from "../utils/dateHelper";

const EscalaContext = createContext();

export function EscalaProvider({ children, ministerioId, mes }) {
  const [escalas, setEscalas] = useState({});
  const [datas, setDatas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Gerar datas do mês - executa IMEDIATAMENTE
  useEffect(() => {
    console.log("📅 Gerando datas para o mês:", mes);
    if (mes) {
      const novasDatas = gerarDatasEscala(mes);
      console.log("📅 Datas geradas:", novasDatas.length);
      setDatas(novasDatas);
    } else {
      // Fallback: mês atual
      const mesAtual = new Date().toISOString().slice(0, 7);
      const novasDatas = gerarDatasEscala(mesAtual);
      setDatas(novasDatas);
    }
  }, [mes]);

  // Listener em tempo real - executa IMEDIATAMENTE
  useEffect(() => {
    if (!ministerioId) {
      console.log("⚠️ Sem ministerioId, aguardando...");
      setLoading(false);
      return;
    }

    // Determinar o mês a ser usado
    const mesParaBusca = mes || new Date().toISOString().slice(0, 7);
    const [ano, mesNum] = mesParaBusca.split("-");
    const inicio = `${ano}-${mesNum}-01`;
    const ultimoDia = new Date(ano, mesNum, 0).getDate();
    const fim = `${ano}-${mesNum}-${ultimoDia}`;

    console.log("🔍 Buscando escalas para:", ministerioId, "período:", inicio, "a", fim);

    const q = query(
      collection(db, "escalas"),
      where("ministerioId", "==", ministerioId),
      where("data", ">=", inicio),
      where("data", "<=", fim)
    );

const unsubscribe = onSnapshot(q, (snapshot) => {
  const mapa = {};
  snapshot.forEach(doc => {
    const data = doc.data();
    const turnoKey = data.turno || "único";
    const chave = `${data.data}-${turnoKey}-${data.funcao}`;
    console.log("🔑 Chave gerada:", chave); // ← aqui
    mapa[chave] = data.pessoaNome;
  });
  console.log("✅ Escalas carregadas:", Object.keys(mapa).length);
  setEscalas(mapa);
  setLoading(false);
}, (error) => {
  console.error("❌ Erro no listener:", error);
  setLoading(false);
});

    return () => unsubscribe();
  }, [ministerioId, mes]);

  return (
    <EscalaContext.Provider value={{ escalas, datas, loading, setLoading }}>
      {children}
    </EscalaContext.Provider>
  );
}

export const useEscalas = () => useContext(EscalaContext);