// ===== src/pages/Login.jsx =====
import { useState, useRef, useEffect } from "react";
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
  dangerDim: "rgba(248,81,73,0.1)",
};

const perfis = [
  { id: "comunicacao", nome: "MINISTÉRIO DE COMUNICAÇÕES", img: "/ministerios/comunicacoes.jpg", desc: "Líderes: ALAN e JEAN" },
  { id: "louvor",      nome: "MINISTÉRIO DE LOUVOR",       img: "/ministerios/louvor.jpg",        desc: "Líderes: ALESSANDRO e RAPHAELA" },
  { id: "recepcao",   nome: "MINISTÉRIO DE RECEPÇÃO",     img: "/ministerios/recepcao.jpg",       desc: "Líder: Dc. ATAYDE" },
  { id: "infantil",   nome: "MINISTÉRIO DE INFANTIL",     img: "/ministerios/infantil.jpg",       desc: "Líder: MARÍLIA" },
];

// Mensagens de erro humanizadas por código Firebase
function mensagemDeErro(codigo) {
  switch (codigo) {
    case "auth/invalid-email":
      return "Formato de email inválido";
    case "auth/user-not-found":
      return "Nenhuma conta encontrada com este email";
    case "auth/wrong-password":
      return "Senha incorreta";
    case "auth/invalid-credential":
      // Firebase v9+ combina user-not-found e wrong-password
      return "Email ou senha incorretos";
    case "auth/too-many-requests":
      return "Muitas tentativas. Aguarde um momento e tente novamente";
    case "auth/network-request-failed":
      return "Sem conexão. Verifique sua internet e tente novamente";
    case "auth/user-disabled":
      return "Esta conta foi desativada. Fale com o administrador";
    default:
      return "Erro ao fazer login. Tente novamente";
  }
}

// Validação client-side antes de ir ao Firebase
function validar(email, senha) {
  if (!email.trim()) return "Informe seu email";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Formato de email inválido";
  if (!senha) return "Informe sua senha";
  if (senha.length < 6) return "A senha deve ter pelo menos 6 caracteres";
  return null;
}

