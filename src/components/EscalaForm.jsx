import { useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { funcoesPorMinisterio } from "../data/funcoes";
import { pessoasPorMinisterio } from "../data/pessoas";

export default function EscalaForm() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    pessoaNome: "",
    funcao: "",
    data: "",
    inicio: "",
    fim: ""
  });

  const verificarConflito = async () => {
    if (!form.data || !form.pessoaNome) return false;

    const q = query(
      collection(db, "escalas"),
      where("data", "==", form.data),
      where("pessoaNome", "==", form.pessoaNome.toLowerCase())
    );

    const snap = await getDocs(q);

    let conflito = false;

    snap.forEach((doc) => {
      const e = doc.data();

      if (!e.horaInicio || !e.horaFim) return;

      if (
        form.inicio < e.horaFim &&
        form.fim > e.horaInicio
      ) {
        conflito = true;
      }
    });

    return conflito;
  };

  const salvar = async () => {
    if (!user?.ministerioId) {
      alert("Erro de usuário. Faça login novamente.");
      return;
    }

    if (
      !form.pessoaNome ||
      !form.funcao ||
      !form.data ||
      !form.inicio ||
      !form.fim
    ) {
      alert("Preencha todos os campos");
      return;
    }

    if (form.inicio >= form.fim) {
      alert("Horário inválido");
      return;
    }

    const conflito = await verificarConflito();

    if (conflito) {
      alert(
        "Essa pessoa já está escalada em outro ministério neste horário."
      );
      return;
    }

    await addDoc(collection(db, "escalas"), {
      pessoaNome: form.pessoaNome.toLowerCase(),
      funcao: form.funcao,
      ministerioId: user.ministerioId,
      data: form.data,
      horaInicio: form.inicio,
      horaFim: form.fim,
      criadoPor: user.uid,
      criadoPorEmail: user.email,
      criadoEm: new Date().toISOString()
    });

    setForm({
      pessoaNome: "",
      funcao: "",
      data: "",
      inicio: "",
      fim: ""
    });

    alert("Salvo!");
  };

  return (
    <div>
      {/* 🔥 SELECT DE PESSOAS */}
      <select
        value={form.pessoaNome}
        onChange={(e) =>
          setForm({ ...form, pessoaNome: e.target.value })
        }
      >
        <option value="">Selecione pessoa</option>

        {pessoasPorMinisterio[user?.ministerioId]?.map((p, i) => (
          <option key={i} value={p}>
            {p}
          </option>
        ))}
      </select>

      {/* 🔥 SELECT DE FUNÇÕES */}
      <select
        value={form.funcao}
        onChange={(e) =>
          setForm({ ...form, funcao: e.target.value })
        }
      >
        <option value="">Selecione função</option>

        {funcoesPorMinisterio[user?.ministerioId]?.map((f, i) => (
          <option key={i} value={f}>
            {f}
          </option>
        ))}
      </select>

      <input
        type="date"
        value={form.data}
        onChange={(e) =>
          setForm({ ...form, data: e.target.value })
        }
      />

      <input
        type="time"
        value={form.inicio}
        onChange={(e) =>
          setForm({ ...form, inicio: e.target.value })
        }
      />

      <input
        type="time"
        value={form.fim}
        onChange={(e) =>
          setForm({ ...form, fim: e.target.value })
        }
      />

      <button onClick={salvar}>Salvar</button>
    </div>
  );
}