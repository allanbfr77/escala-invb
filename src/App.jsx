import { useAuth } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

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

  if (loading) return <LoadingScreen />;

  return user ? <Dashboard /> : <Login />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}