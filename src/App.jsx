import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{
      minHeight:"100vh",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",
      background:"linear-gradient(135deg,#0f1117 0%,#161922 100%)",gap:"20px",
    }}>
      <div style={{
        width:"36px",height:"36px",borderRadius:"50%",
        border:"3px solid rgba(99,102,241,0.2)",borderTopColor:"#6366f1",
        animation:"spin 0.75s linear infinite",
      }}/>
      <span style={{fontSize:"13px",color:"#94a3b8",fontFamily:"'Outfit',sans-serif"}}>
        Carregando...
      </span>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );

  return user ? <Dashboard /> : <Login />;
}