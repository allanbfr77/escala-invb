import { theme } from "../constants/theme";

export default function NavBar({ mes, mesMinimo, mesMaximo, user, logout, onMesAnterior, onMesProximo }) {
  const podeRetroceder = mes > mesMinimo;
  const podeAvancar    = mes < mesMaximo;

  return (
    <header className="header-pad" style={{
      borderBottom: `1px solid ${theme.border}`, background: theme.surface,
      padding: "0 24px", height: "48px", display: "flex", alignItems: "center",
      justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Logo */}
        <div style={{ width: "26px", height: "26px", borderRadius: "7px", background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentGradientEnd})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={theme.accentOnAccent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <span className="header-title" style={{ fontWeight: 600, fontSize: "13px", letterSpacing: "-0.2px", color: theme.text }}>
          Escala INVB
        </span>
        <span className="header-sep" style={{ color: theme.border, fontSize: "16px" }}>|</span>

        {/* Navegação de mês */}
        <div className="mes-nav" style={{ display: "flex", alignItems: "center", gap: "1px", background: theme.bg, borderRadius: "7px", padding: "2px 3px", border: `1px solid ${theme.border}` }}>
          <button
            onClick={onMesAnterior}
            disabled={!podeRetroceder}
            title={!podeRetroceder ? "Mês mais antigo disponível" : undefined}
            style={{ background: "transparent", border: "none", cursor: podeRetroceder ? "pointer" : "not-allowed", color: podeRetroceder ? theme.textMuted : theme.textDim, padding: "2px 8px", borderRadius: "5px", fontSize: "13px", lineHeight: 1, fontFamily: "'Outfit', sans-serif", opacity: podeRetroceder ? 1 : 0.35, transition: "all 0.15s" }}
            onMouseEnter={e => { if (podeRetroceder) { e.currentTarget.style.color = theme.text; e.currentTarget.style.background = theme.surface; } }}
            onMouseLeave={e => { if (podeRetroceder) { e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.background = "transparent"; } }}
          >‹</button>
          <span style={{ color: theme.text, fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", minWidth: "86px", textAlign: "center", fontWeight: 500, letterSpacing: "0.5px" }}>
            {new Date(mes + "-15").toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "").toUpperCase()}
          </span>
          <button
            onClick={onMesProximo}
            disabled={!podeAvancar}
            title={!podeAvancar ? "Dezembro é o último mês disponível" : undefined}
            style={{ background: podeAvancar ? theme.accentDim : "transparent", border: "none", cursor: podeAvancar ? "pointer" : "not-allowed", color: podeAvancar ? theme.accent : theme.textDim, padding: "2px 8px", borderRadius: "5px", fontSize: "13px", lineHeight: 1, fontFamily: "'Outfit', sans-serif", opacity: podeAvancar ? 1 : 0.35, transition: "all 0.15s" }}
            onMouseEnter={e => { if (podeAvancar) { e.currentTarget.style.background = theme.accent; e.currentTarget.style.color = theme.accentOnAccent; } }}
            onMouseLeave={e => { if (podeAvancar) { e.currentTarget.style.background = theme.accentDim; e.currentTarget.style.color = theme.accent; } }}
          >›</button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span className="header-email" style={{ fontSize: "12px", color: theme.textMuted }}>Olá, {user?.email}</span>
        <button
          onClick={logout}
          style={{ padding: "4px 12px", background: "transparent", border: `1px solid ${theme.border}`, borderRadius: "5px", color: theme.textMuted, fontSize: "12px", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = theme.danger; e.currentTarget.style.color = theme.danger; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}
        >Sair</button>
      </div>
    </header>
  );
}
