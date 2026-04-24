// ===== src/components/GridLouvor.jsx =====
import { formatarData } from "../utils/dateHelper";

export default function GridLouvor({ escalas, datas, loading, onRemover, podeEditar, theme: t }) {
  const funcoes = ["MINISTRANTE", "BVOCAL 1", "BVOCAL 2", "BVOCAL 3", "BVOCAL 4", "MÚSICO 1", "MÚSICO 2", "MÚSICO 3", "MÚSICO 4", "MESA DE SOM"];

  if (loading && Object.keys(escalas).length === 0 && datas.length === 0)
    return <div style={{ padding: "60px", textAlign: "center", color: t.textMuted, fontSize: "14px" }}>Carregando escala...</div>;

  return (
    <div style={{ overflowX: "auto", borderRadius: "8px", border: `1px solid ${t.border}` }}>
      <table style={{ width: "100%", minWidth: "900px", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ background: t.surface, borderBottom: `1px solid ${t.border}` }}>
            <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: t.textMuted, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.6px", minWidth: "160px" }}>Data</th>
            {funcoes.map(f => (
              <th key={f} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: t.textMuted, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.6px", minWidth: "130px" }}>{f}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {datas.map((dataObj, idx) => {
            const turnoKey = dataObj.turno ?? "único";
            return (
              <tr key={idx} style={{ borderBottom: `1px solid ${t.border}`, background: idx % 2 === 0 ? t.bg : t.surface }}>
                <td style={{ padding: "12px 16px", fontWeight: 500, color: t.textMuted, fontSize: "12px", fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap" }}>
                  {formatarData(dataObj.data, dataObj.turno)}
                </td>
                {funcoes.map(f => {
                  const pessoa = escalas[`${dataObj.data}-${turnoKey}-${f}`];
                  return (
                    <td key={f} style={{ padding: "10px 16px" }}>
                      {pessoa ? (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: t.accentGlow, border: `1px solid ${t.accentDim}`, borderRadius: "5px", padding: "4px 10px" }}>
                          <span style={{ color: t.accent, fontWeight: 500, fontSize: "13px" }}>
                            {pessoa.toUpperCase()}
                          </span>
                          {podeEditar && (
                            <button onClick={() => onRemover(dataObj.data, turnoKey, f)} title="Remover" style={{ background: "none", border: "none", cursor: "pointer", color: t.textDim, fontSize: "11px", padding: 0, lineHeight: 1, display: "flex", alignItems: "center" }}
                              onMouseEnter={e => e.target.style.color = t.danger}
                              onMouseLeave={e => e.target.style.color = t.textDim}
                            >✕</button>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: t.textDim, fontSize: "12px" }}>—</span>
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