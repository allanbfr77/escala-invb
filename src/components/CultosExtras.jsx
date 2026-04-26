import { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, deleteDoc, doc } from "firebase/firestore";
import { formatarData } from "../utils/dateHelper";

const TIPOS_EXTRA = [
  "Consagração",
  "Culto das Mulheres",
  "Encontro de Amigas",
  "Encontro de Casados",
  "Encontro de Guerreiros",
];

export default function CultosExtras({ extrasDoMes, mes, ministerioSelecionado, datasDisponiveis, usuario, onMensagem, t }) {
  const [aberta, setAberta]               = useState(false);
  const [novoExtra, setNovoExtra]         = useState({ data: "", turno: "único", nome: "" });
  const [adicionando, setAdicionando]     = useState(false);

  const mesMinMax = (() => {
    const m = mes || new Date().toISOString().slice(0, 7);
    const [ano, mesN] = m.split("-");
    const last = new Date(parseInt(ano), parseInt(mesN), 0).getDate();
    return { min: `${m}-01`, max: `${m}-${String(last).padStart(2, "0")}` };
  })();

  const handleAdicionar = async () => {
    if (!novoExtra.nome) { onMensagem?.("Selecione o tipo de culto", "erro"); return; }
    if (!novoExtra.data) { onMensagem?.("Selecione uma data", "erro"); return; }
    const jaExiste = datasDisponiveis.some(d => d.data === novoExtra.data && d.turno === novoExtra.turno);
    if (jaExiste) { onMensagem?.("Já existe um culto neste dia/turno", "erro"); return; }

    setAdicionando(true);
    try {
      await addDoc(collection(db, "cultos_extras"), {
        data: novoExtra.data,
        turno: novoExtra.turno,
        nome: novoExtra.nome,
        mes: mes || new Date().toISOString().slice(0, 7),
        ministerioId: ministerioSelecionado,
        criadoPor: usuario?.uid || "",
        criadoEm: new Date().toISOString(),
      });
      setNovoExtra({ data: "", turno: "único", nome: "" });
      onMensagem?.("Culto extra adicionado", "sucesso");
    } catch (err) {
      console.error(err);
      onMensagem?.("Erro ao adicionar culto extra", "erro");
    } finally {
      setAdicionando(false);
    }
  };

  const handleRemover = async (firestoreId) => {
    try {
      await deleteDoc(doc(db, "cultos_extras", firestoreId));
      onMensagem?.("Culto extra removido", "sucesso");
    } catch (err) {
      console.error(err);
      onMensagem?.("Erro ao remover culto extra", "erro");
    }
  };

  return (
    <div style={{ marginTop: "22px", paddingTop: "18px", borderTop: `1px solid ${t.border}` }}>
      {/* Header acordeão */}
      <button
        onClick={() => setAberta(v => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between",
          background: "none", border: "none", padding: "0",
          cursor: "pointer", fontFamily: "inherit",
          marginBottom: aberta ? "12px" : "0",
        }}
      >
        <span style={{
          fontSize: "11px", fontWeight: 600, color: t.textMuted,
          textTransform: "uppercase", letterSpacing: "0.6px",
          display: "flex", alignItems: "center", gap: "7px",
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
              stroke={t.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 14h.01M8 14h.01M16 14h.01M12 18h.01M8 18h.01M16 18h.01"
              stroke={t.textMuted} strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          Cultos Extras
          {extrasDoMes.length > 0 && (
            <span style={{ background: t.accent, color: "white", borderRadius: "10px", padding: "1px 6px", fontSize: "10px", fontWeight: 700 }}>
              {extrasDoMes.length}
            </span>
          )}
        </span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke={t.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transition: "transform 0.2s", transform: aberta ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      <div style={{ display: aberta ? "block" : "none" }}>
        {/* Formulário */}
        <div style={{ marginBottom: "10px" }}>
          <select
            value={novoExtra.nome}
            onChange={e => setNovoExtra(prev => ({ ...prev, nome: e.target.value }))}
            style={{
              width: "100%", padding: "8px 10px", borderRadius: "6px",
              border: `1px solid ${novoExtra.nome ? t.accent : t.border}`,
              background: t.bg, color: novoExtra.nome ? t.text : t.textMuted,
              fontSize: "13px", fontFamily: "inherit", outline: "none",
              cursor: "pointer", marginBottom: "6px", transition: "border-color 0.15s",
            }}
          >
            <option value="">Tipo de culto...</option>
            {TIPOS_EXTRA.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
          </select>
          <input
            type="date"
            min={mesMinMax.min}
            max={mesMinMax.max}
            value={novoExtra.data}
            onChange={e => setNovoExtra(prev => ({ ...prev, data: e.target.value }))}
            style={{
              width: "100%", padding: "8px 10px", borderRadius: "6px",
              border: `1px solid ${novoExtra.data ? t.accent : t.border}`,
              background: t.bg, color: t.text, fontSize: "13px",
              fontFamily: "inherit", outline: "none",
              marginBottom: "6px", transition: "border-color 0.15s",
              colorScheme: "dark",
            }}
          />
          <button
            onClick={handleAdicionar}
            disabled={!novoExtra.data || adicionando}
            style={{
              padding: "8px 14px", borderRadius: "6px", cursor: "pointer",
              background: !novoExtra.data || adicionando ? t.borderLight : t.accent,
              border: "none",
              color: !novoExtra.data || adicionando ? t.textDim : "white",
              fontSize: "13px", fontWeight: 600, fontFamily: "inherit",
              transition: "all 0.15s", flexShrink: 0,
            }}
            onMouseEnter={e => { if (novoExtra.data && !adicionando) e.currentTarget.style.background = "#4f52d9"; }}
            onMouseLeave={e => { if (novoExtra.data && !adicionando) e.currentTarget.style.background = t.accent; }}
          >
            {adicionando ? "..." : "+ Add"}
          </button>
        </div>

        {/* Lista */}
        {extrasDoMes.length === 0 ? (
          <p style={{ fontSize: "12px", color: t.textMuted, textAlign: "center", padding: "10px 0", fontStyle: "italic" }}>
            Nenhum culto extra neste mês
          </p>
        ) : (
          <div style={{ borderRadius: "6px", border: `1px solid ${t.border}`, overflow: "hidden" }}>
            {extrasDoMes.map((e, i) => (
              <div
                key={e.id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "7px 10px",
                  borderBottom: i < extrasDoMes.length - 1 ? `1px solid ${t.border}` : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "7px", minWidth: 0 }}>
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: t.accent, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    {e.descricao && (
                      <div style={{ fontSize: "11px", fontWeight: 700, color: t.accent, textTransform: "uppercase", letterSpacing: "0.3px", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e.descricao}
                      </div>
                    )}
                    <div style={{ fontSize: "11px", color: t.textMuted, fontWeight: 400, lineHeight: 1.4 }}>
                      {formatarData(e.data, e.turno)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemover(e.firestoreId)}
                  title="Remover culto extra"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: t.textMuted, padding: "2px 5px", borderRadius: "4px",
                    fontSize: "14px", lineHeight: 1, fontFamily: "inherit",
                    transition: "color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = t.danger; e.currentTarget.style.background = t.dangerDim; }}
                  onMouseLeave={e => { e.currentTarget.style.color = t.textMuted; e.currentTarget.style.background = "none"; }}
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
