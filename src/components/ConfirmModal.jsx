// ===== src/components/ConfirmModal.jsx =====
export default function ConfirmModal({ aberto, titulo, descricao, confirmLabel = "Confirmar", onConfirmar, onCancelar, perigoso = false, theme: t }) {
  if (!aberto) return null;

  const corConfirm = perigoso ? t.danger : t.accent;
  const bgConfirm  = perigoso ? t.dangerDim : t.accentDim;

  return (
    <div
      onClick={onCancelar}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "400px",
          background: "rgba(14,14,27,0.97)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          border: `1px solid ${t.accentBorder}`,
          borderRadius: "12px", padding: "24px",
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        {/* Ícone de aviso */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "10px",
            background: bgConfirm, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 9V14M12 17.5V18M12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12C21 16.97 16.97 21 12 21Z"
                stroke={corConfirm} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Título */}
        <p style={{ fontSize: "16px", fontWeight: 600, color: t.text, marginBottom: "8px" }}>
          {titulo}
        </p>

        {/* Descrição */}
        <p style={{ fontSize: "13px", color: t.textMuted, lineHeight: "1.6", marginBottom: "24px" }}>
          {descricao}
        </p>

        {/* Botões */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            onClick={onCancelar}
            style={{
              padding: "8px 18px", borderRadius: "6px", cursor: "pointer",
              background: bgConfirm, border: `1px solid ${corConfirm}`,
              color: corConfirm, fontSize: "13px", fontFamily: "inherit", fontWeight: 600,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = corConfirm; e.currentTarget.style.color = "white"; }}
            onMouseLeave={e => { e.currentTarget.style.background = bgConfirm; e.currentTarget.style.color = corConfirm; }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            style={{
              padding: "8px 18px", borderRadius: "6px", cursor: "pointer",
              background: "transparent", border: `1px solid ${t.border}`,
              color: t.textMuted, fontSize: "13px", fontFamily: "inherit", fontWeight: 500,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              if (!perigoso) {
                e.currentTarget.style.borderColor = "rgba(52,211,153,0.5)";
                e.currentTarget.style.color = "#34d399";
                e.currentTarget.style.background = "rgba(52,211,153,0.08)";
              } else {
                e.currentTarget.style.borderColor = t.borderLight;
                e.currentTarget.style.color = t.text;
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = t.border;
              e.currentTarget.style.color = t.textMuted;
              e.currentTarget.style.background = "transparent";
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
