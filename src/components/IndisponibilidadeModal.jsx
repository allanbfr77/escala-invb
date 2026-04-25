// ===== src/components/IndisponibilidadeModal.jsx =====
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs, setDoc, doc } from "firebase/firestore";
import { pessoasPorMinisterio } from "../data/pessoas";
import { formatarData } from "../utils/dateHelper";

export default function IndisponibilidadeModal({ aberto, onFechar, ministerioId, datasDisponiveis, theme: t }) {
  const [indisponiveisMap, setIndisponiveisMap] = useState({});
  const [salvando, setSalvando] = useState({});
  const [expandida, setExpandida] = useState(null);
  const [loading, setLoading] = useState(true);

  const pessoas = pessoasPorMinisterio[ministerioId] || [];

  // Carrega indisponibilidades do ministério
  useEffect(() => {
    if (!aberto || !ministerioId) return;
    setLoading(true);
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

    // Atualiza estado imediatamente
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
                    onMouseEnter={e => { if (!aberta) e.currentTarget.style.background = `rgba(99,102,241,0.04)`; }}
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
                          color: "#fb923c", background: "rgba(251,146,60,0.12)",
                          borderRadius: "10px", padding: "1px 7px",
                          border: "1px solid rgba(251,146,60,0.25)",
                        }}>
                          {qtd} indisponível{qtd !== 1 ? "is" : ""}
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
                      background: "rgba(99,102,241,0.03)",
                    }}>
                      {datasDisponiveis.length === 0 ? (
                        <p style={{ fontSize: "12px", color: t.textMuted, margin: "8px 0 0" }}>
                          Nenhuma data disponível neste mês
                        </p>
                      ) : (
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
                                  border: `1px solid ${marcada ? "rgba(251,146,60,0.4)" : t.border}`,
                                  background: marcada ? "rgba(251,146,60,0.1)" : "transparent",
                                  color: marcada ? "#fb923c" : t.textMuted,
                                  fontSize: "11px", fontWeight: marcada ? 600 : 400,
                                  cursor: "pointer", fontFamily: "inherit",
                                  display: "flex", alignItems: "center", gap: "5px",
                                  transition: "all 0.15s", textAlign: "left",
                                }}
                                onMouseEnter={e => {
                                  if (!marcada) e.currentTarget.style.borderColor = "rgba(251,146,60,0.3)";
                                }}
                                onMouseLeave={e => {
                                  if (!marcada) e.currentTarget.style.borderColor = t.border;
                                }}
                              >
                                {marcada && (
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                    <path d="M18 6L6 18M6 6l12 12" stroke="#fb923c" strokeWidth="2.5" strokeLinecap="round"/>
                                  </svg>
                                )}
                                {formatarData(d.data, d.turno)}
                              </button>
                            );
                          })}
                        </div>
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
