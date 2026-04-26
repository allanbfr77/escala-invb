import { useState, useRef, useEffect } from "react";

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
    id: "recepcao", nome: "INTRODUÇÃO",
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

const CORES_MIN = {
  comunicacao: { color: "#60a5fa", bg: "rgba(96,165,250,0.09)",  border: "rgba(96,165,250,0.28)"  },
  louvor:      { color: "#a78bfa", bg: "rgba(167,139,250,0.09)", border: "rgba(167,139,250,0.28)" },
  recepcao:    { color: "#34d399", bg: "rgba(52,211,153,0.09)",  border: "rgba(52,211,153,0.28)"  },
  infantil:    { color: "#f472b6", bg: "rgba(244,114,182,0.09)", border: "rgba(244,114,182,0.28)" },
};

export { ministerios, CORES_MIN };

export default function MinisterioDropdown({
  ministerioSelecionado, setMinisterioSelecionado,
  usuario, podeEditar, onConflito, t, sLabel, sField,
}) {
  const [aberto, setAberto] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setAberto(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const atual    = ministerios.find(m => m.id === ministerioSelecionado);
  const corAtual = CORES_MIN[ministerioSelecionado] || { color: t.accent, bg: t.accentDim, border: t.accent };
  const isMeuAtual = ministerioSelecionado === usuario?.ministerioId;

  return (
    <div style={{ ...sField, position: "relative" }} ref={dropRef}>
      <label style={sLabel}>Ministério</label>

      <button
        onClick={() => setAberto(v => !v)}
        style={{
          width: "100%", padding: "9px 12px",
          borderRadius: aberto ? "6px 6px 0 0" : "6px",
          border: `1px solid ${aberto ? corAtual.border : t.border}`,
          background: t.bg, color: t.text,
          fontSize: "13px", fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer", transition: "border-color 0.15s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isMeuAtual && (
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: corAtual.color, flexShrink: 0 }} />
          )}
          <span>{atual?.nome}</span>
          {isMeuAtual && (
            <span style={{
              fontSize: "9px", fontWeight: 700, color: corAtual.color,
              background: corAtual.bg, border: `1px solid ${corAtual.border}`,
              borderRadius: "8px", padding: "1px 6px", letterSpacing: "0.3px",
            }}>meu</span>
          )}
        </div>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke={t.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transition: "transform 0.2s", transform: aberto ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {aberto && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
          background: t.surface,
          border: `1px solid ${t.border}`, borderTop: "none",
          borderRadius: "0 0 6px 6px",
          overflow: "hidden",
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        }}>
          {ministerios.map((m, i) => {
            const isMeu      = m.id === usuario?.ministerioId;
            const isSelected = ministerioSelecionado === m.id;
            const cor        = CORES_MIN[m.id] || { color: t.accent, bg: t.accentDim, border: t.accent };
            return (
              <button
                key={m.id}
                onClick={() => { setMinisterioSelecionado(m.id); onConflito?.(null); setAberto(false); }}
                style={{
                  width: "100%", padding: "9px 12px",
                  borderBottom: i < ministerios.length - 1 ? `1px solid ${t.border}` : "none",
                  background: isSelected ? cor.bg : "transparent",
                  border: "none", borderLeft: `3px solid ${isMeu ? cor.color : "transparent"}`,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  cursor: "pointer", fontFamily: "inherit", transition: "background 0.12s",
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = cor.bg; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{
                  fontSize: "13px",
                  fontWeight: isSelected ? 700 : isMeu ? 600 : 400,
                  color: isSelected ? cor.color : isMeu ? cor.color : t.text,
                }}>
                  {m.nome}
                </span>
                {isMeu && (
                  <span style={{
                    fontSize: "9px", fontWeight: 700,
                    color: cor.color, background: cor.bg,
                    border: `1px solid ${cor.border}`,
                    borderRadius: "8px", padding: "1px 6px",
                    letterSpacing: "0.3px", flexShrink: 0,
                  }}>meu</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {!podeEditar && (
        <div style={{ marginTop: "8px", padding: "8px 10px", borderRadius: "6px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", display: "flex", alignItems: "center", gap: "7px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 9V14M12 17.5V18M12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: "11px", color: "#f87171", fontWeight: 600, letterSpacing: "0.3px" }}>SOMENTE LEITURA</span>
        </div>
      )}
    </div>
  );
}
