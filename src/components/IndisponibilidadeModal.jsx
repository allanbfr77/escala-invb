// ===== src/components/IndisponibilidadeModal.jsx =====
import { useState, useEffect, useMemo, useRef } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs, setDoc, doc, deleteDoc } from "firebase/firestore";
import { pessoasPorMinisterio } from "../data/pessoas";
import { accentAlpha } from "../constants/theme";
import { useEscalasCruzadas } from "../hooks/useEscalasCruzadas";
import { useIndisponibilidadesMinisterio } from "../hooks/useIndisponibilidadesMinisterio";
import { IconeMinisterio } from "../utils/ministerioIcons";
import {
  contarResumoBloqueiosIndisponibilidade,
  getEscalaExterna,
  abrevMinisterioIndisp,
  nomeMinisterioEscalaExterna,
} from "../utils/escalasCruzadas";
import {
  chaveIndisponibilidadeColuna,
  codigoTurnoIndisponibilidade,
  dataTurnoIndisponibilidadeCurta,
  descricaoTurnoIndisponibilidade,
  montarSemanasIndisponibilidade,
  COLUNAS_SEMANA,
} from "../utils/indisponibilidadeHelpers";

const ROTULOS_COLUNA_SEMANA = [
  { key: "quarta", lines: ["QUARTA"] },
  { key: "manha", lines: ["DOM", "MANHÃ"] },
  { key: "noite", lines: ["DOM", "NOITE"] },
];

const badgeManual = () => ({
  fontSize: "10px",
  fontWeight: 600,
  color: "var(--indisp-bloqueado-fg)",
  background: "var(--indisp-bloqueado-bg)",
  borderRadius: "10px",
  padding: "1px 7px",
  border: "1px solid var(--indisp-bloqueado-border)",
  whiteSpace: "nowrap",
});

const badgeExterno = () => ({
  fontSize: "10px",
  fontWeight: 600,
  color: "var(--indisp-externo-fg)",
  background: "color-mix(in srgb, var(--indisp-externo-bg) 50%, transparent)",
  borderRadius: "10px",
  padding: "1px 7px",
  border: "1px dashed var(--indisp-externo-border)",
  whiteSpace: "nowrap",
  opacity: 0.9,
});

const INDISP_SCROLL_OFFSET = 8;

function ancestralScrollavel(el) {
  let node = el?.parentElement;
  while (node && node !== document.body) {
    const { overflowY, overflow } = window.getComputedStyle(node);
    const podeRolar = (v) => v === "auto" || v === "scroll" || v === "overlay";
    if ((podeRolar(overflowY) || podeRolar(overflow)) && node.scrollHeight > node.clientHeight + 1) {
      return node;
    }
    node = node.parentElement;
  }
  return document.scrollingElement ?? document.documentElement;
}

/** Alinha o cabeçalho ao topo do ancestral scrollável, após reflow do painel expandido. */
function scrollCabecalhoAoTopo(cabecalho, containerPreferido, offset = INDISP_SCROLL_OFFSET) {
  if (!cabecalho) return;

  const executar = () => {
    const scrollParent = containerPreferido ?? ancestralScrollavel(cabecalho);
    if (!scrollParent) return;

    if (scrollParent === document.documentElement || scrollParent === document.body) {
      const top = window.scrollY + cabecalho.getBoundingClientRect().top - offset;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      return;
    }

    const delta = cabecalho.getBoundingClientRect().top - scrollParent.getBoundingClientRect().top - offset;
    scrollParent.scrollTo({
      top: Math.max(0, scrollParent.scrollTop + delta),
      behavior: "smooth",
    });
  };

  requestAnimationFrame(() => requestAnimationFrame(executar));
}

