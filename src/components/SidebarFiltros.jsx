// ===== src/components/SidebarFiltros.jsx =====
import { useState, useRef, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { funcoesPorMinisterio } from "../data/funcoes";
import { pessoasPorMinisterio } from "../data/pessoas";
import { formatarData } from "../utils/dateHelper";

const ministerios = [
  {
    id: "comunicacao", nome: "COMUNICAÇÕES",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="13" height="10" rx="2"/>
        <polygon points="15,9 21,6 21,18 15,15"/>
        <circle cx="4" cy="9.5" r="0.8" fill="white" stroke="none"/>
      </svg>
    ),
  },
  {
    id: "louvor", nome: "LOUVOR",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </svg>
    ),
  },
  {
    id: "recepcao", nome: "RECEPÇÃO",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    id: "infantil", nome: "INFANTIL",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="2.5"/>
        <path d="M12 7.5L12 14"/>
        <path d="M12 14L9 19"/>
        <path d="M12 14L15 19"/>
        <path d="M12 10L8 12"/>
        <path d="M12 10L16 12"/>
      </svg>
    ),
  },
];

const steps = [
  { num: 1, label: "Ministério" },
  { num: 2, label: "Pessoa" },
  { num: 3, label: "Função" },
  { num: 4, label: "Datas" },
];

