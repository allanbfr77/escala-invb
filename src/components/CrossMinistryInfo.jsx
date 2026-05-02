// ===== src/components/CrossMinistryInfo.jsx =====
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { pessoasPorMinisterio } from "../data/pessoas";
import { formatarData } from "../utils/dateHelper";
import { ACCENT_RGB, accentAlpha } from "../constants/theme";

const MINISTERIOS = {
  comunicacao: { label: "COMUNICAÇÕES", color: "#60a5fa", rgb: "96,165,250", bg: "rgba(96,165,250,0.09)", border: "rgba(96,165,250,0.22)", glow: "rgba(96,165,250,0.35)" },
  louvor:      { label: "LOUVOR",       color: "#e8c766", rgb: "232,199,102", bg: "rgba(232,199,102,0.09)", border: "rgba(232,199,102,0.22)", glow: "rgba(232,199,102,0.35)" },
  recepcao:    { label: "INTRODUÇÃO",   color: "#34d399", rgb: "52,211,153", bg: "rgba(52,211,153,0.09)", border: "rgba(52,211,153,0.22)", glow: "rgba(52,211,153,0.35)" },
  infantil:    { label: "INFANTIL",     color: "#f472b6", rgb: "244,114,182", bg: "rgba(244,114,182,0.09)", border: "rgba(244,114,182,0.22)", glow: "rgba(244,114,182,0.35)" },
};

export default function CrossMinistryInfo({ ministerioId, mes, theme: t }) {
  const [dados, setDados]         = useState({});
  const [loading, setLoading]     = useState(true);
  const [visivel, setVisivel]     = useState(false);
  const [hoveredCard, setHovered] = useState(null);

  useEffect(() => {
    if (!ministerioId || !mes) { setLoading(false); return; }

    const pessoas = pessoasPorMinisterio[ministerioId] || [];
    if (pessoas.length === 0) { setLoading(false); return; }

    const pessoasLower = new Set(pessoas.map(p => p.toLowerCase()));
    const [ano, mesNum] = mes.split("-");
    const inicio = `${ano}-${mesNum}-01`;
    const fim    = `${ano}-${mesNum}-${new Date(ano, mesNum, 0).getDate()}`;

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

          const nome = d.pessoaNome.toUpperCase();
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
  if (loading || pessoas.length === 0) return null;

  return (
    <div style={{ marginTop: "24px" }}>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: visivel ? "12px" : "0",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke={t.textMuted} strokeWidth="1.8"/>
            <path d="M12 8v4M12 16h.01" stroke={t.textMuted} strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span style={{
            fontSize: "10px", fontWeight: 600, color: t.textMuted,
            textTransform: "uppercase", letterSpacing: "0.7px",
            fontFamily: "'Outfit', sans-serif",
          }}>
            Membros escalados em outros ministérios este mês
          </span>
          <span style={{
            fontSize: "10px", fontWeight: 700, color: t.accent,
            background: t.accentDim, borderRadius: "10px", padding: "1px 7px",
          }}>
            {pessoas.length}
          </span>
        </div>

        <button
          onClick={() => setVisivel(v => !v)}
          title={visivel ? "Ocultar" : "Mostrar"}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: visivel ? t.accent : t.textMuted,
            padding: "3px", display: "flex", alignItems: "center",
            transition: "color 0.15s", flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.color = t.accent}
          onMouseLeave={e => e.currentTarget.style.color = visivel ? t.accent : t.textMuted}
        >
          {visivel ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/>
            </svg>
          )}
        </button>
      </div>

      {/* Cards grid */}
      <div style={{
        overflow: "hidden",
        maxHeight: visivel ? "9999px" : "0",
        opacity: visivel ? 1 : 0,
        transition: "max-height 0.3s ease, opacity 0.2s ease",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
          gap: "10px",
          alignItems: "start",
          paddingTop: "4px", /* evita corte da borda/sombra no topo pelo overflow:hidden pai */
        }}>
          {pessoas.map(nome => {
            const grupos = dados[nome];
            const ministeriosIds = Object.keys(grupos);
            const totalEscalas = ministeriosIds.reduce((acc, mid) => acc + grupos[mid].length, 0);

            // Cor dominante para o hover (primeiro ministério)
            const cfgPrimary = MINISTERIOS[ministeriosIds[0]] || {
              color: t.accent,
              rgb: ACCENT_RGB.replace(/\s/g, ""),
              glow: accentAlpha(0.35),
              border: t.accent,
            };
            const isHovered = hoveredCard === nome;

            return (
              <div
                key={nome}
                onMouseEnter={() => setHovered(nome)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  borderRadius: "8px",
                  border: `1px solid ${isHovered ? cfgPrimary.color : cfgPrimary.border}`,
                  background: t.surface,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  alignSelf: "start",
                  width: "100%",
                  minHeight: 0,
                  transition: "border-color 0.2s, box-shadow 0.2s, transform 0.15s",
                  transform: isHovered ? "translateY(-2px)" : "translateY(0)",
                  boxShadow: isHovered
                    ? `0 6px 20px ${cfgPrimary.glow}`
                    : "none",
                  cursor: "default",
                }}
              >
                {/* Card header */}
                <div style={{
                  padding: "10px 14px",
                  borderBottom: `1px solid ${t.border}`,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  flexShrink: 0,
                }}>
                  <span style={{
                    fontSize: "13px", fontWeight: 700, color: t.text,
                    letterSpacing: "0.3px", fontFamily: "'Outfit', sans-serif",
                  }}>
                    {nome}
                  </span>
                  {/* Badge com contraste melhorado */}
                  <span style={{
                    fontSize: "10px", fontWeight: 700,
                    color: cfgPrimary.color,
                    background: `rgba(${cfgPrimary.rgb}, 0.15)`,
                    borderRadius: "10px", padding: "2px 8px",
                    border: `1px solid ${cfgPrimary.border || t.border}`,
                    flexShrink: 0,
                  }}>
                    {totalEscalas} {totalEscalas === 1 ? "escala" : "escalas"}
                  </span>
                </div>

                {/* Ministry groups — altura só pelo conteúdo (sem flex-grow) */}
                <div style={{
                  padding: "10px 14px",
                  display: "flex", flexDirection: "column", gap: "12px",
                  flexShrink: 0,
                }}>
                  {ministeriosIds.map(mid => {
                    const cfg = MINISTERIOS[mid] || {
                      label: mid.toUpperCase(), color: t.accent,
                      bg: t.accentDim, border: t.border, glow: t.accentDim,
                    };
                    return (
                      <div key={mid}>
                        {/* Ministry badge */}
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

                        {/* Dates list */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                          {grupos[mid].map((item, i) => (
                            <div key={i} style={{ paddingLeft: "4px" }}>
                              {/* Data em negrito — linha própria */}
                              <div style={{
                                fontSize: "12px", color: t.text,
                                fontWeight: 700, fontFamily: "'Outfit', sans-serif",
                                lineHeight: "1.4",
                              }}>
                                {formatarData(item.data, item.turno)}
                              </div>
                              {/* Função abaixo, menor e muted */}
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
    </div>
  );
}
