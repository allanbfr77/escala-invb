// ===== src/components/CrossMinistryInfo.jsx =====
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { pessoasPorMinisterio } from "../data/pessoas";
import { formatarData } from "../utils/dateHelper";

const NOMES_MINISTERIOS = {
  comunicacao: "COMUNICAÇÕES",
  louvor: "LOUVOR",
  recepcao: "RECEPÇÃO",
  infantil: "INFANTIL",
};

export default function CrossMinistryInfo({ ministerioId, mes, theme: t }) {
  const [dados, setDados]     = useState({});
  const [loading, setLoading] = useState(true);
  const [visivel, setVisivel] = useState(true);   // toggle eye

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
          if (!agrupado[nome]) agrupado[nome] = [];
          agrupado[nome].push({
            data: d.data,
            turno: d.turno,
            funcao: d.funcao,
            ministerioId: d.ministerioId,
          });
        });

        Object.keys(agrupado).forEach(nome => {
          agrupado[nome].sort((a, b) => a.data.localeCompare(b.data));
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

      {/* Header row with toggle */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: visivel ? "10px" : "0",
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
            background: t.accentDim, borderRadius: "10px",
            padding: "1px 7px",
          }}>
            {pessoas.length}
          </span>
        </div>

        {/* Eye toggle button */}
        <button
          onClick={() => setVisivel(v => !v)}
          title={visivel ? "Ocultar" : "Mostrar"}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: visivel ? t.accent : t.textMuted,
            padding: "3px", display: "flex", alignItems: "center",
            transition: "color 0.15s",
            flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.color = t.accent}
          onMouseLeave={e => e.currentTarget.style.color = visivel ? t.accent : t.textMuted}
        >
          {visivel ? (
            /* Eye open */
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          ) : (
            /* Eye closed */
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/>
            </svg>
          )}
        </button>
      </div>

      {/* Collapsible list */}
      <div style={{
        overflow: "hidden",
        maxHeight: visivel ? "9999px" : "0",
        opacity: visivel ? 1 : 0,
        transition: "max-height 0.3s ease, opacity 0.2s ease",
      }}>
        <div style={{
          borderRadius: "10px",
          border: `1px solid ${t.border}`,
          background: "rgba(7,7,14,0.45)",
          overflow: "hidden",
        }}>
          {pessoas.map((nome, pessoaIdx) => (
            <div
              key={nome}
              style={{
                display: "flex", alignItems: "flex-start",
                gap: "14px", padding: "9px 14px",
                borderBottom: pessoaIdx < pessoas.length - 1 ? `1px solid ${t.border}` : "none",
                flexWrap: "wrap",
              }}
            >
              <span style={{
                fontSize: "12px", fontWeight: 600, color: t.text,
                fontFamily: "'Outfit', sans-serif",
                minWidth: "120px", paddingTop: "2px", flexShrink: 0,
              }}>
                {nome}
              </span>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                {dados[nome].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "4px",
                      padding: "2px 8px", borderRadius: "4px",
                      background: "rgba(210,153,34,0.07)",
                      border: "1px solid rgba(210,153,34,0.22)",
                    }}
                  >
                    <span style={{ fontSize: "11px", color: "#d2993a", fontWeight: 500 }}>
                      {formatarData(item.data, item.turno)}
                    </span>
                    <span style={{ color: "rgba(210,153,34,0.35)", fontSize: "9px" }}>·</span>
                    <span style={{
                      fontSize: "10px", color: "#d2993a", fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.3px",
                    }}>
                      {NOMES_MINISTERIOS[item.ministerioId] || item.ministerioId}
                    </span>
                    {item.funcao && (
                      <>
                        <span style={{ color: "rgba(210,153,34,0.35)", fontSize: "9px" }}>·</span>
                        <span style={{ fontSize: "10px", color: "rgba(210,153,34,0.65)" }}>
                          {item.funcao}
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
