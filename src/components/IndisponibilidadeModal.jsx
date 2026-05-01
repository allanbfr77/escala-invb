// ===== src/components/IndisponibilidadeModal.jsx =====
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs, setDoc, doc } from "firebase/firestore";
import { pessoasPorMinisterio } from "../data/pessoas";
import { formatarData } from "../utils/dateHelper";
import { accentAlpha } from "../constants/theme";

export default function IndisponibilidadeModal({ aberto, onFechar, ministerioId, datasDisponiveis, mes, theme: t }) {
  const [indisponiveisMap, setIndisponiveisMap] = useState({});
  const [salvando, setSalvando] = useState({});
  const [expandida, setExpandida] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importando, setImportando] = useState(false);
  const [importResult, setImportResult] = useState(null); // { adicionadas: number } | null

  const pessoas = pessoasPorMinisterio[ministerioId] || [];

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
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
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
              const qtd = indisponiveis.size;

              return (
                <div key={pessoa} style={{ borderBottom: `1px solid ${t.border}` }}>
                  {/* Person row */}
                  <button
                    onClick={() => setExpandida(aberta ? null : pessoa)}
                    style={{
                      width: "100%", padding: "11px 20px",
                      background: aberta ? t.accentDim : "transparent",
                      border: "none", cursor: "pointer", fontFamily: "inherit",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => { if (!aberta) e.currentTarget.style.background = accentAlpha(0.04); }}
                    onMouseLeave={e => { if (!aberta) e.currentTarget.style.background = "transparent"; }}
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
                        <span style={{
                          fontSize: "10px", fontWeight: 700,
                          color: "#f87171", background: "rgba(248,113,113,0.12)",
                          borderRadius: "10px", padding: "1px 7px",
                          border: "1px solid rgba(248,113,113,0.25)",
                        }}>
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
                    <div style={{
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
                            marginBottom: "6px",
                          }}>
                            <span style={{ fontSize: "10px", color: t.textMuted, fontWeight: 600 }}>
                              Ações rápidas
                            </span>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                onClick={() => selecionarTodasDatas(pessoa)}
                                disabled={isSalvando}
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "5px",
                                  border: `1px solid ${t.border}`,
                                  background: "transparent",
                                  color: t.textMuted,
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  cursor: isSalvando ? "not-allowed" : "pointer",
                                  opacity: isSalvando ? 0.6 : 1,
                                  fontFamily: "inherit",
                                  transition: "all 0.15s",
                                }}
                                onMouseEnter={e => {
                                  if (!isSalvando) {
                                    e.currentTarget.style.borderColor = "rgba(248,113,113,0.45)";
                                    e.currentTarget.style.background = "rgba(248,113,113,0.1)";
                                    e.currentTarget.style.color = "#f87171";
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
                              <button
                                onClick={() => limparSelecao(pessoa)}
                                disabled={isSalvando}
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "5px",
                                  border: `1px solid ${t.border}`,
                                  background: "transparent",
                                  color: t.textMuted,
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  cursor: isSalvando ? "not-allowed" : "pointer",
                                  opacity: isSalvando ? 0.6 : 1,
                                  fontFamily: "inherit",
                                  transition: "all 0.15s",
                                }}
                                onMouseEnter={e => {
                                  if (!isSalvando) {
                                    e.currentTarget.style.borderColor = "rgba(52,211,153,0.45)";
                                    e.currentTarget.style.background = "rgba(52,211,153,0.1)";
                                    e.currentTarget.style.color = "#34d399";
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
                                Limpar todas
                              </button>
                            </div>
                          </div>

                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "4px",
                            marginTop: "4px",
                          }}>
                            {datasDisponiveis.map(d => {
                              const chave = `${d.data}|${d.turno ?? "único"}`;
                              const marcada = indisponiveis.has(chave);
                              return (
                                <button
                                  key={d.id}
                                  onClick={() => toggleData(pessoa, d.data, d.turno)}
                                  style={{
                                    padding: "6px 10px", borderRadius: "5px",
                                    border: `1px solid ${marcada ? "rgba(248,113,113,0.4)" : t.border}`,
                                    background: marcada ? "rgba(248,113,113,0.1)" : "transparent",
                                    color: marcada ? "#f87171" : t.textMuted,
                                    fontSize: "11px", fontWeight: marcada ? 600 : 400,
                                    cursor: "pointer", fontFamily: "inherit",
                                    display: "flex", alignItems: "center", gap: "5px",
                                    transition: "all 0.15s", textAlign: "left",
                                  }}
                                  onMouseEnter={e => {
                                    if (!marcada) e.currentTarget.style.borderColor = "rgba(248,113,113,0.3)";
                                  }}
                                  onMouseLeave={e => {
                                    if (!marcada) e.currentTarget.style.borderColor = t.border;
                                  }}
                                >
                                  {marcada && (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                      <path d="M18 6L6 18M6 6l12 12" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round"/>
                                    </svg>
                                  )}
                                  {formatarData(d.data, d.turno, d.descricao)}
                                </button>
                              );
                            })}
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
        </div>
      </div>
    </>
  );
}
