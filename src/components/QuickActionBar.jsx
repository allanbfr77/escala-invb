import { Sun, Moon } from "lucide-react";
import { HASH_SECTIONS } from "../utils/hashNavigation";

const ICONS = {
  planilha: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  relatorio: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  ),
  outrosMin: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  indisponivel: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  ),
  exportar: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  texto: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </svg>
  ),
  organizar: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
};

function ActionButton({ acao, onHashNavClick }) {
  const className = `qa-bar-btn${acao.active ? " is-active" : ""}${acao.iconOnly ? " qa-bar-btn--icon" : ""}`;

  if (acao.href) {
    return (
      <a
        href={acao.href}
        className={className}
        title={acao.title}
        aria-label={acao.ariaLabel || acao.label}
        onClick={(e) => onHashNavClick(e, acao.onClick)}
      >
        {acao.icon}
        {!acao.iconOnly && <span>{acao.label}</span>}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={acao.onClick}
      disabled={acao.disabled}
      title={acao.title}
      aria-label={acao.ariaLabel || acao.label}
    >
      {acao.icon}
      {!acao.iconOnly && <span>{acao.label}</span>}
    </button>
  );
}

export default function QuickActionBar({
  filtroNome,
  onFiltroChange,
  onClearFiltro,
  naPlanilha,
  verRelatorio,
  verOutrosMinisterios,
  verIndisponibilidade,
  onToggleIndisponibilidade,
  onVoltarPlanilha,
  onToggleRelatorio,
  onToggleOutrosMinisterios,
  onHashNavClick,
  onExportar,
  onTexto,
  onToggleTheme,
  isDark,
  onOrganizar,
  podeOrganizar = false,
  podeEditar = true,
  limpando = false,
  onLimparMes,
  showAcoesMenu,
  setShowAcoesMenu,
  acoesMenuRef,
}) {
  const acoes = [
    {
      key: "planilha",
      label: "Planilha",
      active: naPlanilha,
      href: `#${HASH_SECTIONS.PLANILHA}`,
      onClick: onVoltarPlanilha,
      icon: ICONS.planilha,
    },
    {
      key: "relatorio",
      label: "Relatório",
      active: verRelatorio,
      href: `#${HASH_SECTIONS.RELATORIO}`,
      onClick: onToggleRelatorio,
      icon: ICONS.relatorio,
    },
    {
      key: "outros-ministerios",
      label: "Outros Min.",
      active: verOutrosMinisterios,
      href: `#${HASH_SECTIONS.OUTROS_MINISTERIOS}`,
      onClick: onToggleOutrosMinisterios,
      icon: ICONS.outrosMin,
    },
    {
      key: "indisponivel",
      label: "Indisponível",
      active: verIndisponibilidade,
      onClick: onToggleIndisponibilidade,
      disabled: !podeEditar,
      icon: ICONS.indisponivel,
    },
    {
      key: "exportar",
      label: "Exportar",
      onClick: onExportar,
      disabled: !podeEditar,
      icon: ICONS.exportar,
    },
    {
      key: "texto",
      label: "Texto",
      onClick: onTexto,
      disabled: !podeEditar,
      icon: ICONS.texto,
    },
    {
      key: "tema",
      label: "Tema",
      iconOnly: true,
      onClick: onToggleTheme,
      title: isDark ? "Tema claro" : "Tema escuro",
      ariaLabel: isDark ? "Ativar tema claro" : "Ativar tema escuro",
      icon: isDark ? <Sun size={15} color="#F5C542" /> : <Moon size={15} color="#1a3a6b" />,
    },
    {
      key: "organizar",
      label: "Organizar",
      onClick: onOrganizar,
      disabled: !podeEditar || !podeOrganizar,
      title: !podeOrganizar ? "Disponível em Louvor e Introdução" : undefined,
      icon: ICONS.organizar,
    },
  ];

  return (
    <div className="qa-bar-section">
      <div className="qa-bar">
        <div className={`qa-filtro${filtroNome ? " is-active" : ""}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="qa-filtro-input"
            value={filtroNome}
            onChange={onFiltroChange}
            placeholder="Filtrar pessoa..."
            aria-label="Filtrar pessoa na planilha"
          />
          {filtroNome && (
            <button
              type="button"
              className="qa-filtro-clear"
              onClick={onClearFiltro}
              title="Limpar filtro"
              aria-label="Limpar filtro"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {acoes.map((acao) => (
          <ActionButton key={acao.key} acao={acao} onHashNavClick={onHashNavClick} />
        ))}

        <div className="acoes-kebab-wrap qa-bar-kebab" ref={acoesMenuRef}>
          <button
            type="button"
            className="acoes-kebab-btn"
            onClick={() => setShowAcoesMenu((v) => !v)}
            title="Mais ações"
            aria-haspopup="true"
            aria-expanded={showAcoesMenu}
            disabled={!podeEditar}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <circle cx="12" cy="5" r="1.7" />
              <circle cx="12" cy="12" r="1.7" />
              <circle cx="12" cy="19" r="1.7" />
            </svg>
          </button>
          {showAcoesMenu && (
            <div className="acoes-kebab-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                className="acoes-kebab-item is-danger"
                onClick={() => { setShowAcoesMenu(false); onLimparMes(); }}
                disabled={limpando}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" /><path d="M14 11v6" />
                </svg>
                <span>{limpando ? "Limpando..." : "Limpar mês"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
