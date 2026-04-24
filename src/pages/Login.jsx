// ===== src/pages/Login.jsx =====
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

const theme = {
  bg: "#0d1117",
  surface: "#161b22",
  surfaceHover: "#1c2128",
  border: "#21262d",
  borderLight: "#30363d",
  accent: "#2f81f7",
  accentDim: "#1a3a5c",
  accentGlow: "rgba(47,129,247,0.15)",
  text: "#e6edf3",
  textMuted: "#7d8590",
  textDim: "#484f58",
  danger: "#f85149",
  dangerDim: "rgba(248,81,73,0.15)",
};

const perfis = [
  { id: "comunicacao", nome: "MINISTÉRIO DE COMUNICAÇÕES", img: "/ministerios/comunicacoes.jpg", desc: "Líderes: ALAN e JEAN" },
  { id: "louvor",      nome: "MINISTÉRIO DE LOUVOR",       img: "/ministerios/louvor.jpg",        desc: "Líderes: ALESSANDRO e RAPHAELA" },
  { id: "recepcao",   nome: "MINISTÉRIO DE RECEPÇÃO",     img: "/ministerios/recepcao.jpg",       desc: "Líder: Dc. ATAYDE" },
  { id: "infantil",   nome: "MINISTÉRIO DE INFANTIL",     img: "/ministerios/infantil.jpg",       desc: "Líder: MARÍLIA" },
];

export default function Login() {
  const [perfilSelecionado, setPerfilSelecionado] = useState(null);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const handleLogin = async () => {
    if (!email || !senha) { setErro("Preencha email e senha"); return; }
    setCarregando(true);
    setErro("");
    try {
      await signInWithEmailAndPassword(auth, email, senha);
    } catch {
      setErro("Email ou senha incorretos");
      setCarregando(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: "16px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${theme.bg}; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px ${theme.surface} inset !important;
          -webkit-text-fill-color: ${theme.text} !important;
          caret-color: ${theme.text};
        }
        .perfil-btn {
          padding: 0; cursor: pointer; text-align: left;
          transition: all 0.2s; outline: none; overflow: hidden;
        }
        .perfil-btn:hover { transform: scale(1.02) !important; }
        @media (max-width: 480px) {
          .login-grid { grid-template-columns: 1fr 1fr !important; }
          .login-card { max-width: 100% !important; }
          .logo-title { font-size: 16px !important; }
          .perfil-img { height: 100px !important; }
          .perfil-nome { font-size: 10px !important; }
          .perfil-desc { display: none; }
        }
      `}</style>

      {/* Logo */}
      <div style={{ marginBottom: "28px", textAlign: "center" }}>
        <div style={{ width: "46px", height: "46px", borderRadius: "14px", margin: "0 auto 10px", background: `linear-gradient(135deg, ${theme.accent}, #388bfd)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <h1 className="logo-title" style={{ fontSize: "18px", fontWeight: 600, color: theme.text, letterSpacing: "-0.4px" }}>
          Sistema de Escala - INVB
        </h1>
        <p style={{ fontSize: "12px", color: theme.textMuted, marginTop: "4px" }}>
          Selecione seu ministério para continuar
        </p>
      </div>

      <div className="login-card" style={{ width: "100%", maxWidth: "520px" }}>

        {/* Grid de perfis */}
        <div className="login-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
          {perfis.map(p => {
            const sel = perfilSelecionado?.id === p.id;
            return (
              <button
                key={p.id}
                className="perfil-btn"
                onClick={() => { setPerfilSelecionado(p); setErro(""); }}
                style={{
                  background: sel ? theme.accentGlow : theme.surface,
                  border: `2px solid ${sel ? theme.accent : theme.border}`,
                  borderRadius: "10px",
                  transform: sel ? "scale(1.02)" : "scale(1)",
                  boxShadow: sel ? `0 0 0 3px ${theme.accentGlow}, 0 4px 20px rgba(47,129,247,0.2)` : "none",
                }}
              >
                {/* Imagem */}
                <div className="perfil-img" style={{ width: "100%", height: "130px", background: "#fff", overflow: "hidden" }}>
                  <img src={p.img} alt={p.nome} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", padding: "8px" }} />
                </div>
                {/* Label */}
                <div style={{ padding: "10px 12px" }}>
                  <div className="perfil-nome" style={{ fontSize: "11px", fontWeight: 700, color: sel ? theme.accent : theme.text, letterSpacing: "0.3px", lineHeight: 1.3 }}>
                    {p.nome}
                  </div>
                  <div className="perfil-desc" style={{ fontSize: "10px", color: theme.textMuted, marginTop: "3px", lineHeight: 1.4 }}>
                    {p.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Formulário */}
        <div style={{ overflow: "hidden", maxHeight: perfilSelecionado ? "320px" : "0px", opacity: perfilSelecionado ? 1 : 0, transition: "max-height 0.3s ease, opacity 0.25s ease" }}>
          <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "10px", padding: "18px" }}>
            <p style={{ fontSize: "11px", color: theme.textMuted, marginBottom: "14px" }}>
              Entrando como <span style={{ color: theme.accent, fontWeight: 600 }}>{perfilSelecionado?.nome}</span>
            </p>

            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "10px", fontWeight: 600, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.6px", display: "block", marginBottom: "5px" }}>Email</label>
              <input type="email" value={email} placeholder="seu@email.com"
                onChange={e => { setEmail(e.target.value); setErro(""); }}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "6px", border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: "14px", fontFamily: "inherit", outline: "none" }}
                onFocus={e => e.target.style.borderColor = theme.accent}
                onBlur={e => e.target.style.borderColor = theme.border}
              />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "10px", fontWeight: 600, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.6px", display: "block", marginBottom: "5px" }}>Senha</label>
              <input type="password" value={senha} placeholder="••••••••"
                onChange={e => { setSenha(e.target.value); setErro(""); }}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "6px", border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: "14px", fontFamily: "inherit", outline: "none" }}
                onFocus={e => e.target.style.borderColor = theme.accent}
                onBlur={e => e.target.style.borderColor = theme.border}
              />
            </div>

            {erro && (
              <div style={{ padding: "8px 12px", borderRadius: "6px", background: theme.dangerDim, border: `1px solid ${theme.danger}22`, color: theme.danger, fontSize: "12px", marginBottom: "12px" }}>
                ✕ {erro}
              </div>
            )}

            <button onClick={handleLogin} disabled={carregando}
              style={{ width: "100%", padding: "11px", borderRadius: "6px", border: "none", background: carregando ? theme.borderLight : theme.accent, color: carregando ? theme.textDim : "white", fontSize: "14px", fontWeight: 600, cursor: carregando ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
            >
              {carregando ? "Entrando..." : "Entrar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}