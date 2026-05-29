import { useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Sun, Moon, AlertTriangle, ChevronDown, BarChart3, Users, AlertCircle } from "lucide-react";
import { useRelatorioUnificado } from "../hooks/useRelatorioUnificado";
import { MINISTERIOS_IDS, MINISTERIOS_INFO } from "../utils/relatorioUnificado";
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

function SecaoTitulo({ icon: Icon, titulo, badge, theme }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
      <Icon size={16} color={theme.accent} />
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
                {rel.funcoes.map((f) => {
                  const count = porFuncao[f];
                  if (!count) return null;
                  return (
                    <span key={f} style={{
                      fontSize: "10px", fontWeight: 600,
                      background: theme.surface, border: `1px solid ${theme.border}`,
                      borderRadius: "4px", padding: "2px 6px", color: theme.textMuted,
                    }}>
                      {f} ×{count}
                    </span>
                  );
                })}
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
              <SecaoTitulo icon={BarChart3} titulo="Resumo executivo" theme={theme} />
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
              <section>
                <SecaoTitulo icon={AlertTriangle} titulo="Alertas" badge={totalAlertas} theme={theme} />
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {dados.alertas.sobrecarga.map((c) => (
                    <AlertaItem key={c.pessoa} tipo="danger" theme={theme}>
                      <strong>{c.pessoa.toUpperCase()}</strong> com {c.total} escalas no mês
                      {c.qtdMinisterios >= 2 && ` em ${c.qtdMinisterios} ministérios`}
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
              </section>
            )}

            {/* Carga cruzada */}
            <section>
              <SecaoTitulo
                icon={Users}
                titulo="Carga cruzada"
                badge={dados.cargaCruzada.length}
                theme={theme}
              />
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
                            {c.total} escalas
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
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                            {MINISTERIOS_IDS.map((mid) => {
                              const count = c.porMinisterio[mid];
                              if (!count) return null;
                              const info = MINISTERIOS_INFO[mid];
                              return (
                                <span key={mid} style={{
                                  fontSize: "10px", fontWeight: 700, color: info.color,
                                  background: `${info.color}18`, border: `1px solid ${info.color}33`,
                                  borderRadius: "4px", padding: "3px 8px",
                                }}>
                                  {info.nome} ×{count}
                                </span>
                              );
                            })}
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
            </section>

            {/* Sem escala global */}
            {dados.semEscalaGlobal.length > 0 && (
              <section>
                <SecaoTitulo
                  icon={AlertCircle}
                  titulo="Sem escala em nenhum ministério"
                  badge={dados.semEscalaGlobal.length}
                  theme={theme}
                />
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
              </section>
            )}

            {/* Detalhamento por ministério */}
            <section>
              <SecaoTitulo icon={BarChart3} titulo="Detalhamento por ministério" theme={theme} />
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {MINISTERIOS_IDS.map((mid) => (
                  <MinisterioDetalhe
                    key={mid}
                    rel={dados.porMinisterio[mid]}
                    theme={theme}
                  />
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
