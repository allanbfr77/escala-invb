import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <p>Carregando...</p>;

  return user ? <Dashboard /> : <Login />;
}