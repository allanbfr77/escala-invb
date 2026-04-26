// ===== src/components/SidebarEscala.jsx =====
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { funcoesPorMinisterio } from "../data/funcoes";
import { pessoasPorMinisterio } from "../data/pessoas";
import { gerarDatasEscala } from "../utils/dateHelper";

const ministerios = [
  { id: "comunicacao", nome: "COMUNICAÇÕES" },
  { id: "louvor", nome: "LOUVOR" },
  { id: "recepcao", nome: "RECEPÇÃO" },
  { id: "infantil", nome: "INFANTIL" }
];

export default function SidebarEscala({ 
  usuario, 
  ministerioSelecionado, 
  setMinisterioSelecionado,
  onEscalaSalva,
  mesReferencia 
}) {
  const [form, setForm] = useState({
    pessoa: "",
    funcao: "",
    dataId: "" // ID único da data/turno
  });
  
  const [datasDisponiveis, setDatasDisponiveis] = useState([]);
  const [mensagemErro, setMensagemErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const podeEditar = usuario?.ministerioId === ministerioSelecionado;
  const pessoasDoMinisterio = pessoasPorMinisterio[ministerioSelecionado] || [];
  const funcoesDoMinisterio = funcoesPorMinisterio[ministerioSelecionado] || [];

  // Gera as datas disponíveis para o mês atual
  useEffect(() => {
    if (mesReferencia) {
      const datas = gerarDatasEscala(mesReferencia);
      setDatasDisponiveis(datas);
    }
  }, [mesReferencia]);

  // Formata a data para exibição no select
  const formatarDataParaSelect = (dataObj) => {
    const [ano, mes, dia] = dataObj.data.split("-");
    const data = new Date(ano, mes - 1, dia);
    const diaSemana = data.toLocaleDateString("pt-BR", { weekday: "short" });
    const diaMes = `${dia}/${mes}`;
    
    if (dataObj.turno === "manhã") return `${diaSemana} ${diaMes} (Manhã)`;
    if (dataObj.turno === "noite") return `${diaSemana} ${diaMes} (Noite)`;
    return `${diaSemana} ${diaMes}`;
  };

  const handleSalvar = async () => {
    // Limpar mensagens anteriores
    setMensagemErro("");
    setSucesso("");

    // Validações básicas
    if (!form.pessoa) {
      setMensagemErro("❌ Selecione uma pessoa");
      return;
    }
    
    if (!form.funcao) {
      setMensagemErro("❌ Selecione uma função");
      return;
    }
    
    if (!form.dataId) {
      setMensagemErro("❌ Selecione uma data");
      return;
    }

    if (!podeEditar) {
      setMensagemErro("❌ Você não pode editar escalas de outro ministério");
      return;
    }

    // Encontrar o objeto da data selecionada
    const dataSelecionada = datasDisponiveis.find(d => d.id === form.dataId);
    if (!dataSelecionada) {
      setMensagemErro("❌ Data inválida");
      return;
    }

    // Verificar se já existe escala para esta data + função
    const chave = `${dataSelecionada.data}-${dataSelecionada.turno === "único" ? "único" : dataSelecionada.turno}-${form.funcao}`;
    
    const q = query(
      collection(db, "escalas"),
      where("ministerioId", "==", ministerioSelecionado),
      where("data", "==", dataSelecionada.data),
      where("funcao", "==", form.funcao)
    );
    
    const snapshot = await getDocs(q);
    let escalaExistente = null;
    snapshot.forEach(doc => {
      const data = doc.data();
      const turnoEscala = data.turno || "único";
      const turnoAtual = dataSelecionada.turno === "único" ? "único" : dataSelecionada.turno;
      if (turnoEscala === turnoAtual) {
        escalaExistente = { id: doc.id, ...data };
      }
    });

    // Verificar conflito de horário da mesma pessoa em outro ministério
    const conflitoQuery = query(
      collection(db, "escalas"),
      where("pessoaNome", "==", form.pessoa.toLowerCase()),
      where("data", "==", dataSelecionada.data)
    );
    const conflitoSnap = await getDocs(conflitoQuery);
    
    let temConflito = false;
    let ministerioConflito = "";
    conflitoSnap.forEach(doc => {
      const escala = doc.data();
      if (escala.ministerioId !== ministerioSelecionado) {
        temConflito = true;
        ministerioConflito = escala.ministerioId;
      }
    });

    if (temConflito) {
      setMensagemErro(`❌ ${form.pessoa} já está escalado(a) em outro ministério (${ministerioConflito}) nesta data!`);
      return;
    }

    // Se existe escala, perguntar se quer substituir
    if (escalaExistente) {
      const confirmar = window.confirm(
        `⚠️ Já existe ${escalaExistente.pessoaNome} escalado como ${form.funcao} nesta data.\n\nDeseja substituir por ${form.pessoa}?`
      );
      if (!confirmar) return;
      
      // Deletar a existente
      await deleteDoc(doc(db, "escalas", escalaExistente.id));
    }

    // Criar nova escala
    const novaEscala = {
      pessoaNome: form.pessoa.toLowerCase(),
      funcao: form.funcao,
      ministerioId: ministerioSelecionado,
      data: dataSelecionada.data,
      turno: dataSelecionada.turno === "único" ? null : dataSelecionada.turno,
      horaInicio: dataSelecionada.tipo === "domingo" && dataSelecionada.turno === "manhã" ? "08:00" : 
                  dataSelecionada.tipo === "domingo" && dataSelecionada.turno === "noite" ? "18:00" : "19:00",
      horaFim: dataSelecionada.tipo === "domingo" && dataSelecionada.turno === "manhã" ? "12:00" : "22:00",
      criadoPor: usuario.uid,
      criadoPorEmail: usuario.email,
      criadoEm: new Date().toISOString()
    };

    await addDoc(collection(db, "escalas"), novaEscala);
    
    // Feedback visual
    setSucesso(`✅ ${form.pessoa} escalado como ${form.funcao} com sucesso!`);
    
    // Limpar formulário (opcional: manter pessoa/função, limpar só a data)
    setForm({
      pessoa: form.pessoa, // mantém a pessoa para facilitar próximas escalas
      funcao: form.funcao, // mantém a função
      dataId: ""
    });
    
    // Esconder mensagem de sucesso após 2 segundos
    setTimeout(() => setSucesso(""), 2000);
    
    // Notificar grid para atualizar
    if (onEscalaSalva) onEscalaSalva();
  };

  const handleLimpar = () => {
    setForm({
      pessoa: "",
      funcao: "",
      dataId: ""
    });
    setMensagemErro("");
    setSucesso("");
  };

  return (
    <div style={{ 
      width: "100%", 
      padding: "20px", 
      background: "#f4f4f4", 
      borderRadius: "8px",
      position: "sticky",
      top: "20px"
    }}>
      <h3 style={{ marginTop: 0, marginBottom: "20px" }}>➕ Nova Escala</h3>

      {/* Seletor de Ministério */}
      <div style={{ marginBottom: "20px" }}>
        <label style={{ fontWeight: "bold", display: "block", marginBottom: "8px" }}>
          📌 Ministério:
        </label>
        <select
          value={ministerioSelecionado}
          onChange={(e) => setMinisterioSelecionado(e.target.value)}
          style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
        >
          {ministerios.map(m => (
            <option key={m.id} value={m.id}>
              {m.nome} {m.id === usuario?.ministerioId ? "(meu)" : ""}
            </option>
          ))}
        </select>

        {!podeEditar && (
          <p style={{ fontSize: "12px", color: "#d32f2f", marginTop: "8px", background: "#ffebee", padding: "6px", borderRadius: "4px" }}>
            ⚠️ Modo somente leitura - você não pode escalar neste ministério
          </p>
        )}
      </div>

      {/* Seletor de Pessoa */}
      <div style={{ marginBottom: "20px" }}>
        <label style={{ fontWeight: "bold", display: "block", marginBottom: "8px" }}>
          👤 Pessoa:
        </label>
        <select
          value={form.pessoa}
          onChange={(e) => setForm({ ...form, pessoa: e.target.value })}
          style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
          disabled={!podeEditar}
        >
          <option value="">Selecione uma pessoa</option>
          {pessoasDoMinisterio.map(p => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Seletor de Função */}
      <div style={{ marginBottom: "20px" }}>
        <label style={{ fontWeight: "bold", display: "block", marginBottom: "8px" }}>
          🎯 Função:
        </label>
        <select
          value={form.funcao}
          onChange={(e) => setForm({ ...form, funcao: e.target.value })}
          style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
          disabled={!podeEditar}
        >
          <option value="">Selecione uma função</option>
          {funcoesDoMinisterio.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      {/* Seletor de Data */}
      <div style={{ marginBottom: "20px" }}>
        <label style={{ fontWeight: "bold", display: "block", marginBottom: "8px" }}>
          📅 Data:
        </label>
        <select
          value={form.dataId}
          onChange={(e) => setForm({ ...form, dataId: e.target.value })}
          style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
          disabled={!podeEditar}
        >
          <option value="">Selecione uma data</option>
          {datasDisponiveis.map(d => (
            <option key={d.id} value={d.id}>
              {formatarDataParaSelect(d)}
            </option>
          ))}
        </select>
      </div>

      {/* Botões de Ação */}
      {podeEditar && (
        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button
            onClick={handleSalvar}
            style={{
              flex: 2,
              padding: "12px",
              background: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "bold"
            }}
          >
            💾 Salvar Escala
          </button>
          <button
            onClick={handleLimpar}
            style={{
              flex: 1,
              padding: "12px",
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            🧹 Limpar
          </button>
        </div>
      )}

      {/* Mensagens de Feedback */}
      {mensagemErro && (
        <div style={{
          marginTop: "15px",
          padding: "10px",
          background: "#f8d7da",
          color: "#721c24",
          borderRadius: "6px",
          fontSize: "14px",
          border: "1px solid #f5c6cb"
        }}>
          {mensagemErro}
        </div>
      )}

      {sucesso && (
        <div style={{
          marginTop: "15px",
          padding: "10px",
          background: "#d4edda",
          color: "#155724",
          borderRadius: "6px",
          fontSize: "14px",
          border: "1px solid #c3e6cb"
        }}>
          {sucesso}
        </div>
      )}

      {/* Legenda */}
      <hr style={{ margin: "20px 0" }} />
      <div style={{ fontSize: "12px", color: "#555" }}>
        <p><strong>📖 Como usar:</strong></p>
        <ol style={{ margin: 0, paddingLeft: "20px" }}>
          <li>Selecione a <strong>pessoa</strong></li>
          <li>Selecione a <strong>função</strong></li>
          <li>Selecione a <strong>data</strong></li>
          <li>Clique em <strong>Salvar Escala</strong></li>
        </ol>
        <p style={{ marginTop: "10px", marginBottom: 0 }}>
          ✅ O nome aparecerá automaticamente na tabela
        </p>
      </div>
    </div>
  );
}