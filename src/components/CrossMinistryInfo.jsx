// ===== src/components/CrossMinistryInfo.jsx =====
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { pessoasPorMinisterio } from "../data/pessoas";
import { formatarData } from "../utils/dateHelper";
import { nomeParaExibicao } from "../utils/nomeExibicao";
import BotaoVoltar from "./BotaoVoltar";

const MINISTERIOS = {
  comunicacao: { label: "COMUNICAÇÕES", color: "#60a5fa", rgb: "96,165,250", bg: "rgba(96,165,250,0.09)", border: "rgba(96,165,250,0.22)", glow: "rgba(96,165,250,0.35)" },
  louvor:      { label: "LOUVOR",       color: "#e8c766", rgb: "232,199,102", bg: "rgba(232,199,102,0.09)", border: "rgba(232,199,102,0.22)", glow: "rgba(232,199,102,0.35)" },
  recepcao:    { label: "INTRODUÇÃO",   color: "#34d399", rgb: "52,211,153", bg: "rgba(52,211,153,0.09)", border: "rgba(52,211,153,0.22)", glow: "rgba(52,211,153,0.35)" },
  infantil:    { label: "INFANTIL",     color: "#f472b6", rgb: "244,114,182", bg: "rgba(244,114,182,0.09)", border: "rgba(244,114,182,0.22)", glow: "rgba(244,114,182,0.35)" },
};

export default function CrossMinistryInfo({ ministerioId, mes, theme: t, onVoltar }) {
  const [dados, setDados] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ministerioId || !mes) { setLoading(false); return; }

    const pessoas = pessoasPorMinisterio[ministerioId] || [];
    if (pessoas.length === 0) { setLoading(false); return; }

    const pessoasLower = new Set(pessoas.map(p => p.toLowerCase()));
    const [ano, mesNum] = mes.split("-");
    const inicio = `${ano}-${mesNum}-01`;
    const fim = `${ano}-${mesNum}-${new Date(ano, mesNum, 0).getDate()}`;

    let cancelled = false;
    setLoading(true);

    getDocs(
      query(
        collection(db, "escalas"),
        where("data", ">=", inicio),
        where("data", "<=", fim)
      )
    )
      .then(snap => {
        if (cancelled) return;
        const agrupado = {};

        snap.docs.forEach(doc => {
          const d = doc.data();
          if (d.ministerioId === ministerioId) return;
          if (!pessoasLower.has(d.pessoaNome)) return;

          const nome = nomeParaExibicao(d.pessoaNome);
          if (!agrupado[nome]) agrupado[nome] = {};
          if (!agrupado[nome][d.ministerioId]) agrupado[nome][d.ministerioId] = [];
          agrupado[nome][d.ministerioId].push({ data: d.data, turno: d.turno, funcao: d.funcao });
        });

        Object.keys(agrupado).forEach(nome => {
          Object.keys(agrupado[nome]).forEach(mid => {
            agrupado[nome][mid].sort((a, b) => a.data.localeCompare(b.data));
          });
        });

        setDados(agrupado);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    return () => { cancelled = true; };
  }, [ministerioId, mes]);

  const pessoas = Object.keys(dados).sort();

  if (loading) {
    return (
      <div style={{ padding: "48px 24px", textAlign: "center" }}>
        <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: "'Outfit', sans-serif" }}>
          Carregando escalas em outros ministérios...
        </p>
      </div>
    );
  }

  if (pessoas.length === 0) {
    return (
      <div style={{
        padding: "48px 24px", textAlign: "center",
        borderRadius: "10px", border: `1px solid ${t.border}`,
        background: "var(--surface)",
      }}>
        <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: "'Outfit', sans-serif" }}>
          Nenhum membro deste ministério está escalado em outros ministérios neste mês.
        </p>
      </div>
    );
  }

  return (
    <div className="cross-ministry-wrap" style={{ width: "100%", maxWidth: "1080px", margin: "0 auto", minWidth: 0 }}>

      {onVoltar && (
        <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "8px" }}>
          <BotaoVoltar onClick={onVoltar} title="Voltar para escala" />
        </div>
      )}

      <div
        className="cross-ministry-header"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          marginBottom: "18px",
          textAlign: "center",
        }}
      >
        <div
          className="cross-ministry-count-circle"
          style={{ border: `2px solid ${t.border}` }}
        >
          {pessoas.length}
        </div>
        <span className="cross-ministry-titulo">
          Membros escalados em <br className="cross-titulo-br" />outros ministérios este mês
        </span>
      </div>

      <div className="cross-ministry-grid" style={{ minWidth: 0 }}>
        {pessoas.map(nome => {
          const grupos = dados[nome];
          const ministeriosIds = Object.keys(grupos);
          const totalEscalas = ministeriosIds.reduce((acc, mid) => acc + grupos[mid].length, 0);

          return (
            <div
              key={nome}
              className="cross-ministry-card"
              style={{
                borderRadius: "8px",
                border: `1px solid ${t.border}`,
                background: t.surface,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                width: "100%",
                minHeight: 0,
              }}
            >
              <div style={{
                padding: "10px 14px",
                borderBottom: `1px solid ${t.border}`,
                flexShrink: 0,
              }}>
                <span style={{
                  fontSize: "13px", fontWeight: 700, color: t.text,
                  letterSpacing: "0.3px", fontFamily: "'Outfit', sans-serif",
                  wordBreak: "break-word",
                }}>
                  {nome}{" "}
                  <span style={{ fontWeight: 400 }}>
                    ({totalEscalas} {totalEscalas === 1 ? "escala" : "escalas"})
                  </span>
                </span>
              </div>

              <div
                className="cross-ministry-scroll"
                style={{
                  padding: "10px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {ministeriosIds.map(mid => {
                  const cfg = MINISTERIOS[mid] || {
                    label: mid.toUpperCase(), color: t.accent,
                    bg: t.accentDim, border: t.border, glow: t.accentDim,
                  };
                  return (
                    <div key={mid}>
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: "5px",
                        background: cfg.bg, border: `1px solid ${cfg.border}`,
                        borderRadius: "4px", padding: "2px 8px", marginBottom: "8px",
                      }}>
                        <span style={{
                          width: "5px", height: "5px", borderRadius: "50%",
                          background: cfg.color, flexShrink: 0,
                        }} />
                        <span style={{
                          fontSize: "10px", fontWeight: 700, color: cfg.color,
                          textTransform: "uppercase", letterSpacing: "0.5px",
                          fontFamily: "'Outfit', sans-serif",
                        }}>
                          {cfg.label}
                        </span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        {grupos[mid].map((item, i) => (
                          <div key={i} style={{ paddingLeft: "4px" }}>
                            <div style={{
                              fontSize: "12px", color: t.text,
                              fontWeight: 700, fontFamily: "'Outfit', sans-serif",
                              lineHeight: "1.4",
                            }}>
                              {formatarData(item.data, item.turno)}
                            </div>
                            {item.funcao && (
                              <div style={{
                                fontSize: "10px", color: t.textMuted,
                                fontWeight: 400, lineHeight: "1.3",
                                marginTop: "1px",
                              }}>
                                {item.funcao}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
