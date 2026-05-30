import { useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Sun, Moon, AlertTriangle, ChevronDown, BarChart3, Users, AlertCircle, CalendarDays } from "lucide-react";
import { useRelatorioUnificado } from "../hooks/useRelatorioUnificado";
import { MINISTERIOS_IDS, MINISTERIOS_INFO, agruparContagensPorFuncao } from "../utils/relatorioUnificado";
import { formatarData } from "../utils/dateHelper";
import { IconeMinisterio } from "../utils/ministerioIcons";

function useThemeTokens() {
  const { isDark, toggleTheme } = useTheme();
  const theme = {
    bg: "var(--bg)",
    surface: "var(--surface)",
    border: "var(--border)",
    accent: "var(--accent)",
    accentDim: "var(--accent-dim)",
    accentOnAccent: "var(--accent-on-accent)",
    accentGradientEnd: "var(--accent-gradient-end)",
    text: "var(--text)",
    textMuted: "var(--text-muted)",
    textDim: "var(--text-dim)",
    danger: "var(--danger)",
    dangerDim: "var(--danger-dim)",
    success: "var(--success)",
    successDim: "var(--success-dim)",
  };
  return { isDark, toggleTheme, theme };
}

function formatarMesLabel(mes) {
  return new Date(mes + "-15")
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .replace(/^\w/, (c) => c.toUpperCase());
}

function TaxaBarra({ taxa, color, theme }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{
        flex: 1, height: "6px", borderRadius: "3px",
        background: theme.border, overflow: "hidden",
      }}>
        <div style={{
          width: `${taxa}%`, height: "100%",
          background: color, borderRadius: "3px",
          transition: "width 0.4s ease",
        }} />
      </div>
      <span style={{
        fontSize: "12px", fontWeight: 700, color,
        fontFamily: "'JetBrains Mono', monospace",
        minWidth: "36px", textAlign: "right",
      }}>
        {taxa}%
      </span>
    </div>
  );
}

function FraseMinisterioTurnoDia({ porMinisterio }) {
  if (!porMinisterio) return null;

  const ids = MINISTERIOS_IDS.filter((mid) => porMinisterio[mid]);
  if (ids.length === 0) return null;

  const NomeColorido = ({ mid }) => (
    <span style={{ color: MINISTERIOS_INFO[mid]?.color, fontWeight: 600 }}>
      {MINISTERIOS_INFO[mid]?.nome}
    </span>
  );

  if (ids.length === 1) {
    return (
      <>
        , no Ministério <NomeColorido mid={ids[0]} />
      </>
    );
  }

  if (ids.length === 2) {
    return (
      <>
        , nos Ministérios <NomeColorido mid={ids[0]} /> e <NomeColorido mid={ids[1]} />
      </>
    );
  }

  return (
    <>
      , nos Ministérios{" "}
      {ids.slice(0, -1).map((mid, i) => (
        <span key={mid}>
          {i > 0 && ", "}
          <NomeColorido mid={mid} />
        </span>
      ))}
      {" e "}
      <NomeColorido mid={ids[ids.length - 1]} />
    </>
  );
}

function BadgesMinisterio({ porMinisterio }) {
  if (!porMinisterio) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
      {MINISTERIOS_IDS.map((mid) => {
        const count = porMinisterio[mid];
        if (!count) return null;
        const info = MINISTERIOS_INFO[mid];
        return (
          <span
            key={mid}
            title={info.nome}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "10px",
              fontWeight: 700,
              color: info.color,
              background: `${info.color}18`,
              border: `1px solid ${info.color}33`,
              borderRadius: "4px",
              padding: "2px 6px",
            }}
          >
            <IconeMinisterio ministerioId={mid} size={11} />
            {info.nome}
          </span>
        );
      })}
    </div>
  );
}

function SecaoTitulo({ icon: Icon, titulo, badge, theme }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
      <Icon size={16} color={theme.accent} style={{ flexShrink: 0 }} />
      <h3 style={{
        margin: 0, fontSize: "13px", fontWeight: 700,
        color: theme.text, letterSpacing: "0.2px",
      }}>
        {titulo}
      </h3>
      {badge != null && (
        <span style={{
          fontSize: "10px", fontWeight: 700, color: theme.accent,
          background: theme.accentDim, borderRadius: "10px",
          padding: "1px 7px",
        }}>
          {badge}
        </span>
      )}
    </div>
  );
}

