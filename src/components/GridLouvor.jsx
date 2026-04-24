// ===== src/components/GridLouvor.jsx =====
import { formatarData } from "../utils/dateHelper";

const thStyle = (t) => ({
  padding: "9px 14px", textAlign: "left", fontWeight: 600,
  color: t.textMuted, fontSize: "10px", textTransform: "uppercase",
  letterSpacing: "0.8px", whiteSpace: "nowrap", fontFamily: "'Outfit', sans-serif",
});

export default function GridLouvor({ escalas, datas, loading, onRemover, podeEditar, theme: t }) {
  const funcoes = ["MINISTRANTE", "BVOCAL 1", "BVOCAL 2", "BVOCAL 3", "BVOCAL 4", "MÚSICO 1", "MÚSICO 2", "MÚSICO 3", "MÚSICO 4", "MESA DE SOM"];

  if (loading && Object.keys(escalas).length === 0 && datas.length === 0)
    return <div style={{ padding: "48px", textAlign: "center", color: t.textMuted, fontSize: "13px", fontFamily: "'Outfit', sans-serif" }}>Carregando escala...</div>;

  return (
    <div style={{
      overflowX: "auto", borderRadius: "10px",
      border: `1px solid rgba(167,139,250,0.12)`,
      background: "rgba(7,7,14,0.6)",
      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
    }}>
      <table className="grid-table" style={{ width: "auto", minWidth: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead className="grid-thead">
          <tr style={{ borderBottom: `1px solid ${t.border}` }}>
            <th style={{ ...thStyle(t), borderRight: `1px solid ${t.border}` }}>Data</th>
            {funcoes.map(f => <th key={f} style={thStyle(t)}>{f}</th>)}
          </tr>
        </thead>
        <tbody>
          {datas.map((dataObj, idx) => {
            const turnoKey = dataObj.turno ?? "único";
            return (
              <tr key={idx} className="grid-row" style={{ borderBottom: `1px solid ${t.border}`, background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)", transition: "background 0.15s" }}>
                <td className="grid-date-cell" data-label="Data" style={{ padding: "7px 14px", fontWeight: 500, color: t.textMuted, fontSize: "11px", fontFamily: "'Outfit', sans-serif", whiteSpace: "nowrap", borderRight: `1px solid ${t.border}` }}>
                  {formatarData(dataObj.data, dataObj.turno)}
                </td>
                {funcoes.map(f => {
                  const pessoa = escalas[`${dataObj.data}-${turnoKey}-${f}`];
                  return (
                    <td key={f} data-label={f} style={{ padding: "6px 14px", whiteSpace: "nowrap" }}>
                      {pessoa ? (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: t.accentGlow, border: `1px solid ${t.accentDim}`, borderRadius: "5px", padding: "3px 9px" }}>
                          <span style={{ color: t.accent, fontWeight: 500, fontSize: "12px", fontFamily: "'Outfit', sans-serif", letterSpacing: "0.3px" }}>
                            {pessoa.toUpperCase()}
                          </span>
                          {podeEditar && (
                            <button onClick={() => onRemover(dataObj.data, turnoKey, f)} title="Remover"
                              style={{ background: "none", border: "none", cursor: "pointer", color: t.textDim, fontSize: "10px", padding: 0, lineHeight: 1, display: "flex", alignItems: "center" }}
                              onMouseEnter={e => e.target.style.color = t.danger}
                              onMouseLeave={e => e.target.style.color = t.textDim}
                            >✕</button>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: t.textDim, fontSize: "11px" }}>—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