export default function IndisponibilidadeModal({ aberto, onFechar, ministerioId, datasDisponiveis, mes, theme: t }) {
  const [salvando, setSalvando] = useState({});
  const [expandida, setExpandida] = useState(null);
  const listaRef = useRef(null);

  const pessoas = pessoasPorMinisterio[ministerioId] || [];
  const pessoasLowerSet = useMemo(
    () => new Set(pessoas.map((p) => p.toLowerCase())),
    [pessoas]
  );
  const { indisponiveisMap, loading } = useIndisponibilidadesMinisterio(
    ministerioId,
    aberto && !!ministerioId
  );
  const { mapa: escalasCruzadasMap } = useEscalasCruzadas({
    mes,
    pessoasLowerSet,
    enabled: aberto && !!ministerioId,
  });
  const semanas = useMemo(
    () => montarSemanasIndisponibilidade(datasDisponiveis),
    [datasDisponiveis]
  );

  const alternarExpansao = (pessoa, estaAberta) => {
    setExpandida(estaAberta ? null : pessoa);
  };

  useEffect(() => {
    if (!aberto || !expandida) return;
    const cabecalho = document.getElementById(`indisp-trigger-${expandida.toLowerCase()}`);
    scrollCabecalhoAoTopo(cabecalho, listaRef.current);
  }, [expandida, aberto]);

  const toggleData = async (pessoaNome, data, turno) => {
    const key = pessoaNome.toLowerCase();
    const chave = `${data}|${turno ?? "único"}`;
    const atual = new Set(indisponiveisMap[key] || []);

    if (atual.has(chave)) {
      atual.delete(chave);
    } else {
      atual.add(chave);
    }

    setSalvando(prev => ({ ...prev, [key]: true }));

    try {
      const docId = `${ministerioId}_${key.replace(/\s+/g, "_").replace(/\./g, "")}`;
      if (atual.size === 0) {
        await deleteDoc(doc(db, "indisponibilidades", docId));
      } else {
        await setDoc(doc(db, "indisponibilidades", docId), {
          ministerioId,
          pessoaNome: key,
          datas: [...atual],
        });
      }
    } catch (err) {
      console.error("Erro ao salvar indisponibilidade:", err);
    } finally {
      setSalvando(prev => ({ ...prev, [key]: false }));
    }
  };

  const getDatasIndisponiveis = (pessoaNome) => {
    return indisponiveisMap[pessoaNome.toLowerCase()] || new Set();
  };

  const salvarDatasPessoa = async (pessoaNome, datasSet) => {
    const key = pessoaNome.toLowerCase();
    const datasNormalizadas = new Set(datasSet || []);

    setSalvando(prev => ({ ...prev, [key]: true }));
    try {
      const docId = `${ministerioId}_${key.replace(/\s+/g, "_").replace(/\./g, "")}`;
      if (datasNormalizadas.size === 0) {
        await deleteDoc(doc(db, "indisponibilidades", docId));
      } else {
        await setDoc(doc(db, "indisponibilidades", docId), {
          ministerioId,
          pessoaNome: key,
          datas: [...datasNormalizadas],
        });
      }
    } catch (err) {
      console.error("Erro ao salvar indisponibilidades:", err);
    } finally {
      setSalvando(prev => ({ ...prev, [key]: false }));
    }
  };

  const limparSelecao = async (pessoaNome) => {
    await salvarDatasPessoa(pessoaNome, new Set());
  };

  const selecionarTodasDatas = async (pessoaNome) => {
    const todasAsDatas = new Set(
      datasDisponiveis.map(d => `${d.data}|${d.turno ?? "único"}`)
    );
    await salvarDatasPessoa(pessoaNome, todasAsDatas);
  };

  if (!aberto) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onFechar}
        style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)",
        }}
      />

      {/* Panel */}
      <div className="indisp-panel" style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 301,
        width: "380px", maxWidth: "100vw",
        background: t.surface,
        borderLeft: `1px solid ${t.border}`,
        display: "flex", flexDirection: "column",
        fontFamily: "'Outfit', sans-serif",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.4)",
      }}>

        {/* Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: `1px solid ${t.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: t.text }}>
              Indisponibilidades
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: t.textMuted }}>
              Marque as datas em que cada pessoa não pode ser escalada
            </p>
          </div>
          <button
            onClick={onFechar}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: t.textMuted, padding: "4px", display: "flex",
              transition: "color 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.color = t.text}
            onMouseLeave={e => e.currentTarget.style.color = t.textMuted}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div ref={listaRef} style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
          {loading ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: t.textMuted, fontSize: "13px" }}>
              Carregando...
            </div>
          ) : pessoas.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: t.textMuted, fontSize: "13px" }}>
              Nenhum membro encontrado
            </div>
          ) : (
            pessoas.map(pessoa => {
              const key = pessoa.toLowerCase();
              const indisponiveis = getDatasIndisponiveis(pessoa);
              const aberta = expandida === pessoa;
              const isSalvando = salvando[key];
              const resumo = contarResumoBloqueiosIndisponibilidade(
                indisponiveis,
                datasDisponiveis,
                escalasCruzadasMap,
                ministerioId,
                pessoa
              );
              const { manual: qtdManual, externo: qtdExterno } = resumo;

              return (
                <div key={pessoa} style={{ borderBottom: `1px solid ${t.border}` }}>
                  {/* Person row */}
                  <button
                    type="button"
                    onClick={() => alternarExpansao(pessoa, aberta)}
                    aria-expanded={aberta}
                    aria-controls={`indisp-panel-${key}`}
                    id={`indisp-trigger-${key}`}
                    style={{
                      width: "100%", padding: "11px 20px",
                      background: aberta ? t.accentDim : "transparent",
                      border: "none", cursor: "pointer", fontFamily: "inherit",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      transition: "background 0.15s",
                      scrollMarginTop: `${INDISP_SCROLL_OFFSET}px`,
                    }}
                    onMouseEnter={e => { if (!aberta) e.currentTarget.style.background = accentAlpha(0.04); }}
                    onMouseLeave={e => { e.currentTarget.style.background = aberta ? t.accentDim : "transparent"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{
                        width: "30px", height: "30px", borderRadius: "50%",
                        background: aberta ? t.accent : t.border,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "11px", fontWeight: 700, color: aberta ? "white" : t.textMuted,
                        flexShrink: 0, transition: "all 0.15s",
                        fontFamily: "'Outfit', sans-serif",
                      }}>
                        {pessoa.charAt(0)}
                      </span>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: t.text }}>
                        {pessoa}
                      </span>
                      {isSalvando && (
                        <span style={{ fontSize: "10px", color: t.textMuted }}>salvando...</span>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {qtdManual > 0 && (
                        <span style={badgeManual()}>
                          {qtdManual}{" "}
                          {qtdManual === 1 ? "data indisponível" : "datas indisponíveis"}
                        </span>
                      )}
                      {qtdExterno > 0 && (
                        <span style={badgeExterno()}>
                          {qtdExterno} {qtdExterno === 1 ? "outro min." : "outros min."}
                        </span>
                      )}
                      <svg
                        width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke={t.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transition: "transform 0.2s", transform: aberta ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
                      >
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </div>
                  </button>

                  {/* Date list */}
                  {aberta && (
                    <div
                      id={`indisp-panel-${key}`}
                      role="region"
                      aria-labelledby={`indisp-trigger-${key}`}
                      className="indisp-person-panel"
                      style={{
                      padding: "6px 20px 12px",
                      background: accentAlpha(0.03),
                    }}>
                      {datasDisponiveis.length === 0 ? (
                        <p style={{ fontSize: "12px", color: t.textMuted, margin: "8px 0 0" }}>
                          Nenhuma data disponível neste mês
                        </p>
                      ) : (
                        <>
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                            marginTop: "4px",
                            marginBottom: 0,
                          }}>
                            <span style={{ fontSize: "10px", color: t.textMuted, fontWeight: 600 }}>
                              Ações rápidas
                            </span>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                type="button"
                                onClick={() => limparSelecao(pessoa)}
                                disabled={isSalvando}
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "5px",
                                  border: `1px solid ${t.border}`,
                                  background: "transparent",
                                  color: t.textMuted,
                                  fontSize: "10px",
                                  fontWeight: 600,
                                  cursor: isSalvando ? "not-allowed" : "pointer",
                                  opacity: isSalvando ? 0.6 : 1,
                                  fontFamily: "inherit",
                                  transition: "all 0.15s",
                                }}
                                onMouseEnter={e => {
                                  if (!isSalvando) {
                                    e.currentTarget.style.borderColor = "var(--indisp-neutro-border)";
                                    e.currentTarget.style.background = "var(--indisp-neutro-bg)";
                                    e.currentTarget.style.color = "var(--indisp-neutro-fg)";
                                  }
                                }}
                                onMouseLeave={e => {
                                  if (!isSalvando) {
                                    e.currentTarget.style.borderColor = t.border;
                                    e.currentTarget.style.background = "transparent";
                                    e.currentTarget.style.color = t.textMuted;
                                  }
                                }}
                              >
                                Limpar seleção
                              </button>
                              <button
                                type="button"
                                onClick={() => selecionarTodasDatas(pessoa)}
                                disabled={isSalvando}
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "5px",
                                  border: `1px solid ${t.border}`,
                                  background: "transparent",
                                  color: t.textMuted,
                                  fontSize: "10px",
                                  fontWeight: 600,
                                  cursor: isSalvando ? "not-allowed" : "pointer",
                                  opacity: isSalvando ? 0.6 : 1,
                                  fontFamily: "inherit",
                                  transition: "all 0.15s",
                                }}
                                onMouseEnter={e => {
                                  if (!isSalvando) {
                                    e.currentTarget.style.borderColor = "var(--indisp-bloqueado-border)";
                                    e.currentTarget.style.background = "var(--indisp-bloqueado-bg)";
                                    e.currentTarget.style.color = "var(--indisp-bloqueado-fg)";
                                  }
                                }}
                                onMouseLeave={e => {
                                  if (!isSalvando) {
                                    e.currentTarget.style.borderColor = t.border;
                                    e.currentTarget.style.background = "transparent";
                                    e.currentTarget.style.color = t.textMuted;
                                  }
                                }}
                              >
                                Selecionar todas
                              </button>
                            </div>
                          </div>

                          <div className="indisp-acoes-divider" aria-hidden />

                          {qtdExterno > 0 && (
                            <p className="indisp-ajuda-externo" role="note">
                              Círculos tracejados = escalado em outro ministério.
                            </p>
                          )}

                          <div
                            className="indisp-semanas"
                            role="group"
                            aria-label={`Turnos de ${pessoa} por semana`}
                          >
                            <div className="indisp-semanas-header" aria-hidden>
                              {ROTULOS_COLUNA_SEMANA.map(({ key, lines }) => (
                                <span key={key} className="indisp-semanas-header__col">
                                  {lines.map((line) => (
                                    <span key={line} className="indisp-semanas-header__line">{line}</span>
                                  ))}
                                </span>
                              ))}
                            </div>

                            {semanas.map((semana) => (
                              <div key={semana.key} className="indisp-semanas-row" role="row">
                                {COLUNAS_SEMANA.map((coluna) => {
                                  const d = semana[coluna];

                                  if (!d) {
                                    return (
                                      <div
                                        key={coluna}
                                        className="indisp-bolinha indisp-bolinha--vazia"
                                        role="presentation"
                                        aria-label="Sem culto nesta posição"
                                      >
                                        —
                                      </div>
                                    );
                                  }

                                  const chave = chaveIndisponibilidadeColuna(d);
                                  const bloqueioManual = indisponiveis.has(chave);
                                  const escalaExterna = getEscalaExterna(
                                    escalasCruzadasMap,
                                    ministerioId,
                                    pessoa,
                                    d
                                  );
                                  const bloqueioExterno = !!escalaExterna;
                                  const bloqueado = bloqueioManual || bloqueioExterno;
                                  const descricao = descricaoTurnoIndisponibilidade(d);
                                  const dataCurta = dataTurnoIndisponibilidadeCurta(d.data);
                                  const abrevMinExterno = escalaExterna
                                    ? abrevMinisterioIndisp(escalaExterna.ministerioId)
                                    : "";
                                  const nomeMinExterno = escalaExterna
                                    ? nomeMinisterioEscalaExterna(escalaExterna)
                                    : "";

                                  return (
                                    <button
                                      key={d.id}
                                      type="button"
                                      role="gridcell"
                                      className={[
                                        "indisp-bolinha",
                                        bloqueioExterno
                                          ? "indisp-bolinha--externo"
                                          : bloqueado
                                            ? "indisp-bolinha--bloqueado"
                                            : "indisp-bolinha--neutro",
                                      ].join(" ")}
                                      aria-pressed={bloqueado}
                                      aria-label={
                                        bloqueioExterno
                                          ? `${descricao}, ${dataCurta}, escalado(a) em ${nomeMinExterno} — somente leitura`
                                          : bloqueado
                                            ? `${descricao}, ${dataCurta}, bloqueado — clique para liberar`
                                            : `${descricao}, ${dataCurta}, disponível — clique para bloquear`
                                      }
                                      disabled={isSalvando || bloqueioExterno}
                                      onClick={() => {
                                        if (bloqueioExterno) return;
                                        toggleData(pessoa, d.data, d.turno);
                                      }}
                                    >
                                      <span className="indisp-bolinha__data">{dataCurta}</span>
                                      {bloqueioExterno ? (
                                        <>
                                          <span className="indisp-bolinha__icone-ministerio">
                                            <IconeMinisterio
                                              ministerioId={escalaExterna.ministerioId}
                                              size={14}
                                              strokeWidth={2}
                                            />
                                          </span>
                                          <span className="indisp-bolinha__ministerio">
                                            {abrevMinExterno}
                                          </span>
                                        </>
                                      ) : (
                                        <span className="indisp-bolinha__codigo">
                                          {codigoTurnoIndisponibilidade(d)}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px",
          borderTop: `1px solid ${t.border}`,
          flexShrink: 0,
        }}>
          <p style={{ margin: 0, fontSize: "11px", color: t.textMuted, textAlign: "center" }}>
            Alterações salvas automaticamente
          </p>
          <div className="indisp-legenda" aria-label="Legenda de cores">
            <span className="indisp-legenda__item">
              <span className="indisp-legenda__dot indisp-legenda__dot--neutro" aria-hidden />
              Disponível
            </span>
            <span className="indisp-legenda__item">
              <span className="indisp-legenda__dot indisp-legenda__dot--bloqueado" aria-hidden />
              Indisponível (manual)
            </span>
            <span className="indisp-legenda__item">
              <span className="indisp-legenda__dot indisp-legenda__dot--externo" aria-hidden />
              Outro ministério (somente leitura)
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
