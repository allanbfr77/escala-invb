import { useState, useMemo, useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import RelatorioUnificado from "./pages/RelatorioUnificado";
import { isMaster } from "./utils/permissions";
import { getMesInicial, getMesMinimo, getMesMaximo } from "./utils/mesHelpers";

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
  const [view, setView] = useState(null);
  const [mes, setMes] = useState(getMesInicial);
  const mesMinimo = useMemo(() => getMesMinimo(), []);
  const mesMaximo = useMemo(() => getMesMaximo(), []);
  const master = isMaster(user);

  useEffect(() => {
    if (!user) setView(null);
  }, [user?.uid]);

  if (loading) return <LoadingScreen />;
  if (!user) return <Login />;

  const activeView = view ?? (master ? "relatorio" : "escala");

  if (activeView === "relatorio" && master) {
    return (
      <RelatorioUnificado
        mes={mes}
        setMes={setMes}
        mesMinimo={mesMinimo}
        mesMaximo={mesMaximo}
        onVoltar={() => setView("escala")}
      />
    );
  }

  return (
    <Dashboard
      mes={mes}
      setMes={setMes}
      mesMinimo={mesMinimo}
      mesMaximo={mesMaximo}
      onOpenRelatorio={master ? () => setView("relatorio") : undefined}
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