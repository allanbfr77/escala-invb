import { useState, useRef } from "react";
import { theme } from "../constants/theme";

export default function DownloadButton({ baixando, podeEditar, onDownload }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  return (
    <div
      ref={menuRef}
      style={{ position: "relative", display: "inline-flex" }}
      onBlur={e => {
        if (!menuRef.current?.contains(e.relatedTarget)) setShowMenu(false);
      }}
    >
      <button
        onClick={() => {
          if (window.innerWidth <= 768) {
            onDownload("mobile");
          } else {
            setShowMenu(v => !v);
          }
        }}
        disabled={baixando || !podeEditar}
        title={!podeEditar ? "Disponível apenas no modo de edição" : "Baixar escala"}
        style={{
          padding: "5px 10px",
          background: "transparent",
          border: `1px solid ${theme.border}`,
          borderRadius: "5px",
          color: !podeEditar ? theme.textDim : theme.textMuted,
          fontSize: "12px",
          cursor: (baixando || !podeEditar) ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          display: "flex", alignItems: "center", gap: "5px",
          transition: "all 0.15s",
          opacity: !podeEditar ? 0.35 : 1,
        }}
        onMouseEnter={e => {
          if (!baixando && podeEditar) {
            e.currentTarget.style.borderColor = theme.accent;
            e.currentTarget.style.color = theme.accent;
            e.currentTarget.style.background = theme.accentGlow;
          }
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = theme.border;
          e.currentTarget.style.color = !podeEditar ? theme.textDim : theme.textMuted;
          e.currentTarget.style.background = "transparent";
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span className="btn-label">{baixando ? "Gerando..." : "Baixar escala"}</span>
        <svg
          className="download-chevron"
          xmlns="http://www.w3.org/2000/svg" width="10" height="10"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ marginLeft: "2px", transition: "transform 0.15s", transform: showMenu ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {showMenu && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          right: 0,
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: "7px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          zIndex: 200,
          minWidth: "170px",
          overflow: "hidden",
        }}>
          <div style={{ padding: "6px 10px 4px", fontSize: "9px", fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: "0.6px" }}>
            Formato de download
          </div>
          {[
            { label: "Tabela (Web)",   icon: "▤", layout: "web",    desc: "linhas e colunas" },
            { label: "Cards (Mobile)", icon: "⊞", layout: "mobile", desc: "cards por culto"  },
          ].map(opt => (
            <button
              key={opt.layout}
              onClick={() => { setShowMenu(false); onDownload(opt.layout); }}
              style={{
                width: "100%", textAlign: "left", background: "none",
                border: "none", padding: "8px 12px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "10px",
                color: theme.text, fontFamily: "inherit",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = theme.accentGlow}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              <span style={{ fontSize: "15px", lineHeight: 1, color: theme.accent }}>{opt.icon}</span>
              <div>
                <div style={{ fontSize: "12px", fontWeight: 600 }}>{opt.label}</div>
                <div style={{ fontSize: "10px", color: theme.textMuted }}>{opt.desc}</div>
              </div>
            </button>
          ))}
          <div style={{ height: "4px" }} />
        </div>
      )}
    </div>
  );
}
