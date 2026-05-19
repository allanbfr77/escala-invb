// ===== src/components/EscalaCard.jsx =====
import { useState } from "react";
import { db } from "../firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { funcoesPorMinisterio } from "../data/funcoes";
import { pessoasPorMinisterio } from "../data/pessoas";

export default function EscalaCard({ escala, usuario, onRefresh }) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({
    pessoaNome: escala.pessoaNome,
    funcao: escala.funcao,
    data: escala.data,
    inicio: escala.horaInicio,
    fim: escala.horaFim
  });

  const podeEditar = usuario?.ministerioId === escala.ministerioId;

  const salvarEdicao = async () => {
    const ref = doc(db, "escalas", escala.id);
    await updateDoc(ref, {
      pessoaNome: form.pessoaNome,
      funcao: form.funcao,
      data: form.data,
      horaInicio: form.inicio,
      horaFim: form.fim
    });
    setEditando(false);
    if (onRefresh) onRefresh();
    alert("Alterado com sucesso!");
  };

  const excluir = async () => {
    if (window.confirm("Tem certeza que deseja excluir esta escala?")) {
      await deleteDoc(doc(db, "escalas", escala.id));
      if (onRefresh) onRefresh();
      alert("Excluído!");
    }
  };

  if (editando && podeEditar) {
    return (
      <div style={{
        border: "1px solid var(--border)",
        padding: "10px",
        margin: "10px",
        background: "var(--bg)",
        color: "var(--text)",
      }}>
        <select
          value={form.pessoaNome}
          onChange={(e) => setForm({ ...form, pessoaNome: e.target.value })}
          style={{
            background: "var(--bg)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            padding: "8px",
            borderRadius: "4px",
            fontFamily: "inherit",
          }}
        >
          {pessoasPorMinisterio[escala.ministerioId]?.map((p, i) => (
            <option key={i} value={p}>{p}</option>
          ))}
        </select>

        <select
          value={form.funcao}
          onChange={(e) => setForm({ ...form, funcao: e.target.value })}
          style={{
            background: "var(--bg)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            padding: "8px",
            borderRadius: "4px",
            fontFamily: "inherit",
            marginLeft: "8px",
          }}
        >
          {funcoesPorMinisterio[escala.ministerioId]?.map((f, i) => (
            <option key={i} value={f}>{f}</option>
          ))}
        </select>

        <input
          type="date"
          value={form.data}
          onChange={(e) => setForm({ ...form, data: e.target.value })}
          style={{
            background: "var(--bg)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            padding: "8px",
            borderRadius: "4px",
            fontFamily: "inherit",
            marginLeft: "8px",
          }}
        />
        <input
          type="time"
          value={form.inicio}
          onChange={(e) => setForm({ ...form, inicio: e.target.value })}
          style={{
            background: "var(--bg)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            padding: "8px",
            borderRadius: "4px",
            fontFamily: "inherit",
            marginLeft: "8px",
          }}
        />
        <input
          type="time"
          value={form.fim}
          onChange={(e) => setForm({ ...form, fim: e.target.value })}
          style={{
            background: "var(--bg)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            padding: "8px",
            borderRadius: "4px",
            fontFamily: "inherit",
            marginLeft: "8px",
          }}
        />

        <button
          onClick={salvarEdicao}
          style={{
            background: "var(--bg)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            padding: "8px 16px",
            borderRadius: "4px",
            cursor: "pointer",
            marginLeft: "8px",
            fontFamily: "inherit",
          }}
        >
          Salvar alterações
        </button>
        <button
          onClick={() => setEditando(false)}
          style={{
            background: "var(--bg)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            padding: "8px 16px",
            borderRadius: "4px",
            cursor: "pointer",
            marginLeft: "8px",
            fontFamily: "inherit",
          }}
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div style={{
      border: "1px solid var(--border)",
      padding: "10px",
      margin: "10px",
      background: "var(--bg)",
      color: "var(--text)",
    }}>
      <p><strong>{escala.pessoaNome}</strong> - {escala.funcao}</p>
      <p>{escala.data} | {escala.horaInicio} até {escala.horaFim}</p>

      {podeEditar && (
        <div>
          <button
            onClick={() => setEditando(true)}
            style={{
              background: "var(--bg)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              padding: "6px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ✏️ Editar
          </button>
          <button
            onClick={excluir}
            style={{
              marginLeft: "10px",
              backgroundColor: "var(--text)",
              color: "var(--bg)",
              border: "none",
              padding: "6px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            🗑️ Excluir
          </button>
        </div>
      )}
    </div>
  );
}