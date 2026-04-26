// ===== src/components/GridEscala.jsx =====
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, query, where, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { gerarDatasEscala, formatarData } from "../utils/dateHelper";

export default function GridEscala({ 
  ministerioSelecionado, 
  filtros, 
  usuario,
  onRefresh 
}) {
  const [escalasExistentes, setEscalasExistentes] = useState({});
  const [datasDoMes, setDatasDoMes] = useState([]);
  const [carregando, setCarregando] = useState(false);

  const podeEditar = usuario?.ministerioId === ministerioSelecionado;

  // Gera as datas quando o mês muda
  useEffect(() => {
    if (filtros.mes) {
      const datas = gerarDatasEscala(filtros.mes);
      setDatasDoMes(datas);
    }
  }, [filtros.mes]);

  // Busca escalas existentes no Firestore
  useEffect(() => {
    if (!ministerioSelecionado || !filtros.mes) return;

    const buscarEscalas = async () => {
      setCarregando(true);
      try {
        // Busca escalas do mês atual
        const [ano, mes] = filtros.mes.split("-");
        const inicio = `${ano}-${mes}-01`;
        const fim = `${ano}-${mes}-${new Date(ano, mes, 0).getDate()}`;

        const q = query(
          collection(db, "escalas"),
          where("ministerioId", "==", ministerioSelecionado),
          where("data", ">=", inicio),
          where("data", "<=", fim)
        );
        
        const snapshot = await getDocs(q);
        const mapa = {};
        snapshot.forEach(doc => {
          const data = doc.data();
          const chave = `${data.data}-${data.turno || "único"}`;
          mapa[chave] = { id: doc.id, ...data };
        });
        
        setEscalasExistentes(mapa);
      } catch (error) {
        console.error("Erro ao buscar escalas:", error);
      } finally {
        setCarregando(false);
      }
    };

    buscarEscalas();
  }, [ministerioSelecionado, filtros.mes]);

  // Aplica filtros de pessoa e função
  const celulasFiltradas = (chave) => {
    const escala = escalasExistentes[chave];
    if (!escala) return "disponivel";
    
    if (filtros.pessoa && escala.pessoaNome !== filtros.pessoa) return "oculto";
    if (filtros.funcao && escala.funcao !== filtros.funcao) return "oculto";
    
    return "escalado";
  };

  const handleSalvarEscala = async (dataObj) => {
    if (!podeEditar) {
      alert("Você só pode editar escalas do seu próprio ministério");
      return;
    }

    const chave = `${dataObj.data}-${dataObj.turno === "único" ? "único" : dataObj.turno}`;
    
    if (escalasExistentes[chave]) {
      // Se já existe, pergunta se quer remover
      if (window.confirm("Esta célula já possui uma escala. Deseja remover?")) {
        await deleteDoc(doc(db, "escalas", escalasExistentes[chave].id));
        const novasEscalas = { ...escalasExistentes };
        delete novasEscalas[chave];
        setEscalasExistentes(novasEscalas);
        alert("Escala removida!");
      }
      return;
    }

    if (!filtros.pessoaSelecionada || !filtros.funcaoSelecionada) {
      alert("Selecione uma pessoa e uma função nos filtros antes de escalar");
      return;
    }

    // Verifica conflito de horário (mesma pessoa no mesmo dia em outro ministério)
    const conflitoQuery = query(
      collection(db, "escalas"),
      where("pessoaNome", "==", filtros.pessoaSelecionada),
      where("data", "==", dataObj.data)
    );
    const conflitoSnap = await getDocs(conflitoQuery);
    
    let temConflito = false;
    conflitoSnap.forEach(doc => {
      const escalaExistente = doc.data();
      if (escalaExistente.ministerioId !== ministerioSelecionado) {
        temConflito = true;
      }
    });

    if (temConflito) {
      alert("❌ Essa pessoa já está escalada em outro ministério nesta data!");
      return;
    }

    const novaEscala = {
      pessoaNome: filtros.pessoaSelecionada,
      funcao: filtros.funcaoSelecionada,
      ministerioId: ministerioSelecionado,
      data: dataObj.data,
      turno: dataObj.turno === "único" ? null : dataObj.turno,
      horaInicio: dataObj.tipo === "domingo" && dataObj.turno === "manhã" ? "09:00" : 
                  dataObj.tipo === "domingo" && dataObj.turno === "noite" ? "19:00" : "19:30",
      horaFim: dataObj.tipo === "domingo" && dataObj.turno === "manhã" ? "12:00" : "22:00",
      criadoPor: usuario.uid,
      criadoPorEmail: usuario.email,
      criadoEm: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, "escalas"), novaEscala);
    const novaChave = `${dataObj.data}-${dataObj.turno === "único" ? "único" : dataObj.turno}`;
    setEscalasExistentes({
      ...escalasExistentes,
      [novaChave]: { id: docRef.id, ...novaEscala }
    });
    
    alert("✅ Escala salva com sucesso!");
    if (onRefresh) onRefresh();
  };

  if (!filtros.mes) {
    return <div>Selecione um mês para visualizar a escala</div>;
  }

  if (carregando) {
    return <div>Carregando escalas...</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ 
        width: "100%", 
        borderCollapse: "collapse",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
      }}>
        <thead>
          <tr style={{ background: "#2c3e50", color: "white" }}>
            <th style={{ padding: "12px", textAlign: "left", minWidth: "180px" }}>Data / Turno</th>
            <th style={{ padding: "12px", textAlign: "left" }}>Pessoa Escalada</th>
            <th style={{ padding: "12px", textAlign: "left" }}>Função</th>
          </tr>
        </thead>
        <tbody>
          {datasDoMes.map((dataObj, idx) => {
            const chave = `${dataObj.data}-${dataObj.turno === "único" ? "único" : dataObj.turno}`;
            const escala = escalasExistentes[chave];
            const statusCelula = celulasFiltradas(chave);
            
            if (statusCelula === "oculto") return null;
            
            const corFundo = escala ? "#d4edda" : (statusCelula === "disponivel" ? "#fff3cd" : "#ffffff");
            
            return (
              <tr 
                key={idx} 
                style={{ 
                  backgroundColor: corFundo,
                  cursor: podeEditar ? "pointer" : "default",
                  borderBottom: "1px solid #ddd"
                }}
                onClick={() => {
                  if (podeEditar) {
                    handleSalvarEscala(dataObj);
                  } else if (escala) {
                    alert(`📋 ${escala.pessoaNome} - ${escala.funcao}\nCriado por: ${escala.criadoPorEmail || "Não informado"}`);
                  }
                }}
              >
                <td style={{ padding: "10px", borderRight: "1px solid #ddd" }}>
                  <strong>{formatarData(dataObj.data, dataObj.turno)}</strong>
                </td>
                <td style={{ padding: "10px", borderRight: "1px solid #ddd" }}>
                  {escala ? escala.pessoaNome : "⬜ Disponível"}
                </td>
                <td style={{ padding: "10px" }}>
                  {escala ? escala.funcao : "Clique para escalar"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {!podeEditar && (
        <p style={{ marginTop: "16px", fontSize: "16px", color: "#ff0000", textAlign: "center" }}>
          🔒 Modo somente leitura - Você está visualizando a escala de outro ministério
        </p>
      )}
    </div>
  );
}