function SecaoColapsavel({ icon: Icon, titulo, badge, theme, children, defaultAberto = false }) {
  const [aberto, setAberto] = useState(defaultAberto);

  return (
    <section>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        style={{
          width: "100%", background: "transparent", border: "none",
          padding: 0, marginBottom: aberto ? "14px" : 0,
          cursor: "pointer", fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <Icon size={16} color={theme.accent} style={{ flexShrink: 0 }} />
          <h3 style={{
            margin: 0, fontSize: "13px", fontWeight: 700,
            color: theme.text, letterSpacing: "0.2px", textAlign: "left",
          }}>
            {titulo}
          </h3>
          {badge != null && (
            <span style={{
              fontSize: "10px", fontWeight: 700, color: theme.accent,
              background: theme.accentDim, borderRadius: "10px",
              padding: "1px 7px", flexShrink: 0,
            }}>
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          color={theme.textMuted}
          style={{
            flexShrink: 0,
            transition: "transform 0.2s",
            transform: aberto ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      {aberto && children}
    </section>
  );
}

function CardResumo({ label, valor, sub, cor, theme }) {
  return (
    <div style={{
      borderRadius: "8px", border: `1px solid ${theme.border}`,
      background: theme.surface, padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: "4px",
    }}>
      <span style={{
        fontSize: "10px", fontWeight: 600, color: theme.textMuted,
        textTransform: "uppercase", letterSpacing: "0.6px",
      }}>
        {label}
      </span>
      <span style={{
        fontSize: "22px", fontWeight: 700, color: cor || theme.text,
        fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.1,
      }}>
        {valor}
      </span>
      {sub && (
        <span style={{ fontSize: "11px", color: theme.textMuted }}>{sub}</span>
      )}
    </div>
  );
}

function AlertaItem({ children, tipo = "warning", theme }) {
  const cfg = tipo === "danger"
    ? { bg: theme.dangerDim, border: `${theme.danger}44`, color: theme.danger }
    : { bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.25)", color: "#60a5fa" };

  return (
    <div style={{
      padding: "8px 12px", borderRadius: "6px",
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      fontSize: "12px", color: theme.text, lineHeight: 1.45,
    }}>
      {children}
    </div>
  );
}

function MinisterioDetalhe({ rel, theme }) {
  const [aberto, setAberto] = useState(false);
  const info = MINISTERIOS_INFO[rel.ministerioId];

  return (
    <div style={{
      borderRadius: "8px", border: `1px solid ${theme.border}`,
      background: theme.surface, overflow: "hidden",
    }}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        style={{
          width: "100%", background: "transparent", border: "none",
          padding: "12px 16px", cursor: "pointer", fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <div style={{
            color: info?.color, background: `${info?.color}18`,
            borderRadius: "6px", padding: "5px",
            display: "flex", alignItems: "center",
          }}>
            <IconeMinisterio ministerioId={rel.ministerioId} size={16} />
          </div>
          <div style={{ textAlign: "left", minWidth: 0 }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: theme.text }}>
              {rel.nome}
            </div>
            <div style={{ fontSize: "11px", color: theme.textMuted }}>
              {rel.escalados.length} escalados · {rel.vazios} vazios · {rel.datas.length} cultos
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <span style={{
            fontSize: "12px", fontWeight: 700, color: info?.color,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {rel.taxaPreenchimento}%
          </span>
          <ChevronDown
            size={14}
            color={theme.textMuted}
            style={{
              transition: "transform 0.2s",
              transform: aberto ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </div>
      </button>

      {aberto && (
        <div style={{
          borderTop: `1px solid ${theme.border}`,
          padding: "12px 16px",
          display: "flex", flexDirection: "column", gap: "8px",
        }}>
          {rel.escalados.map(({ pessoa, total, porFuncao, consecutivas }) => (
            <div key={pessoa} style={{
              borderRadius: "6px", border: `1px solid ${theme.border}`,
              padding: "10px 12px", background: theme.bg,
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: "6px",
              }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: theme.text }}>
                  {pessoa.toUpperCase()}
                </span>
                <span style={{
                  fontSize: "11px", fontWeight: 700, color: info?.color,
                  background: `${info?.color}18`, borderRadius: "10px",
                  padding: "1px 8px",
                }}>
                  {total} {total === 1 ? "escala" : "escalas"}
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {agruparContagensPorFuncao(rel.funcoes, porFuncao).map(({ funcao, count }) => (
                    <span key={funcao} style={{
                      fontSize: "10px", fontWeight: 600,
                      background: theme.surface, border: `1px solid ${theme.border}`,
                      borderRadius: "4px", padding: "2px 6px", color: theme.textMuted,
                    }}>
                      {funcao} ×{count}
                    </span>
                  ))}
              </div>
              {consecutivas.length > 0 && (
                <div style={{
                  marginTop: "6px", fontSize: "10px", color: "#60a5fa",
                  fontWeight: 600,
                }}>
                  {consecutivas.length} turno{consecutivas.length !== 1 ? "s" : ""} seguido{consecutivas.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          ))}

          {rel.semEscala.length > 0 && (
            <div style={{ marginTop: "4px" }}>
              <span style={{
                fontSize: "10px", fontWeight: 600, color: theme.textMuted,
                textTransform: "uppercase", letterSpacing: "0.5px",
              }}>
                Sem escala
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
                {rel.semEscala.map(({ pessoa }) => (
                  <span key={pessoa} style={{
                    fontSize: "11px", color: theme.danger,
                    background: theme.dangerDim, border: `1px solid ${theme.danger}33`,
                    borderRadius: "4px", padding: "2px 8px",
                  }}>
                    {pessoa.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RelatorioUnificado({
  mes,
  setMes,
  mesMinimo,
  mesMaximo,
  onVoltar,
}) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme, theme } = useThemeTokens();
  const { loading, error, dados } = useRelatorioUnificado(mes);
  const [expandidosCarga, setExpandidosCarga] = useState(new Set());

  const podeRetroceder = mes > mesMinimo;
  const podeAvancar = mes < mesMaximo;

  const handleMesAnterior = () => {
    if (!podeRetroceder) return;
    const [ano, m] = mes.split("-").map(Number);
    setMes(new Date(ano, m - 2, 1).toISOString().slice(0, 7));
  };

  const handleMesProximo = () => {
    if (!podeAvancar) return;
    const [ano, m] = mes.split("-").map(Number);
    setMes(new Date(ano, m, 1).toISOString().slice(0, 7));
  };

  const toggleCarga = (pessoa) => {
    setExpandidosCarga((prev) => {
      const next = new Set(prev);
      next.has(pessoa) ? next.delete(pessoa) : next.add(pessoa);
      return next;
    });
  };

  const totalAlertas = useMemo(() => {
    if (!dados) return 0;
    const { alertas } = dados;
    return (
      alertas.slotsVazios.length +
      alertas.sobrecarga.length +
      alertas.indisponibilidadesMes.length
    );
  }, [dados]);

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text, fontFamily: "'Outfit', sans-serif" }}>
      <style>{`
        @media (max-width: 768px) {
          .rel-header-pad { padding: 0 14px !important; }
          .rel-main-pad { padding: 16px 14px !important; }
          .rel-grid-resumo { grid-template-columns: repeat(2, 1fr) !important; }
          .rel-grid-ministerios { grid-template-columns: 1fr !important; }
          .rel-header-email { display: none !important; }
        }
      `}</style>

      {/* Navbar */}
      <header className="rel-header-pad" style={{
        borderBottom: `1px solid ${theme.border}`, background: theme.surface,
        padding: "0 24px", height: "48px", display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "26px", height: "26px", borderRadius: "7px",
            background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentGradientEnd})`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <BarChart3 size={13} color={theme.accentOnAccent} strokeWidth={2.5} />
          </div>
          <span style={{ fontWeight: 600, fontSize: "13px", color: theme.text }}>
            Relatório Geral
          </span>
          <span style={{ color: theme.border, fontSize: "16px" }}>|</span>

          <div style={{
            display: "flex", alignItems: "center", gap: "1px",
            background: theme.bg, borderRadius: "7px", padding: "2px 3px",
            border: `1px solid ${theme.border}`,
          }}>
            <button
              type="button"
              onClick={handleMesAnterior}
              disabled={!podeRetroceder}
              style={{
                background: "transparent", border: "none",
                cursor: podeRetroceder ? "pointer" : "not-allowed",
                color: podeRetroceder ? theme.textMuted : theme.textDim,
                padding: "2px 8px", fontSize: "13px", opacity: podeRetroceder ? 1 : 0.35,
              }}
            >‹</button>
            <span style={{
              color: theme.text, fontSize: "12px",
              fontFamily: "'JetBrains Mono', monospace",
              minWidth: "86px", textAlign: "center", fontWeight: 500,
            }}>
              {new Date(mes + "-15").toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "").toUpperCase()}
            </span>
            <button
              type="button"
              onClick={handleMesProximo}
              disabled={!podeAvancar}
              style={{
                background: podeAvancar ? theme.accentDim : "transparent", border: "none",
                cursor: podeAvancar ? "pointer" : "not-allowed",
                color: podeAvancar ? theme.accent : theme.textDim,
                padding: "2px 8px", fontSize: "13px", opacity: podeAvancar ? 1 : 0.35,
              }}
            >›</button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={onVoltar}
            style={{
              padding: "4px 12px", background: "transparent",
              border: `1px solid ${theme.border}`, borderRadius: "5px",
              color: theme.textMuted, fontSize: "12px", cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ← Escala
          </button>
          <button type="button" onClick={toggleTheme} style={{
            background: "transparent", border: `1px solid ${theme.border}`,
            borderRadius: "5px", padding: "3px 8px", cursor: "pointer",
          }}>
            {isDark ? <Sun size={16} color="#F5C542" /> : <Moon size={16} color="#1a3a6b" />}
          </button>
          <span className="rel-header-email" style={{ fontSize: "12px", color: theme.textMuted }}>
            Olá, {user?.email}
          </span>
          <button type="button" onClick={logout} style={{
            padding: "4px 12px", background: "transparent",
            border: `1px solid ${theme.border}`, borderRadius: "5px",
            color: theme.textMuted, fontSize: "12px", cursor: "pointer", fontFamily: "inherit",
          }}>
            Sair
          </button>
        </div>
      </header>

      <main className="rel-main-pad" style={{ maxWidth: "960px", margin: "0 auto", padding: "24px" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: theme.text }}>
            {formatarMesLabel(mes)}
          </h1>
          <p style={{ margin: 0, fontSize: "12px", color: theme.textMuted }}>
            Visão consolidada de todos os ministérios
            {dados?.resumo?.totalCultosMes != null && (
              <> · {dados.resumo.totalCultosMes} cultos no mês</>
            )}
          </p>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "48px", color: theme.textMuted, fontSize: "13px" }}>
            Carregando relatório...
          </div>
        )}

        {error && (
          <div style={{
            padding: "16px", borderRadius: "8px",
            background: theme.dangerDim, border: `1px solid ${theme.danger}44`,
            color: theme.danger, fontSize: "13px",
          }}>
            {error}
          </div>
        )}

        {!loading && !error && dados && (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

            {/* Resumo executivo */}
            <section>
              <SecaoTitulo icon={BarChart3} titulo="RESUMO" theme={theme} />
              <div className="rel-grid-resumo" style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "10px",
              }}>
                <CardResumo
                  label="Preenchimento geral"
                  valor={`${dados.resumo.taxaPreenchimento}%`}
                  sub={`${dados.resumo.preenchidos} de ${dados.resumo.totalSlots} slots`}
                  cor={theme.success}
                  theme={theme}
                />
                <CardResumo
                  label="Pessoas escaladas"
                  valor={dados.resumo.pessoasEscaladas}
                  sub="em pelo menos 1 ministério"
                  theme={theme}
                />
                <CardResumo
                  label="Slots vazios"
                  valor={dados.resumo.vazios}
                  sub="funções sem integrante"
                  cor={dados.resumo.vazios > 0 ? theme.danger : theme.success}
                  theme={theme}
                />
                <CardResumo
                  label="Sem escala"
                  valor={dados.resumo.pessoasSemEscala}
                  sub="em nenhum ministério"
                  cor={dados.resumo.pessoasSemEscala > 0 ? theme.danger : theme.textMuted}
                  theme={theme}
                />
              </div>

              <div className="rel-grid-ministerios" style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "10px",
                marginTop: "12px",
              }}>
                {MINISTERIOS_IDS.map((mid) => {
                  const rel = dados.porMinisterio[mid];
                  const info = MINISTERIOS_INFO[mid];
                  return (
                    <div key={mid} style={{
                      borderRadius: "8px", border: `1px solid ${theme.border}`,
                      background: theme.surface, padding: "12px 14px",
                    }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px",
                      }}>
                        <IconeMinisterio ministerioId={mid} size={14} />
                        <span style={{ fontSize: "12px", fontWeight: 700, color: theme.text }}>
                          {info.nome}
                        </span>
                      </div>
                      <TaxaBarra taxa={rel.taxaPreenchimento} color={info.color} theme={theme} />
                      <div style={{
                        marginTop: "6px", fontSize: "10px", color: theme.textMuted,
                      }}>
                        {rel.escalados.length} escalados · {rel.vazios} vazios
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Alertas */}
            {totalAlertas > 0 && (
              <SecaoColapsavel icon={AlertTriangle} titulo="Alertas" badge={totalAlertas} theme={theme}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {dados.alertas.sobrecarga.map((c) => (
                    <AlertaItem key={c.pessoa} tipo="danger" theme={theme}>
                      <strong>{c.pessoa.toUpperCase()}</strong> em {c.qtdCultos} de {c.totalCultosMes} cultos ({c.percentualCultos}%)
                      {c.qtdMinisterios >= 2 && ` · ${c.qtdMinisterios} ministérios`}
                    </AlertaItem>
                  ))}
                  {dados.alertas.indisponibilidadesMes.map(({ pessoa, ministerioId }) => (
                    <AlertaItem key={`${pessoa}-${ministerioId}`} theme={theme}>
                      <strong>{pessoa.toUpperCase()}</strong> indisponível o mês inteiro em{" "}
                      <strong>{MINISTERIOS_INFO[ministerioId]?.nome}</strong>
                    </AlertaItem>
                  ))}
                  {dados.alertas.slotsVazios.length > 0 && (
                    <AlertaItem theme={theme}>
                      <strong>{dados.alertas.slotsVazios.length}</strong>{" "}
                      {dados.alertas.slotsVazios.length === 1 ? "slot vazio" : "slots vazios"} no mês
                      {" "}(ver detalhamento por ministério abaixo)
                    </AlertaItem>
                  )}
                </div>
              </SecaoColapsavel>
            )}

            {/* Escalas por turno/dia */}
            {dados.alertas.turnoDia.length > 0 && (
              <SecaoColapsavel
                icon={CalendarDays}
                titulo="Escalas por turno/dia"
                badge={dados.alertas.turnoDia.length}
                theme={theme}
              >
                <p style={{ fontSize: "11px", color: theme.textMuted, margin: "0 0 10px" }}>
                  Pessoas escaladas no mês, mas ausentes em algum tipo de culto (todos os ministérios)
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {dados.alertas.turnoDia.map(({ pessoa, categorias, label, qtdCultosTotal, porMinisterio }) => (
                    <div
                      key={`${pessoa}-${(categorias || []).join("-")}`}
                      style={{
                        padding: "8px 12px", borderRadius: "6px",
                        border: `1px solid ${theme.border}`, background: theme.surface,
                        fontSize: "12px", color: theme.text,
                      }}
                    >
                      <strong>{pessoa.toUpperCase()}</strong>
                      <div style={{ marginTop: "4px" }}>
                        <span style={{ color: theme.textMuted }}>
                          Não escalado(a) em {label}
                          <FraseMinisterioTurnoDia porMinisterio={porMinisterio} />
                        </span>
                        <span style={{ color: theme.textDim, fontSize: "11px" }}>
                          {" · "}({qtdCultosTotal} culto{qtdCultosTotal !== 1 ? "s" : ""} no mês)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </SecaoColapsavel>
            )}

            {/* Carga cruzada */}
            <SecaoColapsavel
              icon={Users}
              titulo="Carga cruzada"
              badge={dados.cargaCruzada.length}
              theme={theme}
            >
              {dados.alertas.multiministerio.length > 0 && (
                <p style={{ fontSize: "11px", color: theme.textMuted, margin: "0 0 10px" }}>
                  {dados.alertas.multiministerio.length} pessoa{dados.alertas.multiministerio.length !== 1 ? "s" : ""} em múltiplos ministérios
                </p>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {dados.cargaCruzada.map((c) => {
                  const aberto = expandidosCarga.has(c.pessoa);
                  return (
                    <div key={c.pessoa} style={{
                      borderRadius: "8px", border: `1px solid ${theme.border}`,
                      background: theme.surface, overflow: "hidden",
                    }}>
                      <button
                        type="button"
                        onClick={() => toggleCarga(c.pessoa)}
                        style={{
                          width: "100%", background: "transparent", border: "none",
                          padding: "12px 16px", cursor: "pointer", fontFamily: "inherit",
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: theme.text }}>
                            {c.pessoa.toUpperCase()}
                          </span>
                          {c.qtdMinisterios >= 2 && (
                            <span style={{
                              fontSize: "10px", fontWeight: 700, color: theme.accent,
                              background: theme.accentDim, borderRadius: "10px", padding: "1px 7px",
                            }}>
                              {c.qtdMinisterios} ministérios
                            </span>
                          )}
                          {c.sobrecarga && (
                            <AlertCircle size={13} color={theme.danger} />
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{
                            fontSize: "12px", fontWeight: 700, color: theme.accent,
                            background: theme.accentDim, borderRadius: "10px", padding: "2px 10px",
                          }}>
                            {c.qtdCultos}/{c.totalCultosMes} cultos
                          </span>
                          <ChevronDown
                            size={14}
                            color={theme.textMuted}
                            style={{
                              transition: "transform 0.2s",
                              transform: aberto ? "rotate(180deg)" : "rotate(0deg)",
                            }}
                          />
                        </div>
                      </button>

                      {aberto && (
                        <div style={{
                          borderTop: `1px solid ${theme.border}`,
                          padding: "10px 16px 14px",
                        }}>
                          <div style={{ marginBottom: "10px" }}>
                            <BadgesMinisterio porMinisterio={c.porMinisterio} />
                          </div>
                          {c.consecutivasGlobais.length > 0 && (
                            <div style={{
                              fontSize: "11px", color: "#60a5fa", fontWeight: 600,
                              marginBottom: "8px",
                            }}>
                              {c.consecutivasGlobais.length} turno{c.consecutivasGlobais.length !== 1 ? "s" : ""} seguido{c.consecutivasGlobais.length !== 1 ? "s" : ""} (entre cultos)
                            </div>
                          )}
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {c.slots.map((s, i) => (
                              <div key={i} style={{ fontSize: "11px", color: theme.textMuted }}>
                                <span style={{ color: MINISTERIOS_INFO[s.ministerioId]?.color, fontWeight: 600 }}>
                                  {MINISTERIOS_INFO[s.ministerioId]?.nome}
                                </span>
                                {" · "}
                                {formatarData(s.data, s.turno, s.dataObj?.descricao)}
                                {" · "}
                                {s.funcao}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </SecaoColapsavel>

            {/* Sem escala global */}
            {dados.semEscalaGlobal.length > 0 && (
              <SecaoColapsavel
                icon={AlertCircle}
                titulo="Sem escala em nenhum ministério"
                badge={dados.semEscalaGlobal.length}
                theme={theme}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {dados.semEscalaGlobal.map((p) => (
                    <span key={p} style={{
                      fontSize: "12px", color: theme.danger,
                      background: theme.dangerDim, border: `1px solid ${theme.danger}33`,
                      borderRadius: "4px", padding: "3px 10px",
                    }}>
                      {p.toUpperCase()}
                    </span>
                  ))}
                </div>
              </SecaoColapsavel>
            )}

            {/* Detalhamento por ministério */}
            <SecaoColapsavel icon={BarChart3} titulo="Detalhamento por ministério" theme={theme}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {MINISTERIOS_IDS.map((mid) => (
                  <MinisterioDetalhe
                    key={mid}
                    rel={dados.porMinisterio[mid]}
                    theme={theme}
                  />
                ))}
              </div>
            </SecaoColapsavel>
          </div>
        )}
      </main>
    </div>
  );
}
