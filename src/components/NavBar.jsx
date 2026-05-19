import { useTheme } from "../context/ThemeContext";

export default function NavBar({ mes, mesMinimo, mesMaximo, user, logout, onMesAnterior, onMesProximo }) {
  const { isDark, toggleTheme } = useTheme();

  const podeRetroceder = mes > mesMinimo;
  const podeAvancar = mes < mesMaximo;

  return (
    <header className="navbar" style={{
      borderBottom: "1px solid var(--border)",
      background: "var(--bg)",
      color: "var(--text)",
      padding: "0 24px",
      height: "48px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Logo */}
        <div style={{
          width: "26px",
          height: "26px",
          borderRadius: "7px",
          background: "var(--text)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <span style={{ fontWeight: 600, fontSize: "13px", letterSpacing: "-0.2px", color: "var(--text)" }}>
          Escala INVB
        </span>
        <span style={{ color: "var(--border)", fontSize: "16px" }}>|</span>

        {/* Navegação de mês */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "1px",
          background: "var(--bg)",
          borderRadius: "7px",
          padding: "2px 3px",
          border: "1px solid var(--border)",
        }}>
          <button
            onClick={onMesAnterior}
            disabled={!podeRetroceder}
            title={!podeRetroceder ? "Mês mais antigo disponível" : undefined}
            style={{
              background: "transparent",
              border: "none",
              cursor: podeRetroceder ? "pointer" : "not-allowed",
              color: "var(--text)",
              padding: "2px 8px",
              borderRadius: "5px",
              fontSize: "13px",
              lineHeight: 1,
              fontFamily: "'Outfit', sans-serif",
              opacity: podeRetroceder ? 1 : 0.35,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              if (podeRetroceder) {
                e.currentTarget.style.opacity = "0.7";
              }
            }}
            onMouseLeave={e => {
              if (podeRetroceder) {
                e.currentTarget.style.opacity = "1";
              }
            }}
          >‹</button>
          <span style={{
            color: "var(--text)",
            fontSize: "12px",
            fontFamily: "'JetBrains Mono', monospace",
            minWidth: "86px",
            textAlign: "center",
            fontWeight: 500,
            letterSpacing: "0.5px",
          }}>
            {new Date(mes + "-15").toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "").toUpperCase()}
          </span>
          <button
            onClick={onMesProximo}
            disabled={!podeAvancar}
            title={!podeAvancar ? "Dezembro é o último mês disponível" : undefined}
            style={{
              background: "transparent",
              border: "none",
              cursor: podeAvancar ? "pointer" : "not-allowed",
              color: "var(--text)",
              padding: "2px 8px",
              borderRadius: "5px",
              fontSize: "13px",
              lineHeight: 1,
              fontFamily: "'Outfit', sans-serif",
              opacity: podeAvancar ? 1 : 0.35,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              if (podeAvancar) {
                e.currentTarget.style.opacity = "0.7";
              }
            }}
            onMouseLeave={e => {
              if (podeAvancar) {
                e.currentTarget.style.opacity = "1";
              }
            }}
          >›</button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* Botão toggle tema */}
        <button
          onClick={toggleTheme}
          title={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "5px",
            color: "var(--text)",
            fontSize: "14px",
            cursor: "pointer",
            padding: "3px 8px",
            lineHeight: 1,
            transition: "all 0.15s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.opacity = "0.7";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.opacity = "1";
          }}
        >{isDark ? "☀️" : "🌙"}</button>

        <span style={{ fontSize: "12px", color: "var(--text)" }}>Olá, {user?.email}</span>
        <button
          onClick={logout}
          style={{
            padding: "4px 12px",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "5px",
            color: "var(--text)",
            fontSize: "12px",
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.opacity = "0.7";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.opacity = "1";
          }}
        >Sair</button>
      </div>
    </header>
  );
}