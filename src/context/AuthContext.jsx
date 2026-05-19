import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // browserSessionPersistence usa sessionStorage:
    // - sobrevive a F5 / recarregar página ✓
    // - sobrevive a navegar em outra aba e voltar ✓
    // - é apagado quando o usuário fecha a aba/janela ✓
    let unsubscribe = () => {};

    setPersistence(auth, browserSessionPersistence).then(() => {
      unsubscribe = onAuthStateChanged(auth, async (u) => {
        if (u) {
          const ref = doc(db, "users", u.uid);
          const snap = await getDoc(ref);
          if (!snap.exists()) {
            console.warn("AuthContext: usuário logado sem documento de perfil", u.uid);
            setUser(null);
            setLoading(false);
            return;
          }
          setUser({ uid: u.uid, ...snap.data() });
        } else {
          setUser(null);
        }
        setLoading(false);
      });
    }).catch((error) => {
      console.error("AuthContext: falha ao definir persistência de sessão", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
