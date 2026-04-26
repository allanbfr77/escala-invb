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
      <div style={{ border: "1px solid #ccc", padding: "10px", margin: "10px" }}>
        <select
          value={form.pessoaNome}
          onChange={(e) => setForm({ ...form, pessoaNome: e.target.value })}
        >
          {pessoasPorMinisterio[escala.ministerioId]?.map((p, i) => (
            <option key={i} value={p}>{p}</option>
          ))}
        </select>

        <select
          value={form.funcao}
          onChange={(e) => setForm({ ...form, funcao: e.target.value })}
        >
          {funcoesPorMinisterio[escala.ministerioId]?.map((f, i) => (
            <option key={i} value={f}>{f}</option>
          ))}
        </select>

        <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
        <input type="time" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} />
        <input type="time" value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} />

        <button onClick={salvarEdicao}>Salvar alterações</button>
        <button onClick={() => setEditando(false)}>Cancelar</button>
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid #ccc", padding: "10px", margin: "10px" }}>
      <p><strong>{escala.pessoaNome}</strong> - {escala.funcao}</p>
      <p>{escala.data} | {escala.horaInicio} até {escala.horaFim}</p>
      
      {podeEditar && (
        <div>
          <button onClick={() => setEditando(true)}>✏️ Editar</button>
          <button onClick={excluir} style={{ marginLeft: "10px", backgroundColor: "#ff4444", color: "white" }}>🗑️ Excluir</button>
        </div>
      )}
    </div>
  );
}