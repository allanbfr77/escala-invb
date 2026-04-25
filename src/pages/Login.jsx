// ===== src/pages/Login.jsx =====
import { useState, useRef, useEffect } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const theme = {
  bg: "#0F1117",
  surface: "#161922",
  border: "#232838",
  borderLight: "#2e3650",
  accent: "#6366F1",
  accentDim: "rgba(99,102,241,0.12)",
  accentGlow: "rgba(99,102,241,0.08)",
  text: "#e2e8f0",
  textMuted: "#94A3B8",
  textDim: "#3a4258",
  danger: "#fb7185",
  dangerDim: "rgba(251,113,133,0.1)",
};

const perfis = [
  { id: "comunicacao", nome: "MINISTÉRIO DE COMUNICAÇÕES", img: "/ministerios/comunicacoes.jpg", desc: "Líderes: ALAN e JEAN" },
  { id: "louvor",      nome: "MINISTÉRIO DE LOUVOR",       img: "/ministerios/louvor.jpg",        desc: "Líderes: ALESSANDRO e RAPHAELA" },
  { id: "recepcao",   nome: "MINISTÉRIO DE INTRODUÇÃO",    img: "/ministerios/recepcao.jpg",       desc: "Líder: Dc. ATAYDE" },
  { id: "infantil",   nome: "MINISTÉRIO DE INFANTIL",     img: "/ministerios/infantil.jpg",       desc: "Líder: MARÍLIA" },
];

function mensagemDeErro(codigo) {
  switch (codigo) {
    case "auth/invalid-email":       return "Formato de email inválido";
    case "auth/user-not-found":      return "Nenhuma conta encontrada com este email";
    case "auth/wrong-password":      return "Senha incorreta";
    case "auth/invalid-credential":  return "Email ou senha incorretos";
    case "auth/too-many-requests":   return "Muitas tentativas. Aguarde um momento e tente novamente";
    case "auth/network-request-failed": return "Sem conexão. Verifique sua internet e tente novamente";
    case "auth/user-disabled":       return "Esta conta foi desativada. Fale com o administrador";
    default:                         return "Erro ao fazer login. Tente novamente";
  }
}

function validar(email, senha) {
  if (!email.trim()) return "Informe seu email";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Formato de email inválido";
  if (!senha) return "Informe sua senha";
  if (senha.length < 6) return "A senha deve ter pelo menos 6 caracteres";
  return null;
}

