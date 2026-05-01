import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { theme, accentAlpha } from "./constants/theme";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{
      minHeight:"100vh",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",
      background:`linear-gradient(145deg,${theme.bg} 0%,${theme.surface} 100%)`,gap:"20px",
    }}>
      <div style={{
        width:"36px",height:"36px",borderRadius:"50%",
        border:`3px solid ${accentAlpha(0.22)}`,borderTopColor:theme.accent,
        animation:"spin 0.75s linear infinite",
      }}/>
      <span style={{fontSize:"13px",color:theme.textMuted,fontFamily:"'Outfit',sans-serif"}}>
        Carregando...
      </span>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );

  return user ? <Dashboard /> : <Login />;
}