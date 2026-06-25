// ===== src/components/IndisponibilidadeModal.jsx =====
import { useState, useEffect, useMemo, useRef } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs, setDoc, doc } from "firebase/firestore";
import { pessoasPorMinisterio } from "../data/pessoas";
import { accentAlpha } from "../constants/theme";
import {
  chaveIndisponibilidadeColuna,
  contarIndisponibilidadesNoMes,
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

const badgeNeutro = (t) => ({
  fontSize: "10px",
  fontWeight: 600,
  color: t.textMuted,
  background: accentAlpha(0.06),
  borderRadius: "10px",
  padding: "1px 7px",
  border: `1px solid ${t.border}`,
  whiteSpace: "nowrap",
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

export default function IndisponibilidadeModal({ aberto, onFechar, onDetectarOutrosMinisterios, ministerioId, datasDisponiveis, mes, theme: t }) {
  const [indisponiveisMap, setIndisponiveisMap] = useState({});
  const [salvando, setSalvando] = useState({});
  const [expandida, setExpandida] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importando, setImportando] = useState(false);
  const [importResult, setImportResult] = useState(null); // { adicionadas: number } | null
  const listaRef = useRef(null);

  const pessoas = pessoasPorMinisterio[ministerioId] || [];
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

  // Carrega indisponibilidades do ministério
  useEffect(() => {
    if (!aberto || !ministerioId) return;
    setLoading(true);
    setImportResult(null);
    let cancelled = false;

    getDocs(query(
      collection(db, "indisponibilidades"),
      where("ministerioId", "==", ministerioId)
    )).then(snap => {
      if (cancelled) return;
      const map = {};
      snap.docs.forEach(d => {
        const data = d.data();
        map[data.pessoaNome] = new Set(data.datas || []);
      });
      setIndisponiveisMap(map);
      setLoading(false);
    }).catch(() => setLoading(false));

    return () => { cancelled = true; };
  }, [aberto, ministerioId]);

  const toggleData = async (pessoaNome, data, turno) => {
    const key = pessoaNome.toLowerCase();
    const chave = `${data}|${turno ?? "único"}`;
    const atual = new Set(indisponiveisMap[key] || []);

    if (atual.has(chave)) {
      atual.delete(chave);
    } else {
      atual.add(chave);
    }

    setIndisponiveisMap(prev => ({ ...prev, [key]: atual }));
    setSalvando(prev => ({ ...prev, [key]: true }));

    try {
      const docId = `${ministerioId}_${key.replace(/\s+/g, "_").replace(/\./g, "")}`;
      await setDoc(doc(db, "indisponibilidades", docId), {
        ministerioId,
        pessoaNome: key,
        datas: [...atual],
      });
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

    setIndisponiveisMap(prev => ({ ...prev, [key]: datasNormalizadas }));
    setSalvando(prev => ({ ...prev, [key]: true }));
    try {
      const docId = `${ministerioId}_${key.replace(/\s+/g, "_").replace(/\./g, "")}`;
      await setDoc(doc(db, "indisponibilidades", docId), {
        ministerioId,
        pessoaNome: key,
        datas: [...datasNormalizadas],
      });
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

  // ── Importa datas de outros ministérios automaticamente ─────────────────
  const importarEscalasCruzadas = async () => {
    if (!mes || importando) return;
    onDetectarOutrosMinisterios?.();
    setImportando(true);
    setImportResult(null);

    const [ano, mesNum] = mes.split("-");
    const inicio = `${ano}-${mesNum}-01`;
    const fim    = `${ano}-${mesNum}-${new Date(ano, mesNum, 0).getDate()}`;

    const pessoasLower = new Set(pessoas.map(p => p.toLowerCase()));

    try {
      // Busca todas as escalas do mês em todos os ministérios
      const snap = await getDocs(query(
        collection(db, "escalas"),
        where("data", ">=", inicio),
        where("data", "<=", fim)
      ));

      // Monta mapa: pessoaNome (lower) → Set de "data|turno" de OUTROS ministérios
      const crossMap = {};
      snap.docs.forEach(d => {
        const escala = d.data();
        if (escala.ministerioId === ministerioId) return; // ignora o próprio ministério
        if (!pessoasLower.has(escala.pessoaNome))  return; // ignora quem não é deste ministério

        const key = escala.pessoaNome; // já em lowercase no Firestore
        if (!crossMap[key]) crossMap[key] = new Set();
        crossMap[key].add(`${escala.data}|${escala.turno ?? "único"}`);
      });

      if (Object.keys(crossMap).length === 0) {
        setImportResult({ adicionadas: 0 });
        setImportando(false);
        return;
      }

      // Mescla com indisponibilidades existentes e persiste
      const novoMap = { ...indisponiveisMap };
      let totalAdicionadas = 0;

      await Promise.all(
        Object.entries(crossMap).map(async ([pessoaNome, novasDatas]) => {
          const atual = new Set(novoMap[pessoaNome] || []);
          let qtdNova = 0;

          novasDatas.forEach(chave => {
            if (!atual.has(chave)) {
              atual.add(chave);
              qtdNova++;
            }
          });

          if (qtdNova > 0) {
            novoMap[pessoaNome] = atual;
            totalAdicionadas += qtdNova;

            const docId = `${ministerioId}_${pessoaNome.replace(/\s+/g, "_").replace(/\./g, "")}`;
            await setDoc(doc(db, "indisponibilidades", docId), {
              ministerioId,
              pessoaNome,
              datas: [...atual],
            });
          }
        })
      );

      setIndisponiveisMap(novoMap);
      setImportResult({ adicionadas: totalAdicionadas });
    } catch (err) {
      console.error("Erro ao importar escalas cruzadas:", err);
      setImportResult({ adicionadas: -1 }); // sinaliza erro
    } finally {
      setImportando(false);
    }
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

      {/* Animação de spin */}
      <style>{`@keyframes indispSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Panel */}
      <div style={{
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

        {/* Botão: importar escalas cruzadas */}
        <div style={{
          padding: "10px 20px",
          borderBottom: `1px solid ${t.border}`,
          flexShrink: 0,
          display: "flex", flexDirection: "column", gap: "6px",
        }}>
          <button
            onClick={importarEscalasCruzadas}
            disabled={importando || loading}
            title="Busca automaticamente as datas em que membros deste ministério já estão escalados em outros ministérios e marca como indisponíveis"
            style={{
              width: "100%",
              padding: "8px 12px",
              background: importando ? accentAlpha(0.06) : accentAlpha(0.08),
              border: `1px solid ${importando ? accentAlpha(0.2) : accentAlpha(0.3)}`,
              borderRadius: "7px",
              color: importando ? t.textMuted : t.accent,
              fontSize: "12px", fontWeight: 600,
              cursor: (importando || loading) ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
              transition: "all 0.15s",
              opacity: loading ? 0.5 : 1,
            }}
            onMouseEnter={e => {
              if (!importando && !loading) {
                e.currentTarget.style.background = accentAlpha(0.15);
                e.currentTarget.style.borderColor = accentAlpha(0.5);
              }
            }}
            onMouseLeave={e => {
              if (!importando && !loading) {
                e.currentTarget.style.background = accentAlpha(0.08);
                e.currentTarget.style.borderColor = accentAlpha(0.3);
              }
            }}
          >
            {importando ? (
              <>
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  style={{ animation: "indispSpin 0.8s linear infinite" }}
                >
                  <path d="M21 12a9 9 0 1 1-6.22-8.56"/>
                </svg>
                Buscando escalas...
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                  <path d="m15 5 4 4"/>
                </svg>
                Detectar de outros ministérios
              </>
            )}
          </button>

          {/* Resultado da importação */}
          {importResult !== null && (
            <div style={{
              padding: "6px 10px",
              borderRadius: "6px",
              fontSize: "11px", fontWeight: 500,
              display: "flex", alignItems: "center", gap: "6px",
              ...(importResult.adicionadas < 0 ? {
                background: "rgba(251,113,133,0.08)",
                border: "1px solid rgba(251,113,133,0.25)",
                color: "#f87171",
              } : importResult.adicionadas === 0 ? {
                background: "rgba(148,163,184,0.06)",
                border: `1px solid ${t.border}`,
                color: t.textMuted,
              } : {
                background: "rgba(52,211,153,0.08)",
                border: "1px solid rgba(52,211,153,0.25)",
                color: "#34d399",
              }),
            }}>
              {importResult.adicionadas < 0 ? (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  Erro ao buscar escalas. Tente novamente.
                </>
              ) : importResult.adicionadas === 0 ? (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                  Nenhuma nova data encontrada nos outros ministérios
                </>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  {importResult.adicionadas} data{importResult.adicionadas !== 1 ? "s" : ""} marcada{importResult.adicionadas !== 1 ? "s" : ""} automaticamente
                </>
              )}
            </div>
          )}
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
              const qtd = contarIndisponibilidadesNoMes(indisponiveis, datasDisponiveis);

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

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {qtd > 0 && (
                        <span style={badgeNeutro(t)}>
                          {qtd} {qtd === 1 ? "indisponível" : "indisponíveis"}
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
                                  const bloqueado = indisponiveis.has(chave);
                                  const descricao = descricaoTurnoIndisponibilidade(d);

                                  return (
                                    <button
                                      key={d.id}
                                      type="button"
                                      role="gridcell"
                                      className={`indisp-bolinha ${bloqueado ? "indisp-bolinha--bloqueado" : "indisp-bolinha--neutro"}`}
                                      aria-pressed={bloqueado}
                                      aria-label={
                                        bloqueado
                                          ? `${descricao}, bloqueado — clique para liberar`
                                          : `${descricao}, disponível — clique para bloquear`
                                      }
                                      disabled={isSalvando}
                                      onClick={() => toggleData(pessoa, d.data, d.turno)}
                                    >
                                      <span className="indisp-bolinha__codigo">
                                        {codigoTurnoIndisponibilidade(d)}
                                      </span>
                                      <span className="indisp-bolinha__data">
                                        {dataTurnoIndisponibilidadeCurta(d.data)}
                                      </span>
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
              Indisponível
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