export default function Login() {
  const [perfilSelecionado, setPerfilSelecionado] = useState(null);
  const [email, setEmail]               = useState("");
  const [senha, setSenha]               = useState("");
  const [erro, setErro]                 = useState("");
  const [carregando, setCarregando]     = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [hoveredId, setHoveredId]       = useState(null);   // for hover effects
  const [pressedId, setPressedId]       = useState(null);   // for click press

  const emailRef = useRef(null);

  // Auto-foco no email quando o formulário abre
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
      const cred = await signInWithEmailAndPassword(auth, email.trim(), senha);

      // Valida se as credenciais pertencem ao ministério selecionado
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      const userData = snap.data();

      if (!userData || userData.ministerioId !== perfilSelecionado.id) {
        await signOut(auth);
        setErro(`Este email não pertence ao ${perfilSelecionado.nome}`);
        setCarregando(false);
        setSenha("");
        return;
      }
      // Sucesso — AuthContext vai detectar o login e redirecionar
    } catch (err) {
      setErro(mensagemDeErro(err.code));
      setCarregando(false);
      setSenha("");
    }
  };

  // Caret horizontal position: col 0/2 = left (~25%), col 1/3 = right (~75%)
  const perfilIdx  = perfis.findIndex(p => p.id === perfilSelecionado?.id);
  const caretLeft  = perfilIdx % 2 === 0 ? "25%" : "75%";
  const formAtiva  = !!perfilSelecionado;

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

        .login-input {
          width: 100%; padding: 9px 12px; border-radius: 6px;
          border: 1px solid ${theme.border}; background: ${theme.bg};
          color: ${theme.text}; font-size: 14px; font-family: inherit;
          outline: none; transition: border-color 0.15s, box-shadow 0.15s;
        }
        .login-input:focus {
          border-color: ${theme.accent};
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }
        .login-input:disabled { opacity: 0.5; cursor: not-allowed; }

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
          .login-card { max-width: 100% !important; }
          .login-grid { grid-template-columns: 1fr 1fr !important; }
          .logo-title { font-size: 22px !important; }
        .logo-sub   { font-size: 12px !important; }
          .perfil-img { height: 100px !important; }
          .perfil-nome { font-size: 9px !important; letter-spacing: 0 !important; }
          .perfil-desc { font-size: 8px !important; }
        }
      `}</style>

      {/* Logo */}
      <div style={{ marginBottom: "32px", textAlign: "center" }}>

        {/* Badge de sistema */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          background: "rgba(52,211,153,0.08)",
          border: "1px solid rgba(52,211,153,0.22)",
          borderRadius: "20px", padding: "3px 10px",
          marginBottom: "12px",
        }}>
          <div style={{
            width: "5px", height: "5px", borderRadius: "50%",
            background: "#34d399",
            boxShadow: "0 0 6px rgba(52,211,153,0.8)",
          }} />
          <span style={{
            fontSize: "10px", fontWeight: 700, color: "#34d399",
            textTransform: "uppercase", letterSpacing: "1px",
            fontFamily: "'DM Mono', monospace",
          }}>
            Sistema de Escala · v1.0.0
          </span>
        </div>

        {/* Título principal */}
        <h1
          className="logo-title"
          style={{
            fontSize: "28px", fontWeight: 700,
            letterSpacing: "-0.6px", lineHeight: 1.15,
            marginBottom: "8px",
            background: "linear-gradient(135deg, #e6edf3 20%, #7db8ff 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Selecione o seu perfil para continuar
        </h1>

        {/* Subtítulo */}
        <p
          className="logo-sub"
          style={{
            fontSize: "14px", color: theme.textMuted,
            fontWeight: 400, letterSpacing: "0.1px",
          }}
        >
          Clique em um dos cards abaixo para fazer login
        </p>
      </div>

      <div className="login-card" style={{ width: "100%", maxWidth: "520px" }}>

        {/* Grid de perfis */}
        <div
          className="login-grid"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}
        >
          {perfis.map((p, idx) => {
            const sel      = perfilSelecionado?.id === p.id;
            const hovered  = hoveredId === p.id;
            const pressed  = pressedId === p.id;
            const outro    = formAtiva && !sel; // non-selected while form is active

            // Scale: pressed > selected > hover > others
            let scale = "scale(1)";
            if (pressed)                      scale = "scale(0.97)";
            else if (sel)                     scale = "scale(1.03)";
            else if (hovered && !formAtiva)   scale = "scale(1.05)";

            return (
              <button
                key={p.id}
                onClick={() => { setPerfilSelecionado(p); setErro(""); }}
                onMouseEnter={() => setHoveredId(p.id)}
                onMouseLeave={() => { setHoveredId(null); setPressedId(null); }}
                onMouseDown={() => setPressedId(p.id)}
                onMouseUp={() => setPressedId(null)}
                disabled={carregando}
                style={{
                  padding: 0, cursor: "pointer", textAlign: "left",
                  outline: "none", overflow: "hidden",
                  background: sel ? "rgba(99,102,241,0.18)" : theme.surface,
                  border: `2px solid ${sel ? theme.accent : theme.border}`,
                  borderRadius: "10px",
                  transform: scale,
                  boxShadow: sel
                    ? `0 0 0 3px rgba(99,102,241,0.15), 0 4px 20px rgba(47,129,247,0.2)`
                    : hovered && !formAtiva
                      ? "0 4px 16px rgba(0,0,0,0.3)"
                      : "none",
                  // Blur + dim non-selected cards when form is active (unless hovered)
                  filter: (outro && !hovered) ? "blur(1.5px) saturate(0.5)" : "none",
                  opacity: (outro && !hovered) ? 0.45 : carregando ? 0.6 : 1,
                  transition: "transform 0.18s ease, background 0.2s ease, opacity 0.25s ease, filter 0.25s ease, box-shadow 0.18s ease, border-color 0.18s ease",
                }}
              >
                <div
                  className="perfil-img"
                  style={{ width: "100%", height: "130px", background: theme.bg, overflow: "hidden" }}
                >
                  <img
                    src={p.img} alt={p.nome}
                    style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", padding: "12px" }}
                  />
                </div>
                <div style={{ padding: "10px 12px" }}>
                  <div
                    className="perfil-nome"
                    style={{ fontSize: "11px", fontWeight: 700, color: sel ? theme.accent : theme.text, letterSpacing: "0.3px", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                  >
                    {p.nome}
                  </div>
                  <div
                    className="perfil-desc"
                    style={{ fontSize: "10px", color: theme.textMuted, marginTop: "3px", lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                  >
                    {p.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Formulário com caret apontando para o card selecionado */}
        <div style={{
          overflow: "hidden",
          maxHeight: formAtiva ? "380px" : "0px",
          opacity: formAtiva ? 1 : 0,
          transition: "max-height 0.3s ease, opacity 0.25s ease",
        }}>
          {/* Wrapper com paddingTop para o caret flutuar acima do card */}
          <div style={{ paddingTop: "10px", position: "relative" }}>

            {/* Caret — triângulo apontando para o card selecionado */}
            <div style={{
              position: "absolute",
              top: "0px",
              left: caretLeft,
              transform: "translateX(-50%)",
              width: 0, height: 0,
              borderLeft: "9px solid transparent",
              borderRight: "9px solid transparent",
              borderBottom: `9px solid ${theme.accent}`,
              transition: "left 0.25s ease",
              zIndex: 1,
            }}>
              {/* Inner fill — cobre a borda interna do triângulo com a cor do card */}
              <div style={{
                position: "absolute",
                top: "2px",
                left: "-7px",
                width: 0, height: 0,
                borderLeft: "7px solid transparent",
                borderRight: "7px solid transparent",
                borderBottom: `7px solid ${theme.surface}`,
              }} />
            </div>

            {/* Card do formulário */}
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
                  className="login-input"
                  value={email}
                  placeholder="nome@invb.com"
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
                    className="login-input"
                    value={senha}
                    placeholder="••••••••"
                    disabled={carregando}
                    onChange={e => { setSenha(e.target.value); setErro(""); }}
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                    autoComplete="current-password"
                    style={{ paddingRight: "38px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(v => !v)}
                    tabIndex={-1}
                    title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
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
                  >
                    {mostrarSenha ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/>
                      </svg>
                    ) : (
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
    </div>
  );
}