export default function SidebarFiltros({
  usuario, ministerioSelecionado, setMinisterioSelecionado,
  datasDisponiveis, onRefresh, theme, onConfirmar,
  onMensagem, onConflito,
}) {
  const t = theme || {};
  const [salvando, setSalvando]             = useState(false);
  const [pessoaSelecionada, setPessoa]      = useState("");
  const [funcaoSelecionada, setFuncao]      = useState("");
  const [datasIds, setDatasIds]             = useState([]);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const dropdownRef                         = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownAberto(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const pessoasDoMinisterio = pessoasPorMinisterio[ministerioSelecionado] || [];
  const funcoesDoMinisterio = funcoesPorMinisterio[ministerioSelecionado] || [];
  const podeEditar = usuario?.ministerioId === ministerioSelecionado;
  const stepAtivo = !pessoaSelecionada ? 2 : !funcaoSelecionada ? 3 : datasIds.length === 0 ? 4 : null;

  const toggleData = (id) => {
    setDatasIds(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
    onConflito?.(null);
  };

  const handleConfirmarEscala = async () => {
    if (!podeEditar)           { onMensagem?.("Você só pode editar seu próprio ministério", "erro"); return; }
    if (!pessoaSelecionada)    { onMensagem?.("Selecione uma pessoa", "erro"); return; }
    if (!funcaoSelecionada)    { onMensagem?.("Selecione uma função", "erro"); return; }
    if (datasIds.length === 0) { onMensagem?.("Selecione ao menos uma data", "erro"); return; }

    setSalvando(true);
    onConflito?.(null);

    const datasObj = datasIds
      .map(id => datasDisponiveis.find(d => d.id === id))
      .filter(Boolean);

    let erros = 0;
    let conflito = null;

    for (const dataObj of datasObj) {
      const turnoSalvo = dataObj.turno === "único" ? "único" : dataObj.turno;

      try {
        const qConflito = query(
          collection(db, "escalas"),
          where("pessoaNome", "==", pessoaSelecionada.toLowerCase()),
          where("data", "==", dataObj.data),
          where("turno", "==", turnoSalvo)
        );
        const conflitoSnap = await getDocs(qConflito);
        const conflitoOutro = conflitoSnap.docs.find(d => d.data().ministerioId !== ministerioSelecionado);

        if (conflitoOutro) {
          const dd = conflitoOutro.data();
          const nomes = { comunicacao: "COMUNICAÇÕES", louvor: "LOUVOR", recepcao: "RECEPÇÃO", infantil: "INFANTIL" };
          if (!conflito) {
            conflito = {
              pessoa: pessoaSelecionada,
              data: formatarData(dataObj.data, dataObj.turno),
              ministerio: nomes[dd.ministerioId],
              funcao: dd.funcao,
            };
          }
          erros++;
          continue;
        }

        const qExistente = query(
          collection(db, "escalas"),
          where("ministerioId", "==", ministerioSelecionado),
          where("data", "==", dataObj.data),
          where("funcao", "==", funcaoSelecionada),
          where("turno", "==", turnoSalvo)
        );
        const existenteSnap = await getDocs(qExistente);
        for (const doc of existenteSnap.docs) await deleteDoc(doc.ref);

        await addDoc(collection(db, "escalas"), {
          pessoaNome: pessoaSelecionada.toLowerCase(),
          funcao: funcaoSelecionada,
          ministerioId: ministerioSelecionado,
          data: dataObj.data,
          turno: turnoSalvo,
          horaInicio: dataObj.tipo === "domingo" && dataObj.turno === "manhã" ? "08:00" :
                      dataObj.tipo === "domingo" && dataObj.turno === "noite" ? "18:00" : "19:00",
          horaFim: dataObj.tipo === "domingo" && dataObj.turno === "manhã" ? "12:00" : "22:00",
          criadoPor: usuario.uid,
          criadoPorEmail: usuario.email,
          criadoEm: new Date().toISOString()
        });

      } catch (error) {
        console.error(error);
        erros++;
      }
    }

    const salvos = datasObj.length - erros;
    if (conflito) onConflito?.(conflito);

    if (salvos > 0) {
      const plural = salvos === 1 ? "data" : "datas";
      onMensagem?.(
        `${pessoaSelecionada.toUpperCase()} escalado como ${funcaoSelecionada} em ${salvos} ${plural}`,
        erros > 0 ? "aviso" : "sucesso"
      );
      setDatasIds([]);
      if (onRefresh) onRefresh();
      if (!erros) setTimeout(() => { if (onConfirmar) onConfirmar(); }, 1200);
    } else {
      onMensagem?.("Nenhuma data foi salva (verifique conflitos)", "erro");
    }

    setSalvando(false);
  };

  const s = {
    label: {
      fontSize: "11px", fontWeight: 600, color: t.textMuted,
      textTransform: "uppercase", letterSpacing: "0.6px",
      display: "block", marginBottom: "6px"
    },
    select: {
      width: "100%", padding: "10px 12px", borderRadius: "6px",
      border: `1px solid ${t.border}`, background: t.bg,
      color: t.text, fontSize: "14px", fontFamily: "inherit",
      outline: "none", cursor: "pointer", appearance: "none",
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237d8590' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
      backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
      paddingRight: "28px",
    },
    field: { marginBottom: "18px" },
  };

  // Label shown inside the trigger button
  const datasLabel = datasIds.length === 0
    ? "Selecione..."
    : datasIds.length === 1
      ? (() => {
          const d = datasDisponiveis.find(d => d.id === datasIds[0]);
          return d ? formatarData(d.data, d.turno) : "1 data";
        })()
      : `${datasIds.length} datas selecionadas`;

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>

      <div style={{ marginBottom: "20px", paddingBottom: "16px", borderBottom: `1px solid ${t.border}` }}>
        <p style={{ fontSize: "11px", fontWeight: 600, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.6px" }}>
          Adicionar à escala
        </p>
      </div>

      {/* Ministério */}
      <div style={s.field}>
        <label style={s.label}>Ministério</label>
        <select value={ministerioSelecionado} onChange={e => { setMinisterioSelecionado(e.target.value); onConflito?.(null); }} style={s.select}>
          {ministerios.map(m => (
            <option key={m.id} value={m.id}>{m.nome}{m.id === usuario?.ministerioId ? " (meu)" : ""}</option>
          ))}
        </select>
        {!podeEditar && (
          <div style={{ marginTop: "8px", padding: "8px 10px", borderRadius: "6px", background: "rgba(210,153,34,0.08)", border: "1px solid rgba(210,153,34,0.25)", display: "flex", alignItems: "center", gap: "7px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 9V14M12 17.5V18M12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" stroke="#d2993a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: "11px", color: "#d2993a", fontWeight: 600, letterSpacing: "0.3px" }}>SOMENTE LEITURA</span>
          </div>
        )}
      </div>

      {/* Pessoa */}
      <div style={s.field}>
        <label style={s.label}>Pessoa</label>
        <select value={pessoaSelecionada} onChange={e => { setPessoa(e.target.value); onConflito?.(null); }} style={{ ...s.select, opacity: !podeEditar ? 0.5 : 1 }} disabled={!podeEditar}>
          <option value="">Selecione...</option>
          {pessoasDoMinisterio.map(p => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Função */}
      <div style={s.field}>
        <label style={s.label}>Função</label>
        <select value={funcaoSelecionada} onChange={e => setFuncao(e.target.value)} style={{ ...s.select, opacity: !podeEditar ? 0.5 : 1 }} disabled={!podeEditar}>
          <option value="">Selecione...</option>
          {funcoesDoMinisterio.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      {/* Datas — custom dropdown com checkboxes */}
      <div style={{ ...s.field, position: "relative" }} ref={dropdownRef}>
        <label style={s.label}>
          Datas
          {datasIds.length > 0 && (
            <span style={{
              marginLeft: "7px", background: t.accent, color: "white",
              borderRadius: "10px", padding: "1px 6px", fontSize: "10px", fontWeight: 700,
            }}>
              {datasIds.length}
            </span>
          )}
        </label>

        {/* Trigger button — visually matches the other selects */}
        <button
          onClick={() => { if (podeEditar && datasDisponiveis.length > 0) setDropdownAberto(v => !v); }}
          disabled={!podeEditar || datasDisponiveis.length === 0}
          style={{
            width: "100%", padding: "10px 12px", borderRadius: "6px",
            border: `1px solid ${dropdownAberto ? t.accent : t.border}`,
            background: t.bg, fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            outline: "none", cursor: !podeEditar || datasDisponiveis.length === 0 ? "not-allowed" : "pointer",
            opacity: (!podeEditar || datasDisponiveis.length === 0) ? 0.5 : 1,
            transition: "border-color 0.15s",
          }}
        >
          <span style={{
            fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            color: datasIds.length === 0 ? (t.textDim || t.textMuted) : t.text,
          }}>
            {datasLabel}
          </span>
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            style={{ flexShrink: 0, marginLeft: "8px", transition: "transform 0.2s", transform: dropdownAberto ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <path d="M6 9l6 6 6-6" stroke={t.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Dropdown panel */}
        {dropdownAberto && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
            borderRadius: "6px", border: `1px solid ${t.border}`,
            background: t.surface || t.bg,
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            overflow: "hidden",
          }}>
            {/* Selecionar tudo / nenhum */}
            <div style={{ display: "flex", borderBottom: `1px solid ${t.border}` }}>
              <button
                onClick={() => { setDatasIds(datasDisponiveis.map(d => d.id)); onConflito?.(null); }}
                style={{
                  flex: 1, padding: "7px", background: "transparent", border: "none",
                  fontSize: "11px", fontWeight: 600, color: t.textMuted,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Todas
              </button>
              <div style={{ width: "1px", background: t.border }} />
              <button
                onClick={() => { setDatasIds([]); onConflito?.(null); }}
                style={{
                  flex: 1, padding: "7px", background: "transparent", border: "none",
                  fontSize: "11px", fontWeight: 600, color: t.textMuted,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Nenhuma
              </button>
            </div>

            {/* Lista de datas com checkbox */}
            <div style={{ maxHeight: "200px", overflowY: "auto" }}>
              {datasDisponiveis.map((d, i) => {
                const checked = datasIds.includes(d.id);
                return (
                  <div
                    key={d.id}
                    onClick={() => toggleData(d.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "9px 12px", cursor: "pointer",
                      background: checked ? (t.accentDim || "rgba(99,102,241,0.08)") : "transparent",
                      borderBottom: i < datasDisponiveis.length - 1 ? `1px solid ${t.border}` : "none",
                      transition: "background 0.1s",
                    }}
                  >
                    {/* Custom checkbox box */}
                    <span style={{
                      width: "15px", height: "15px", borderRadius: "4px", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: `2px solid ${checked ? t.accent : t.border}`,
                      background: checked ? t.accent : "transparent",
                      transition: "all 0.15s",
                    }}>
                      {checked && (
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                          <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    <span style={{
                      fontSize: "13px",
                      color: checked ? t.text : t.textMuted,
                      fontWeight: checked ? 500 : 400,
                    }}>
                      {formatarData(d.data, d.turno)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Botão confirmar */}
      <button
        onClick={handleConfirmarEscala}
        disabled={salvando || !podeEditar}
        style={{
          width: "100%", padding: "12px", borderRadius: "6px", border: "none",
          background: salvando || !podeEditar ? t.borderLight : t.accent,
          color: salvando || !podeEditar ? t.textDim : "white",
          fontSize: "14px", fontWeight: 600,
          cursor: salvando || !podeEditar ? "not-allowed" : "pointer",
          fontFamily: "inherit", letterSpacing: "-0.2px",
          transition: "all 0.15s", marginBottom: "8px",
        }}
      >
        {salvando
          ? "Salvando..."
          : datasIds.length > 1
            ? `Confirmar ${datasIds.length} escalas`
            : "Confirmar escala"}
      </button>

      {/* Botão limpar */}
      <button
        onClick={() => { setPessoa(""); setFuncao(""); setDatasIds([]); setDropdownAberto(false); onConflito?.(null); }}
        disabled={!podeEditar}
        style={{
          width: "100%", padding: "10px", borderRadius: "6px",
          border: `1px solid ${t.border}`, background: "transparent",
          color: t.textMuted, fontSize: "13px",
          cursor: !podeEditar ? "not-allowed" : "pointer",
          fontFamily: "inherit", opacity: !podeEditar ? 0.5 : 1,
        }}
      >
        Limpar seleção
      </button>

      {/* Steps */}
      {podeEditar && (
        <div style={{ marginTop: "24px", padding: "14px", borderRadius: "8px", background: t.bg, border: `1px solid ${t.border}` }}>
          <p style={{ fontSize: "10px", fontWeight: 700, color: t.textDim, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "12px" }}>
            Como adicionar
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {steps.map(({ num, label }) => {
              const completo = num === 1
                || (num === 2 && pessoaSelecionada)
                || (num === 3 && funcaoSelecionada)
                || (num === 4 && datasIds.length > 0);
              const ativo = stepAtivo === num;
              return (
                <div key={num} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "10px", fontWeight: 700, transition: "all 0.2s",
                    background: completo ? t.accent : ativo ? t.accentDim : "transparent",
                    border: `1.5px solid ${completo ? t.accent : ativo ? t.accent : t.borderLight}`,
                    color: completo ? "white" : ativo ? t.accent : t.textDim,
                  }}>
                    {completo && num !== stepAtivo ? "✓" : num}
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: ativo ? 600 : 400, color: completo ? t.text : ativo ? t.accent : t.textDim, transition: "all 0.2s" }}>
                    {label}
                    {num === 4 && datasIds.length > 0 && (
                      <span style={{ marginLeft: "4px", color: t.accent, fontWeight: 700 }}>
                        ({datasIds.length})
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}