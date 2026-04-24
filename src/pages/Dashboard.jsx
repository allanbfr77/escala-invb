// ===== src/pages/Dashboard.jsx =====
import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { EscalaProvider, useEscalas } from "../context/EscalaContext";
import SidebarFiltros from "../components/SidebarFiltros";
import { db } from "../firebase";
import { collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
import html2canvas from "html2canvas";

import GridComunicacao from "../components/GridComunicacao";
import GridInfantil from "../components/GridInfantil";
import GridLouvor from "../components/GridLouvor";
import GridRecepcao from "../components/GridRecepcao";
import RelatorioMinisterio from "../components/RelatorioMinisterio";
import { funcoesPorMinisterio } from "../data/funcoes";

const theme = {
  bg: "#07070e",
  surface: "#0e0e1b",
  surfaceHover: "#131325",
  border: "#1a1a2c",
  borderLight: "#24243a",
  accent: "#a78bfa",
  accentDim: "#1c1540",
  accentGlow: "rgba(167,139,250,0.08)",
  text: "#ece9ff",
  textMuted: "#6a677f",
  textDim: "#32303f",
  danger: "#fb7185",
  dangerDim: "rgba(251,113,133,0.08)",
  success: "#34d399",
  successDim: "rgba(52,211,153,0.08)",
};

function DashboardContent({ ministerioSelecionado, setMinisterioSelecionado, mes, setMes }) {
  const { user, logout } = useAuth();
  const { escalas, datas, loading } = useEscalas();
  // ── NOVO: refreshKey dispara re-fetch no Sidebar quando uma escala é removida
  const [refreshKey, setRefreshKey] = useState(0);
  const [verRelatorio, setVerRelatorio] = useState(false);
  const [limpando, setLimpando] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [conflito, setConflito] = useState(null);
  const gridRef = useRef(null);
  const mainRef = useRef(null);

  const mostrarMensagem = (texto, tipo = "sucesso") => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 3000);
  };

  const podeEditar = user?.ministerioId === ministerioSelecionado;

  const handleMesAnterior = () => {
    const [ano, m] = mes.split("-").map(Number);
    setMes(new Date(ano, m - 2, 1).toISOString().slice(0, 7));
  };

  const handleMesProximo = () => {
    const [ano, m] = mes.split("-").map(Number);
    setMes(new Date(ano, m, 1).toISOString().slice(0, 7));
  };

  const handleDownload = async () => {
    if (!gridRef.current) return;
    setBaixando(true);

    try {
      const el = gridRef.current;

      const fullWidth  = el.scrollWidth;
      const fullHeight = el.scrollHeight;

      const clone = el.cloneNode(true);
      clone.style.position   = "fixed";
      clone.style.top        = "-99999px";
      clone.style.left       = "-99999px";
      clone.style.width      = fullWidth + "px";
      clone.style.height     = "auto";
      clone.style.overflow   = "visible";
      clone.style.zIndex     = "-1";

      clone.querySelectorAll("*").forEach(node => {
        node.style.overflow  = "visible";
        node.style.overflowX = "visible";
        node.style.overflowY = "visible";
      });

      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        backgroundColor: theme.bg,
        scale: 2,
        useCORS: true,
        width: clone.scrollWidth,
        height: clone.scrollHeight,
        windowWidth: clone.scrollWidth,
        windowHeight: clone.scrollHeight,
        scrollX: 0,
        scrollY: 0,
      });

      document.body.removeChild(clone);

      const link = document.createElement("a");
      link.download = `escala-${ministerioSelecionado}-${mes}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Erro ao gerar imagem:", err);
    } finally {
      setBaixando(false);
    }
  };

  const ministerioConfig = {
    comunicacao: {
      nome: "MINISTÉRIO DE COMUNICAÇÕES",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4l16 8-16 8V4z"/><path d="M12 12h8"/>
        </svg>
      ),
    },
    louvor: {
      nome: "MINISTÉRIO DE LOUVOR",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
        </svg>
      ),
    },
    recepcao: {
      nome: "MINISTÉRIO DE RECEPÇÃO",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
    infantil: {
      nome: "MINISTÉRIO INFANTIL",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2z"/>
          <path d="M8 22v-4a4 4 0 0 1 8 0v4"/>
          <path d="M6 11c-2 1-3 3-3 5v1h18v-1c0-2-1-4-3-5"/>
        </svg>
      ),
    },
  };

  // ── ALTERADO: incrementa refreshKey após remover para o Sidebar re-buscar
  const handleRemover = async (dataStr, turno, funcao) => {
    try {
      const q = query(
        collection(db, "escalas"),
        where("ministerioId", "==", ministerioSelecionado),
        where("data", "==", dataStr),
        where("turno", "==", turno),
        where("funcao", "==", funcao)
      );
      const snap = await getDocs(q);
      for (const doc of snap.docs) await deleteDoc(doc.ref);
      setRefreshKey(k => k + 1);
    } catch (err) { console.error(err); }
  };

  // ── ALTERADO: incrementa refreshKey após limpar tudo
  const handleLimparTudo = async () => {
    if (!window.confirm(`Limpar toda a escala de ${ministerioConfig[ministerioSelecionado].nome} deste mês?\n\nEssa ação não pode ser desfeita.`)) return;
    setLimpando(true);
    try {
      const [ano, mesNum] = mes.split("-");
      const inicio = `${ano}-${mesNum}-01`;
      const fim = `${ano}-${mesNum}-${new Date(ano, mesNum, 0).getDate()}`;
      const q = query(
        collection(db, "escalas"),
        where("ministerioId", "==", ministerioSelecionado),
        where("data", ">=", inicio),
        where("data", "<=", fim)
      );
      const snap = await getDocs(q);
      for (const doc of snap.docs) await deleteDoc(doc.ref);
      setRefreshKey(k => k + 1);
    } catch (err) { console.error(err); }
    finally { setLimpando(false); }
  };

  // Reset relatório ao trocar de ministério ou mês
  const handleSetMinisterio = (v) => { setMinisterioSelecionado(v); setVerRelatorio(false); };

  const gridProps = { escalas, datas, loading, onRemover: handleRemover, podeEditar };
  const current = ministerioConfig[ministerioSelecionado];

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text, fontFamily: "'Outfit', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${theme.bg}; font-family: 'Outfit', sans-serif; }

        /* Glow de fundo para o glassmorphism ter profundidade */
        body::before {
          content: '';
          position: fixed;
          top: -30%;
          right: -20%;
          width: 700px;
          height: 700px;
          background: radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 65%);
          pointer-events: none;
          z-index: 0;
        }
        body::after {
          content: '';
          position: fixed;
          bottom: -20%;
          left: -10%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(124,106,247,0.04) 0%, transparent 65%);
          pointer-events: none;
          z-index: 0;
        }

        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${theme.borderLight}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${theme.textDim}; }

        /* Select focus */
        .sidebar-select:focus {
          border-color: ${theme.accent} !important;
          box-shadow: 0 0 0 3px rgba(167,139,250,0.12);
        }

        /* Hover nas linhas da grid */
        .grid-row:hover { background: rgba(167,139,250,0.05) !important; cursor: default; }

        /* Sticky header da grid */
        .grid-thead th {
          position: sticky;
          top: 0;
          z-index: 2;
          background: ${theme.surface};
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        /* Mobile: cards em vez de tabela */
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .header-title { display: none !important; }
          .header-sep { display: none !important; }
          .header-email { display: none !important; }
          .header-pad { padding: 0 14px !important; }
          .main-pad { padding: 14px 10px !important; }
          .page-header { flex-wrap: wrap; gap: 8px !important; }
          .page-header-actions { width: 100%; justify-content: flex-end; }
          .btn-label { display: none; }
          .mes-nav span { min-width: 70px !important; font-size: 11px !important; }

          .grid-table { width: 100% !important; }
          .grid-thead { display: none; }
          .grid-table tbody { display: flex; flex-direction: column; gap: 8px; padding: 8px; }
          .grid-row {
            display: grid !important;
            grid-template-columns: 1fr;
            border: 1px solid ${theme.border} !important;
            border-bottom: 1px solid ${theme.border} !important;
            border-radius: 8px;
            overflow: hidden;
            background: ${theme.surface} !important;
          }
          .grid-row td {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px !important;
            border-bottom: 1px solid ${theme.border};
            white-space: normal !important;
          }
          .grid-row td:last-child { border-bottom: none; }
          .grid-row td::before {
            content: attr(data-label);
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.7px;
            color: ${theme.textMuted};
            font-family: 'Outfit', sans-serif;
            min-width: 90px;
            flex-shrink: 0;
          }
          .grid-date-cell { border-right: none !important; background: rgba(167,139,250,0.04); }
        }
      `}</style>

      {/* Drawer overlay */}
      {drawerAberto && (
        <div
          onClick={() => setDrawerAberto(false)}
          style={{
            display: "block", position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* Drawer mobile */}
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 201,
        width: "300px",
        background: "rgba(14,14,27,0.85)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderRight: `1px solid rgba(167,139,250,0.12)`,
        padding: "20px 16px", overflowY: "auto",
        transform: drawerAberto ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s ease",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.6px" }}>
            Escala
          </span>
          <button onClick={() => setDrawerAberto(false)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textMuted, padding: "4px", display: "flex" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        {/* ── ALTERADO: refreshKey passado para o Sidebar mobile */}
        <SidebarFiltros
          usuario={user}
          ministerioSelecionado={ministerioSelecionado}
          setMinisterioSelecionado={(v) => { handleSetMinisterio(v); setDrawerAberto(false); }}
          datasDisponiveis={datas}
          theme={theme}
          onConfirmar={() => setDrawerAberto(false)}
          onMensagem={mostrarMensagem}
          onConflito={setConflito}
          refreshKey={refreshKey}
        />
      </div>

      {/* FAB mobile */}
      <button
        onClick={() => setDrawerAberto(true)}
        style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 150,
          width: "52px", height: "52px", borderRadius: "50%",
          background: theme.accent, border: "none", cursor: "pointer",
          boxShadow: "0 4px 20px rgba(47,129,247,0.4)",
          display: "none", alignItems: "center", justifyContent: "center",
        }}
        className="fab-mobile"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      <style>{`
        .fab-mobile { display: none !important; }
        @media (max-width: 768px) { .fab-mobile { display: flex !important; } }
      `}</style>

      {/* Navbar */}
      <header className="header-pad" style={{
        borderBottom: `1px solid ${theme.border}`, background: theme.surface,
        padding: "0 24px", height: "48px", display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "26px", height: "26px", borderRadius: "7px", background: `linear-gradient(135deg, ${theme.accent}, #a78bfa)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <span className="header-title" style={{ fontWeight: 600, fontSize: "13px", letterSpacing: "-0.2px", color: theme.text }}>
            Escala INVB
          </span>
          <span className="header-sep" style={{ color: theme.border, fontSize: "16px" }}>|</span>

          {/* Navegação de mês */}
          <div className="mes-nav" style={{ display: "flex", alignItems: "center", gap: "1px", background: theme.bg, borderRadius: "7px", padding: "2px 3px", border: `1px solid ${theme.border}` }}>
            <button onClick={handleMesAnterior} style={{ background: "transparent", border: "none", cursor: "pointer", color: theme.textMuted, padding: "2px 8px", borderRadius: "5px", fontSize: "13px", lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}
              onMouseEnter={e => { e.currentTarget.style.color = theme.text; e.currentTarget.style.background = theme.surface; }}
              onMouseLeave={e => { e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.background = "transparent"; }}
            >‹</button>
            <span style={{ color: theme.text, fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", minWidth: "86px", textAlign: "center", fontWeight: 500, letterSpacing: "0.5px" }}>
              {new Date(mes + "-15").toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "").toUpperCase()}
            </span>
            <button onClick={handleMesProximo} style={{ background: theme.accentDim, border: "none", cursor: "pointer", color: theme.accent, padding: "2px 8px", borderRadius: "5px", fontSize: "13px", lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}
              onMouseEnter={e => { e.currentTarget.style.background = theme.accent; e.currentTarget.style.color = "white"; }}
              onMouseLeave={e => { e.currentTarget.style.background = theme.accentDim; e.currentTarget.style.color = theme.accent; }}
            >›</button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="header-email" style={{ fontSize: "12px", color: theme.textMuted }}>{user?.email}</span>
          <button onClick={logout} style={{ padding: "4px 12px", background: "transparent", border: `1px solid ${theme.border}`, borderRadius: "5px", color: theme.textMuted, fontSize: "12px", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = theme.danger; e.currentTarget.style.color = theme.danger; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}
          >Sair</button>
        </div>
      </header>

      {/* Layout */}
      <div style={{ display: "flex", minHeight: "calc(100vh - 56px)" }}>

        {/* Sidebar desktop */}
        <aside className="desktop-sidebar" style={{
          width: "268px", minWidth: "268px",
          borderRight: `1px solid rgba(167,139,250,0.1)`,
          background: "rgba(14,14,27,0.75)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          padding: "18px 14px", overflowY: "auto",
          position: "sticky", top: "48px", height: "calc(100vh - 48px)",
        }}>
          {/* ── ALTERADO: refreshKey passado para o Sidebar desktop */}
          <SidebarFiltros
            usuario={user}
            ministerioSelecionado={ministerioSelecionado}
            setMinisterioSelecionado={handleSetMinisterio}
            datasDisponiveis={datas}
            theme={theme}
            onMensagem={mostrarMensagem}
            onConflito={setConflito}
            refreshKey={refreshKey}
          />
        </aside>

        {/* Main */}
        <main ref={mainRef} className="main-pad" style={{ flex: 1, padding: "20px 24px", overflowX: "hidden", minWidth: 0 }}>

          {/* Page header */}
          <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
              <div style={{
                color: theme.accent, flexShrink: 0, opacity: 0.85,
                background: theme.accentDim, borderRadius: "8px",
                padding: "6px", display: "flex", alignItems: "center", justifyContent: "center",
              }}>{current.icon}</div>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "-0.1px", color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {current.nome}
                </h2>
                <p style={{ fontSize: "11px", color: theme.textMuted, marginTop: "2px" }}>
                  {datas.length} datas · {Object.keys(escalas).length} escalas
                </p>
              </div>
              {!podeEditar && (
                <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "20px", background: theme.accentDim, color: theme.accent, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, letterSpacing: "0.3px" }}>
                  LEITURA
                </span>
              )}
            </div>

            {/* Alertas centralizados */}
            <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "0 16px" }}>
              {mensagem.texto && (
                <div style={{
                  padding: "7px 14px", borderRadius: "6px", fontSize: "13px", display: "flex", alignItems: "center", gap: "7px",
                  background: mensagem.tipo === "sucesso" ? theme.successDim : theme.dangerDim,
                  color: mensagem.tipo === "sucesso" ? theme.success : theme.danger,
                  border: `1px solid ${mensagem.tipo === "sucesso" ? theme.success : theme.danger}33`,
                }}>
                  {mensagem.tipo === "sucesso" ? "✓" : "✕"} {mensagem.texto}
                </div>
              )}
              {conflito && !mensagem.texto && (
                <div style={{
                  padding: "7px 14px", borderRadius: "6px", fontSize: "12px", display: "flex", alignItems: "center", gap: "10px",
                  background: "rgba(210,153,34,0.1)", border: "1px solid rgba(210,153,34,0.3)", color: "#d2993a",
                }}>
                  <span>⚠ <strong>{conflito.pessoa.toUpperCase()}</strong> já está em <strong>{conflito.ministerio}</strong> como <strong>{conflito.funcao}</strong> em {conflito.data}</span>
                  <button onClick={() => setConflito(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#d2993a", fontSize: "16px", padding: 0, lineHeight: 1, flexShrink: 0 }}>✕</button>
                </div>
              )}
            </div>

            <div className="page-header-actions" style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
              <button
                onClick={handleDownload}
                disabled={baixando || !podeEditar}
                title={!podeEditar ? "Disponível apenas no modo de edição" : "Baixar escala"}
                style={{
                  padding: "5px 10px",
                  background: "transparent",
                  border: `1px solid ${theme.border}`,
                  borderRadius: "5px",
                  color: !podeEditar ? theme.textDim : theme.textMuted,
                  fontSize: "12px",
                  cursor: (baixando || !podeEditar) ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: "5px",
                  transition: "all 0.15s",
                  opacity: !podeEditar ? 0.35 : 1,
                }}
                onMouseEnter={e => {
                  if (!baixando && podeEditar) {
                    e.currentTarget.style.borderColor = theme.accent;
                    e.currentTarget.style.color = theme.accent;
                    e.currentTarget.style.background = theme.accentGlow;
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = theme.border;
                  e.currentTarget.style.color = !podeEditar ? theme.textDim : theme.textMuted;
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span className="btn-label">{baixando ? "Gerando..." : "Baixar escala"}</span>
              </button>

              {podeEditar && (
                <button
                  onClick={() => setVerRelatorio(v => !v)}
                  style={{
                    padding: "5px 10px", fontFamily: "inherit",
                    background: verRelatorio ? theme.accentDim : "transparent",
                    border: `1px solid ${verRelatorio ? theme.accent : theme.border}`,
                    borderRadius: "5px",
                    color: verRelatorio ? theme.accent : theme.textMuted,
                    fontSize: "12px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "5px",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => {
                    if (!verRelatorio) {
                      e.currentTarget.style.borderColor = theme.accent;
                      e.currentTarget.style.color = theme.accent;
                      e.currentTarget.style.background = theme.accentGlow;
                    }
                  }}
                  onMouseLeave={e => {
                    if (!verRelatorio) {
                      e.currentTarget.style.borderColor = theme.border;
                      e.currentTarget.style.color = theme.textMuted;
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 20V10M12 20V4M6 20v-6"/>
                  </svg>
                  <span className="btn-label">Relatório</span>
                </button>
              )}

              {podeEditar && (
                <button onClick={handleLimparTudo} disabled={limpando}
                  style={{ padding: "5px 10px", background: "transparent", border: `1px solid ${theme.border}`, borderRadius: "5px", color: theme.textMuted, fontSize: "12px", cursor: limpando ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "5px", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = theme.danger; e.currentTarget.style.color = theme.danger; e.currentTarget.style.background = theme.dangerDim; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.background = "transparent"; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                  </svg>
                  <span className="btn-label">{limpando ? "Limpando..." : "Limpar mês"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Grid ou Relatório */}
          {verRelatorio ? (
            <RelatorioMinisterio
              escalas={escalas}
              datas={datas}
              funcoes={funcoesPorMinisterio[ministerioSelecionado] || []}
              ministerioId={ministerioSelecionado}
              theme={theme}
              onVoltar={() => setVerRelatorio(false)}
            />
          ) : (
            <div ref={gridRef}>
              {ministerioSelecionado === "comunicacao" && <GridComunicacao {...gridProps} theme={theme} />}
              {ministerioSelecionado === "infantil"    && <GridInfantil    {...gridProps} theme={theme} />}
              {ministerioSelecionado === "louvor"      && <GridLouvor      {...gridProps} theme={theme} />}
              {ministerioSelecionado === "recepcao"    && <GridRecepcao    {...gridProps} theme={theme} />}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [mes, setMes] = useState(() => {
    const hoje = new Date();
    const data = hoje.getDate() > 15 ? new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1) : hoje;
    return data.toISOString().slice(0, 7);
  });
  const [ministerioSelecionado, setMinisterioSelecionado] = useState(user?.ministerioId || "comunicacao");

  return (
    <EscalaProvider ministerioId={ministerioSelecionado} mes={mes}>
      <DashboardContent
        ministerioSelecionado={ministerioSelecionado}
        setMinisterioSelecionado={setMinisterioSelecionado}
        mes={mes}
        setMes={setMes}
      />
    </EscalaProvider>
  );
}