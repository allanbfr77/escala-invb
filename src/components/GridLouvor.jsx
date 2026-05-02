// ===== src/components/GridLouvor.jsx =====
import { useState } from "react";
import { formatarData } from "../utils/dateHelper";

const FUNCAO_CORES = {
  "MINISTRANTE": "#60a5fa",  // azul
  "BVOCAL 1":    "#34d399",  // verde
  "BVOCAL 2":    "#34d399",
  "BVOCAL 3":    "#34d399",
  "BVOCAL 4":    "#34d399",
  "MÚSICO 1":    "#f59e0b",  // dourado
  "MÚSICO 2":    "#f59e0b",
  "MÚSICO 3":    "#f59e0b",
  "MÚSICO 4":    "#f59e0b",
};

/** DATA precisa caber "DOMINGO, 03/05 (MANHÃ)" sem quebrar mesmo em 1280px */
const DATA_COL_PCT = 17;
/** MINISTRANTE tem nomes médios */
const MINISTRANTE_COL_PCT = 13;
const OUTRAS_FUNCOES_COL_PCT = (100 - DATA_COL_PCT - MINISTRANTE_COL_PCT) / 7;

/** Evita quebra no espaço entre nome e sobrenome (ex.: LU | FERNANDES). */
function nomeLouvorParaExibicao(pessoaNome) {
  if (!pessoaNome) return "";
  return pessoaNome.toUpperCase().replace(/\s+/g, "\u00A0");
}

const thStyle = (t, f) => ({
  padding: "7px 5px",
  textAlign: "left",
  fontWeight: 600,
  color: FUNCAO_CORES[f] || t.textMuted,
  fontSize: "clamp(8px, 1.05vw, 10px)",
  textTransform: "uppercase",
  letterSpacing: "0.45px",
  whiteSpace: f === "MINISTRANTE" ? "nowrap" : "normal",
  wordBreak: "break-word",
  lineHeight: 1.2,
  fontFamily: "'Outfit', sans-serif",
  verticalAlign: "bottom",
});