export default function Login() {
  const [perfilSelecionado, setPerfilSelecionado] = useState(null);
  const [email, setEmail]           = useState("");
  const [senha, setSenha]           = useState("");
  const [erro, setErro]             = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const emailRef = useRef(null);

  // Auto-foco no email quando o formulário abre (após a transição CSS)
  useEffect(() => {
    if (perfilSelecionado) {
      const t = setTimeout(() => emailRef.current?.focus(), 320);
      return () => clearTimeout(t);
    }
  }, [perfilSelecionado]);

  const handleLogin = async () => {
    const erroValidacao = validar(email, senha);
    if (erroValidacao) { setErro(erroValidacao); return; }

    setCarregando(true);
    setErro("");

    try {
      await signInWithEmailAndPassword(auth, email.trim(), senha);
      // sucesso → AuthContext redireciona automaticamente
    } catch (err) {
      setErro(mensagemDeErro(err.code));
      setCarregando(false);
      // Mantém o email preenchido; apenas limpa a senha
      setSenha("");
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: theme.bg,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif", padding: "16px",
    }}>
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

        .login-input {
          width: 100%; padding: 9px 12px; border-radius: 6px;
          border: 1px solid ${theme.border}; background: ${theme.bg};
          color: ${theme.text}; font-size: 14px; font-family: inherit;
          outline: none; transition: border-color 0.15s, box-shadow 0.15s;
        }
        .login-input:focus {
          border-color: ${theme.accent};
          box-shadow: 0 0 0 3px rgba(47,129,247,0.12);
        }
        .login-input:disabled { opacity: 0.5; cursor: not-allowed; }
        .login-input.erro { border-color: ${theme.danger} !important; }

        .btn-login {
          width: 100%; padding: 11px; border-radius: 6px; border: none;
          font-size: 14px; font-weight: 600; cursor: pointer;
          font-family: inherit; transition: all 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .btn-login:not(:disabled):hover { filter: brightness(1.1); }
        .btn-login:disabled { cursor: not-allowed; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 14px; height: 14px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.25);
          border-top-color: white;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }

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
        <div style={{
          width: "46px", height: "46px", borderRadius: "14px",
          margin: "0 auto 10px",
          background: `linear-gradient(135deg, ${theme.accent}, #388bfd)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
            fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
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
                disabled={carregando}
                style={{
                  background: sel ? theme.accentGlow : theme.surface,
                  border: `2px solid ${sel ? theme.accent : theme.border}`,
                  borderRadius: "10px",
                  transform: sel ? "scale(1.02)" : "scale(1)",
                  boxShadow: sel
                    ? `0 0 0 3px ${theme.accentGlow}, 0 4px 20px rgba(47,129,247,0.2)`
                    : "none",
                  opacity: carregando ? 0.6 : 1,
                }}
              >
                <div className="perfil-img" style={{ width: "100%", height: "130px", background: "#fff", overflow: "hidden" }}>
                  <img src={p.img} alt={p.nome} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", padding: "8px" }} />
                </div>
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
        <div style={{
          overflow: "hidden",
          maxHeight: perfilSelecionado ? "360px" : "0px",
          opacity: perfilSelecionado ? 1 : 0,
          transition: "max-height 0.3s ease, opacity 0.25s ease",
        }}>
          <div style={{
            background: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: "10px",
            padding: "18px",
          }}>
            <p style={{ fontSize: "11px", color: theme.textMuted, marginBottom: "14px" }}>
              Entrando como{" "}
              <span style={{ color: theme.accent, fontWeight: 600 }}>
                {perfilSelecionado?.nome}
              </span>
            </p>

            {/* Campo email */}
            <div style={{ marginBottom: "10px" }}>
              <label style={{
                fontSize: "10px", fontWeight: 600, color: theme.textMuted,
                textTransform: "uppercase", letterSpacing: "0.6px",
                display: "block", marginBottom: "5px",
              }}>
                Email
              </label>
              <input
                ref={emailRef}
                type="email"
                className={`login-input${erro && !email ? " erro" : ""}`}
                value={email}
                placeholder="seu@email.com"
                disabled={carregando}
                onChange={e => { setEmail(e.target.value); setErro(""); }}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                autoComplete="email"
              />
            </div>

            {/* Campo senha */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{
                fontSize: "10px", fontWeight: 600, color: theme.textMuted,
                textTransform: "uppercase", letterSpacing: "0.6px",
                display: "block", marginBottom: "5px",
              }}>
                Senha
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={mostrarSenha ? "text" : "password"}
                  className={`login-input${erro && !senha ? " erro" : ""}`}
                  value={senha}
                  placeholder="••••••••"
                  disabled={carregando}
                  onChange={e => { setSenha(e.target.value); setErro(""); }}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  autoComplete="current-password"
                  style={{ paddingRight: "38px" }}
                />
                {/* Botão mostrar/ocultar senha */}
                <button
                  type="button"
                  onClick={() => setMostrarSenha(v => !v)}
                  tabIndex={-1}
                  style={{
                    position: "absolute", right: "10px", top: "50%",
                    transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: theme.textMuted, padding: "2px",
                    display: "flex", alignItems: "center",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = theme.text}
                  onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}
                  title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {mostrarSenha ? (
                    /* Olho fechado */
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/>
                    </svg>
                  ) : (
                    /* Olho aberto */
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Mensagem de erro */}
            {erro && (
              <div style={{
                padding: "8px 12px", borderRadius: "6px",
                background: theme.dangerDim,
                border: `1px solid ${theme.danger}33`,
                color: theme.danger, fontSize: "12px",
                marginBottom: "12px",
                display: "flex", alignItems: "center", gap: "7px",
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M12 9V14M12 17.5V18M12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12C21 16.97 16.97 21 12 21Z"
                    stroke={theme.danger} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {erro}
              </div>
            )}

            {/* Botão entrar */}
            <button
              className="btn-login"
              onClick={handleLogin}
              disabled={carregando}
              style={{
                background: carregando ? theme.borderLight : theme.accent,
                color: carregando ? theme.textDim : "white",
              }}
            >
              {carregando && <span className="spinner" />}
              {carregando ? "Entrando..." : "Entrar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
