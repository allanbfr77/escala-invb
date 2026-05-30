import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

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

    let unsubProfile = () => {};

    setPersistence(auth, browserSessionPersistence).then(() => {
      unsubscribe = onAuthStateChanged(auth, (u) => {
        unsubProfile();
        if (u) {
          const ref = doc(db, "users", u.uid);
          unsubProfile = onSnapshot(
            ref,
            (snap) => {
              if (!snap.exists()) {
                console.warn("AuthContext: usuário logado sem documento de perfil", u.uid);
                setUser(null);
              } else {
                setUser({ uid: u.uid, ...snap.data() });
              }
              setLoading(false);
            },
            (error) => {
              console.error("AuthContext: falha ao escutar perfil do usuário", error);
              setUser(null);
              setLoading(false);
            }
          );
        } else {
          setUser(null);
          setLoading(false);
        }
      });
    }).catch((error) => {
      console.error("AuthContext: falha ao definir persistência de sessão", error);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      unsubProfile();
    };
  }, []);

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