export default function GridLouvor({ escalas, datas, loading, onRemover, podeEditar, filtroNome = "", theme: t }) {
  const funcoes = ["MINISTRANTE", "BVOCAL 1", "BVOCAL 2", "BVOCAL 3", "BVOCAL 4", "MÚSICO 1", "MÚSICO 2", "MÚSICO 3", "MÚSICO 4"];
  const [hoveredChip, setHoveredChip] = useState(null);
  const [expandidos, setExpandidos] = useState(new Set());

  const toggleExpandido = (rowKey) => {
    setExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };

  if (loading && Object.keys(escalas).length === 0 && datas.length === 0)
    return <div style={{ padding: "48px", textAlign: "center", color: t.textMuted, fontSize: "13px", fontFamily: "'Outfit', sans-serif" }}>Carregando escala...</div>;

  if (!datas || datas.length === 0)
    return <div style={{ padding: "48px", textAlign: "center", color: t.textMuted, fontSize: "13px", fontFamily: "'Outfit', sans-serif" }}>Nenhuma data disponível para este mês</div>;

  const filtro = filtroNome.trim().toLowerCase();

  const fsCell = "clamp(10px, 1.15vw, 12px)";

  return (
    <div className="grid-louvor-wrap" style={{
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      overflowX: "hidden",
      borderRadius: "10px",
      border: `1px solid ${t.accentBorder}`,
      background: t.surfaceTranslucent,
      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      boxSizing: "border-box",
    }}>
      <table
        className="grid-table"
        style={{
          width: "100%",
          maxWidth: "100%",
          tableLayout: "fixed",
          borderCollapse: "collapse",
          fontSize: "clamp(10px, 1.2vw, 13px)",
        }}
      >
        <colgroup>
          <col style={{ width: `${DATA_COL_PCT}%` }} />
          <col style={{ width: `${MINISTRANTE_COL_PCT}%` }} />
          {funcoes.slice(1).map(f => (
            <col key={f} style={{ width: `${OUTRAS_FUNCOES_COL_PCT}%` }} />
          ))}
        </colgroup>
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
            const dataStr = formatarData(dataObj.data, dataObj.turno, dataObj.descricao);
            return (
              <tr key={idx} className={`grid-row${expandido ? " expandido" : ""}`} style={{ background: idx % 2 === 0 ? "transparent" : t.accentZebra, transition: "background 0.15s" }}>
                <td
                  className="grid-date-cell"
                  title={dataStr}
                  data-label="Data"
                  style={{
                    padding: "6px 5px",
                    fontWeight: 500,
                    color: t.textMuted,
                    fontSize: "clamp(9px, 1vw, 11px)",
                    fontFamily: "'Outfit', sans-serif",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    lineHeight: 1.25,
                    borderRight: `1px solid ${t.border}`,
                    verticalAlign: "middle",
                  }}
                >
                  <span className="grid-louvor-date-text">{dataStr}</span>
                </td>
                {funcoes.map(f => {
                  const chipKey = `${dataObj.data}-${turnoKey}-${f}`;
                  const pessoa  = escalas[chipKey];
                  const match   = filtro && pessoa && pessoa.toLowerCase().includes(filtro);
                  const dim     = filtro && pessoa && !match;
                  const hovered = hoveredChip === chipKey;
                  const isDisponivel = pessoa === "disponível";
                  const nomeTitulo = pessoa ? pessoa.toUpperCase() : "";
                  const nomeExibir = nomeLouvorParaExibicao(pessoa);
                  return (
                    <td
                      key={f}
                      data-label={f}
                      className={!pessoa ? "slot-vazio" : ""}
                      style={{
                        padding: "4px 5px",
                        verticalAlign: "middle",
                        overflow: "hidden",
                      }}
                    >
                      {pessoa ? (
                        <div
                          className="grid-louvor-chip"
                          onMouseEnter={() => setHoveredChip(chipKey)}
                          onMouseLeave={() => setHoveredChip(null)}
                          title={nomeTitulo}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            minWidth: 0,
                            width: "100%",
                            maxWidth: "100%",
                            borderRadius: "5px",
                            padding: "2px 4px",
                            opacity: dim ? 0.3 : 1,
                            background: match
                              ? t.accentSelectedBg
                              : hovered ? t.accentHoverBg : "transparent",
                            transition: "background 0.15s",
                            cursor: "default",
                            boxSizing: "border-box",
                          }}
                        >
                          <span title={nomeTitulo} style={{
                            flex: 1,
                            minWidth: 0,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            lineHeight: 1.25,
                            color: isDisponivel ? t.slotAvailable : match ? t.accent : t.text,
                            fontWeight: match ? 700 : 500,
                            fontSize: fsCell,
                            fontFamily: "'Outfit', sans-serif",
                            letterSpacing: "0.2px",
                          }}>
                            {nomeExibir}
                          </span>
                          {podeEditar && (
                            <button
                              className="chip-remove-btn"
                              onClick={() => onRemover(dataObj.data, turnoKey, f)}
                              title="Remover"
                              style={{
                                background: "none", border: "none", cursor: "pointer",
                                color: t.textMuted, fontSize: "9px", padding: "2px 1px 0 0",
                                lineHeight: 1, display: "flex", alignItems: "flex-start",
                                opacity: hovered ? 1 : 0,
                                pointerEvents: hovered ? "auto" : "none",
                                transition: "opacity 0.15s, color 0.1s",
                                width: "12px", flexShrink: 0,
                              }}
                              onMouseEnter={e => { e.currentTarget.style.color = t.danger; }}
                              onMouseLeave={e => { e.currentTarget.style.color = t.textMuted; }}
                            >✕</button>
                          )}
                        </div>
                      ) : (
                        <span className="grid-louvor-empty-slot" style={{ color: t.textDim, fontSize: "11px", opacity: dim ? 0.3 : 1 }}>—</span>
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
