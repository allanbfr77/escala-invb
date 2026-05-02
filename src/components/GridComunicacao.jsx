// ===== src/components/GridComunicacao.jsx =====
import { useState } from "react";
import { formatarData } from "../utils/dateHelper";

const FUNCAO_CORES = {
  "PROJEÇÃO":    "#60a5fa",
  "MESA DE SOM": "#34d399",
  "TRANSMISSÃO": "#f59e0b",
};

const thStyle = (t, f) => ({
  padding: "9px 14px", textAlign: "left", fontWeight: 600,
  color: FUNCAO_CORES[f] || t.textMuted, fontSize: "10px", textTransform: "uppercase",
  letterSpacing: "0.8px", whiteSpace: "nowrap", fontFamily: "'Outfit', sans-serif",
});

export default function GridComunicacao({ escalas, datas, loading, onRemover, podeEditar, filtroNome = "", theme: t }) {
  const funcoes = ["PROJEÇÃO", "MESA DE SOM", "TRANSMISSÃO"];
  const [hoveredChip, setHoveredChip] = useState(null);
  const [expandidos, setExpandidos] = useState(new Set());

  if (loading && Object.keys(escalas).length === 0 && datas.length === 0)
    return <div style={{ padding: "48px", textAlign: "center", color: t.textMuted, fontSize: "13px", fontFamily: "'Outfit', sans-serif" }}>Carregando escala...</div>;

  if (!datas || datas.length === 0)
    return <div style={{ padding: "48px", textAlign: "center", color: t.textMuted, fontSize: "13px", fontFamily: "'Outfit', sans-serif" }}>Nenhuma data disponível para este mês</div>;

  const filtro = filtroNome.trim().toLowerCase();

  const toggleExpandido = (rowKey) => {
    setExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };

  return (
    <div style={{
      overflowX: "auto", borderRadius: "10px",
      border: `1px solid ${t.accentBorder}`,
      background: t.surfaceTranslucent,
      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
    }}>
      <table className="grid-table" style={{ width: "auto", minWidth: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead className="grid-thead">
          <tr style={{ borderBottom: `1px solid ${t.border}` }}>
            <th style={{ ...thStyle(t), borderRight: `1px solid ${t.border}` }}>Data</th>
            {funcoes.map(f => <th key={f} style={thStyle(t, f)}>{f}</th>)}
          </tr>
        </thead>
        <tbody>
          {datas.map((dataObj, idx) => {
            const turnoKey = dataObj.turno ?? "único";
            const rowKey = `${dataObj.data}-${turnoKey}`;
            const expandido = expandidos.has(rowKey);
            const temVazio = funcoes.some(f => !escalas[`${dataObj.data}-${turnoKey}-${f}`]);
            const temPreenchido = funcoes.some(f => !!escalas[`${dataObj.data}-${turnoKey}-${f}`]);
            return (
              <tr key={idx} className={`grid-row${expandido ? " expandido" : ""}`} style={{ background: idx % 2 === 0 ? "transparent" : t.accentZebra, transition: "background 0.15s", height: "38px" }}>
                <td className="grid-date-cell" data-label="Data" style={{ padding: "0 14px", fontWeight: 500, color: t.textMuted, fontSize: "11px", fontFamily: "'Outfit', sans-serif", whiteSpace: "nowrap", borderRight: `1px solid ${t.border}`, verticalAlign: "middle" }}>
                  {formatarData(dataObj.data, dataObj.turno, dataObj.descricao)}
                </td>
                {funcoes.map(f => {
                  const chipKey = `${dataObj.data}-${turnoKey}-${f}`;
                  const pessoa  = escalas[chipKey];
                  const match   = filtro && pessoa && pessoa.toLowerCase().includes(filtro);
                  const dim     = filtro && pessoa && !match;
                  const hovered = hoveredChip === chipKey;
                  const isDisponivel = pessoa === "disponível";
                  return (
                    <td key={f} data-label={f} className={!pessoa ? "slot-vazio" : ""} style={{ padding: "0 14px", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                      {pessoa ? (
                        <div
                          onMouseEnter={() => setHoveredChip(chipKey)}
                          onMouseLeave={() => setHoveredChip(null)}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: "4px",
                            borderRadius: "5px", padding: "2px 6px",
                            opacity: dim ? 0.3 : 1,
                            background: match
                              ? t.accentSelectedBg
                              : hovered ? t.accentHoverBg : "transparent",
                            transition: "background 0.15s",
                            cursor: "default",
                          }}
                        >
                          <span style={{
                            color: isDisponivel ? t.slotAvailable : match ? t.accent : t.text,
                            fontWeight: match ? 700 : 500,
                            fontSize: "12px", fontFamily: "'Outfit', sans-serif",
                            letterSpacing: "0.2px",
                          }}>
                            {pessoa.toUpperCase()}
                          </span>
                          {podeEditar && (
                            <button
                              className="chip-remove-btn"
                              onClick={() => onRemover(dataObj.data, turnoKey, f)}
                              title="Remover"
                              style={{
                                background: "none", border: "none", cursor: "pointer",
                                color: t.textMuted, fontSize: "9px", padding: "0 1px",
                                lineHeight: 1, display: "flex", alignItems: "center",
                                opacity: hovered ? 1 : 0,
                                pointerEvents: hovered ? "auto" : "none",
                                transition: "opacity 0.15s, color 0.1s",
                                width: "12px", flexShrink: 0,
                              }}
                              onMouseEnter={e => e.currentTarget.style.color = t.danger}
                              onMouseLeave={e => e.currentTarget.style.color = t.textMuted}
                            >✕</button>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: t.textDim, fontSize: "11px", opacity: dim ? 0.3 : 1 }}>—</span>
                      )}
                    </td>
                  );
                })}
                {!temPreenchido && (
                  <td className="sem-escala-placeholder" colSpan={funcoes.length + 1}>
                    <span style={{ fontSize: "11px", color: "#6b7280", fontStyle: "italic", fontFamily: "'Outfit', sans-serif" }}>
                      Nenhum membro escalado
                    </span>
                  </td>
                )}
                {temVazio && (
                  <td className="btn-expandir-td" colSpan={funcoes.length + 1}>
                    <button
                      className="btn-expandir-card"
                      onClick={() => toggleExpandido(rowKey)}
                    >
                      {expandido ? "▲ Recolher" : "+ Mostrar mais funções"}
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
