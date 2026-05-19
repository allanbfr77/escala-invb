// ===== src/components/ConfirmModal.jsx =====
export default function ConfirmModal({ aberto, titulo, descricao, confirmLabel = "Confirmar", onConfirmar, onCancelar, perigoso = false }) {
  if (!aberto) return null;

  return (
    <div
      onClick={onCancelar}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "var(--bg)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "24px",
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        {/* Ícone de aviso */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            background: perigoso ? "rgba(255, 0, 0, 0.1)" : "rgba(0, 0, 0, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 9V14M12 17.5V18M12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12C21 16.97 16.97 21 12 21Z"
                stroke={perigoso ? "var(--text)" : "var(--text)"}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Título */}
        <p style={{
          fontSize: "16px",
          fontWeight: 600,
          color: "var(--text)",
          marginBottom: "8px",
        }}>
          {titulo}
        </p>

        {/* Descrição */}
        <p style={{
          fontSize: "13px",
          color: "var(--text)",
          lineHeight: "1.6",
          marginBottom: "24px",
        }}>
          {descricao}
        </p>

        {/* Botões */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            onClick={onCancelar}
            style={{
              padding: "8px 18px",
              borderRadius: "6px",
              cursor: "pointer",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              fontSize: "13px",
              fontFamily: "inherit",
              fontWeight: 600,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.opacity = "0.7";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            style={{
              padding: "8px 18px",
              borderRadius: "6px",
              cursor: "pointer",
              background: "var(--text)",
              border: "1px solid var(--border)",
              color: "var(--bg)",
              fontSize: "13px",
              fontFamily: "inherit",
              fontWeight: 600,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.opacity = "0.8";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
