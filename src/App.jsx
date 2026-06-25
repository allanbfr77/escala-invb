import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import RelatorioUnificado from "./pages/RelatorioUnificado";
import { hasMasterAccess } from "./utils/permissions";
import { getMesInicial, getMesMinimo, getMesMaximo } from "./utils/mesHelpers";
import {
  HASH_SECTIONS,
  parseAppHash,
  setAppHash,
  isDashboardHash,
  hasExplicitHash,
  resolveActiveView,
  getDefaultHashForUser,
} from "./utils/hashNavigation";

function LoadingScreen() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
      color: "var(--text)",
      gap: "20px",
    }}>
      <div style={{
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        border: `3px solid var(--border)`,
        borderTopColor: "var(--text)",
        animation: "spin 0.75s linear infinite",
      }} />
      <span style={{ fontSize: "13px", fontFamily: "'Outfit', sans-serif" }}>
        Carregando...
      </span>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [view, setView] = useState(() => {
    const hash = parseAppHash();
    if (hash === HASH_SECTIONS.RELATORIO_GERAL) return "relatorio";
    if (hash && isDashboardHash(hash)) return "escala";
    return null;
  });
  const [mes, setMes] = useState(getMesInicial);
  const mesMinimo = useMemo(() => getMesMinimo(), []);
  const mesMaximo = useMemo(() => getMesMaximo(), []);
  const master = hasMasterAccess(user);

  useEffect(() => {
    if (!loading && !user) setView(null);
  }, [user, loading]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      if (parseAppHash() !== HASH_SECTIONS.LOGIN) {
        setAppHash(HASH_SECTIONS.LOGIN, { replace: true });
      }
      return;
    }
    const hash = parseAppHash();
    if (hash === HASH_SECTIONS.LOGIN || !hasExplicitHash()) {
      setAppHash(getDefaultHashForUser(master), { replace: true });
    }
  }, [user, loading, master]);

  useEffect(() => {
    if (!user || loading) return;
    const syncViewFromHash = () => {
      const hash = parseAppHash();
      if (hash === HASH_SECTIONS.RELATORIO_GERAL && master) {
        setView("relatorio");
      } else if (hash && isDashboardHash(hash)) {
        setView("escala");
      }
    };
    syncViewFromHash();
    window.addEventListener("hashchange", syncViewFromHash);
    return () => window.removeEventListener("hashchange", syncViewFromHash);
  }, [user, loading, master]);

  const openRelatorioGeral = useCallback(() => {
    setView("relatorio");
    setAppHash(HASH_SECTIONS.RELATORIO_GERAL);
  }, []);

  const voltarParaEscala = useCallback(() => {
    setView("escala");
    setAppHash(HASH_SECTIONS.PLANILHA);
  }, []);

  if (loading) return <LoadingScreen />;
  if (!user) return <Login />;

  const activeView = resolveActiveView(view, master);

  if (activeView === "relatorio" && master) {
    return (
      <RelatorioUnificado
        mes={mes}
        setMes={setMes}
        mesMinimo={mesMinimo}
        mesMaximo={mesMaximo}
        onVoltar={voltarParaEscala}
      />
    );
  }

  return (
    <Dashboard
      mes={mes}
      setMes={setMes}
      mesMinimo={mesMinimo}
      mesMaximo={mesMaximo}
      onOpenRelatorio={master ? openRelatorioGeral : undefined}
    />
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
