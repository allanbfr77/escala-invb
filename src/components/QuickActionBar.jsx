import { useState, useRef, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { HASH_SECTIONS } from "../utils/hashNavigation";

const ICONS = {
  filtrar: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  planilha: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  relatorio: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  ),
  outrosMin: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  indisponivel: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  ),
  exportar: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  texto: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </svg>
  ),
  organizar: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  kebab: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden>
      <circle cx="12" cy="5" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="12" cy="19" r="1.7" />
    </svg>
  ),
  limpar: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  ),
};

function ExportButton({ disabled, baixando, opcoes, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const downloadDireto = opcoes.length === 1;

  useEffect(() => {
    if (downloadDireto || !open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, downloadDireto]);

  const handleClick = () => {
    if (downloadDireto) {
      onSelect(opcoes[0].layout);
      return;
    }
    setOpen((v) => !v);
  };

  return (
    <div
      className={downloadDireto ? "qa-export-wrap" : "acoes-kebab-wrap qa-export-wrap"}
      ref={downloadDireto ? undefined : ref}
    >
      <button
        type="button"
        className="qa-bar-link"
        onClick={handleClick}
        disabled={disabled || baixando}
        title={
          disabled
            ? "Disponível apenas no modo de edição"
            : downloadDireto
              ? "Baixar planilha"
              : "Exportar escala como imagem"
        }
        aria-haspopup={downloadDireto ? undefined : "menu"}
        aria-expanded={downloadDireto ? undefined : open}
        aria-label="Exportar"
      >
        <span className="qa-bar-link-icon">{ICONS.exportar}</span>
        <span className="qa-bar-link-label">{baixando ? "Gerando..." : "Exportar"}</span>
      </button>
      {!downloadDireto && open && (
        <div className="acoes-kebab-menu qa-export-menu" role="menu">
          <div className="qa-export-menu-title">Formato da imagem</div>
          {opcoes.map((opt) => (
            <button
              key={opt.layout}
              type="button"
              role="menuitem"
              className="acoes-kebab-item qa-export-menu-item"
              onClick={() => {
                setOpen(false);
                onSelect(opt.layout);
              }}
              disabled={baixando}
            >
              <div>
                <div className="qa-export-menu-item-label">{opt.label}</div>
                <div className="qa-export-menu-item-desc">{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuItem({ item, onHashNavClick }) {
  const className = `qa-bar-link${item.active ? " is-active" : ""}${item.danger ? " is-danger" : ""}`;

  const content = (
    <>
      {item.icon && <span className="qa-bar-link-icon">{item.icon}</span>}
      <span className="qa-bar-link-label">{item.label}</span>
    </>
  );

  if (item.href) {
    return (
      <a
        href={item.href}
        className={className}
        title={item.title}
        aria-label={item.ariaLabel || item.label}
        aria-current={item.active ? "page" : undefined}
        onClick={(e) => onHashNavClick(e, item.onClick)}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={item.onClick}
      disabled={item.disabled}
      title={item.title}
      aria-label={item.ariaLabel || item.label}
      aria-pressed={item.active || undefined}
    >
      {content}
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
  onExportarModelo,
  opcoesExportacao = [],
  baixando = false,
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
  const itens = [
    {
      key: "planilha",
      label: "Planilha",
      icon: ICONS.planilha,
      active: naPlanilha,
      href: `#${HASH_SECTIONS.PLANILHA}`,
      onClick: onVoltarPlanilha,
    },
    {
      key: "relatorio",
      label: "Relatório",
      icon: ICONS.relatorio,
      active: verRelatorio,
      href: `#${HASH_SECTIONS.RELATORIO}`,
      onClick: onToggleRelatorio,
    },
    {
      key: "outros-ministerios",
      label: "Outros Min.",
      icon: ICONS.outrosMin,
      active: verOutrosMinisterios,
      href: `#${HASH_SECTIONS.OUTROS_MINISTERIOS}`,
      onClick: onToggleOutrosMinisterios,
    },
    {
      key: "indisponivel",
      label: "Indisponível",
      icon: ICONS.indisponivel,
      active: verIndisponibilidade,
      onClick: onToggleIndisponibilidade,
      disabled: !podeEditar,
    },
    {
      key: "texto",
      label: "Texto",
      icon: ICONS.texto,
      onClick: onTexto,
      disabled: !podeEditar,
    },
    {
      key: "tema",
      label: "Tema",
      icon: isDark ? <Sun size={14} color="#F5C542" /> : <Moon size={14} color="currentColor" />,
      onClick: onToggleTheme,
      title: isDark ? "Tema claro" : "Tema escuro",
    },
    {
      key: "organizar",
      label: "Organizar",
      icon: ICONS.organizar,
      onClick: onOrganizar,
      disabled: !podeEditar || !podeOrganizar,
      title: !podeOrganizar ? "Disponível em Louvor e Introdução" : undefined,
    },
  ];

  return (
    <div className="qa-bar-section">
      <nav className="qa-bar" aria-label="Ações da escala">
        <div className={`qa-filtro${filtroNome ? " is-active" : ""}`}>
          <span className="qa-filtro-label">
            <span className="qa-bar-link-icon">{ICONS.filtrar}</span>
            Filtrar
          </span>
          <input
            type="text"
            className="qa-filtro-input"
            value={filtroNome}
            onChange={onFiltroChange}
            placeholder="pessoa..."
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
              ×
            </button>
          )}
        </div>

        <div className="qa-bar-items">
          {itens.slice(0, 4).map((item) => (
            <MenuItem key={item.key} item={item} onHashNavClick={onHashNavClick} />
          ))}

          <ExportButton
            disabled={!podeEditar}
            baixando={baixando}
            opcoes={opcoesExportacao}
            onSelect={onExportarModelo}
          />

          {itens.slice(4, 6).map((item) => (
            <MenuItem key={item.key} item={item} onHashNavClick={onHashNavClick} />
          ))}

          <div className="qa-bar-slot-duo">
            <MenuItem key="organizar" item={itens[6]} onHashNavClick={onHashNavClick} />

          <div className="acoes-kebab-wrap qa-bar-kebab" ref={acoesMenuRef}>
          <button
            type="button"
            className="qa-bar-link qa-bar-link--kebab"
            onClick={() => setShowAcoesMenu((v) => !v)}
            title="Mais ações"
            aria-haspopup="true"
            aria-expanded={showAcoesMenu}
            aria-label="Mais ações"
            disabled={!podeEditar}
          >
            <span className="qa-bar-link-icon">{ICONS.kebab}</span>
            <span className="qa-bar-link-label qa-bar-kebab-label">Mais</span>
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
                <span className="qa-bar-link-icon">{ICONS.limpar}</span>
                <span>{limpando ? "Limpando..." : "Limpar mês"}</span>
              </button>
            </div>
          )}
          </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
