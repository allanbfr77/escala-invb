// ===== src/components/ModalInserirEscala.jsx =====
import { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { funcoesPorMinisterio } from "../data/funcoes";
import { pessoasPorMinisterio } from "../data/pessoas";

export default function ModalInserirEscala({ 
  isOpen, 
  onClose, 
  dataObj,
  funcao,
  ministerioSelecionado,
  usuario,
  onSuccess
}) {
  const [pessoaSelecionada, setPessoaSelecionada] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  if (!isOpen) return null;

  const pessoasDoMinisterio = pessoasPorMinisterio[ministerioSelecionado] || [];
  const funcoesDoMinisterio = funcoesPorMinisterio[ministerioSelecionado] || [];

  const handleSalvar = async () => {
    if (!pessoaSelecionada) {
      setErro("Selecione uma pessoa");
      return;
    }

    setSalvando(true);
    setErro("");

    try {
      const turnoKey = dataObj.turno === "único" ? "único" : dataObj.turno;
      
      // Verifica se já existe alguém nesta função/data
      const chave = `${dataObj.data}-${turnoKey}-${funcao}`;
      const qExistente = query(
        collection(db, "escalas"),
        where("ministerioId", "==", ministerioSelecionado),
        where("data", "==", dataObj.data),
        where("funcao", "==", funcao),
        where("turno", "==", dataObj.turno === "único" ? null : dataObj.turno)
      );
      
      const existenteSnap = await getDocs(qExistente);
      if (!existenteSnap.empty) {
        setErro(`Já existe uma escala para ${funcao} nesta data. Remova a atual antes de inserir outra.`);
        setSalvando(false);
        return;
      }

      // Verifica conflito com outros ministérios
      const conflitoQuery = query(
        collection(db, "escalas"),
        where("pessoaNome", "==", pessoaSelecionada.toLowerCase()),
        where("data", "==", dataObj.data)
      );
      const conflitoSnap = await getDocs(conflitoQuery);
      
      let temConflito = false;
      conflitoSnap.forEach(doc => {
        const escala = doc.data();
        if (escala.ministerioId !== ministerioSelecionado) {
          temConflito = true;
        }
      });

      if (temConflito) {
        setErro(`${pessoaSelecionada} já está escalado(a) em outro ministério nesta data!`);
        setSalvando(false);
        return;
      }

      const novaEscala = {
        pessoaNome: pessoaSelecionada.toLowerCase(),
        funcao: funcao,
        ministerioId: ministerioSelecionado,
        data: dataObj.data,
        turno: dataObj.turno === "único" ? null : dataObj.turno,
        horaInicio: dataObj.tipo === "domingo" && dataObj.turno === "manhã" ? "08:00" : 
                    dataObj.tipo === "domingo" && dataObj.turno === "noite" ? "18:00" : "19:00",
        horaFim: dataObj.tipo === "domingo" && dataObj.turno === "manhã" ? "12:00" : "22:00",
        criadoPor: usuario.uid,
        criadoPorEmail: usuario.email,
        criadoEm: new Date().toISOString()
      };

      await addDoc(collection(db, "escalas"), novaEscala);
      
      alert(`✅ ${pessoaSelecionada} escalado(a) como ${funcao} com sucesso!`);
      onSuccess();
      onClose();
      setPessoaSelecionada("");
      
    } catch (error) {
      console.error(error);
      setErro("Erro ao salvar escala. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "24px",
        width: "90%",
        maxWidth: "500px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
      }}>
        <h2 style={{ marginTop: 0 }}>📝 Escalar para {funcao}</h2>
        
        <p style={{ color: "#555", marginBottom: "20px" }}>
          Data: <strong>{formatarDataAmigavel(dataObj.data, dataObj.turno)}</strong>
        </p>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
            👤 Selecione a pessoa:
          </label>
          <select
            value={pessoaSelecionada}
            onChange={(e) => setPessoaSelecionada(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              fontSize: "14px"
            }}
          >
            <option value="">Selecione...</option>
            {pessoasDoMinisterio.map(p => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>

        {erro && (
          <div style={{
            background: "#f8d7da",
            color: "#721c24",
            padding: "10px",
            borderRadius: "6px",
            marginBottom: "20px",
            fontSize: "14px"
          }}>
            ❌ {erro}
          </div>
        )}

        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            style={{
              padding: "10px 20px",
              background: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: salvando ? "not-allowed" : "pointer",
              opacity: salvando ? 0.6 : 1
            }}
          >
            {salvando ? "Salvando..." : "✅ Confirmar Escala"}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatarDataAmigavel(dataStr, turno) {
  const [ano, mes, dia] = dataStr.split("-");
  const data = new Date(ano, mes - 1, dia);
  const diaSemana = data.toLocaleDateString("pt-BR", { weekday: "long" });
  const diaNumero = parseInt(dia);
  const mesNome = data.toLocaleDateString("pt-BR", { month: "long" });
  
  let turnoStr = "";
  if (turno === "manhã") turnoStr = " - Manhã";
  if (turno === "noite") turnoStr = " - Noite";
  
  return `${diaSemana}, ${diaNumero} de ${mesNome}${turnoStr}`;
}