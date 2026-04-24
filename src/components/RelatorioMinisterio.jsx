// ===== src/components/RelatorioMinisterio.jsx =====
import { formatarData } from "../utils/dateHelper";
import { pessoasPorMinisterio } from "../data/pessoas";

export default function RelatorioMinisterio({ escalas, datas, funcoes, ministerioId, theme: t, onVoltar }) {

  // ── Monta mapa pessoa → slots escalados ──────────────────────────────────
  const porPessoa = {};

  // Inicializa todas as pessoas do ministério (mesmo sem escala)
  const todasPessoas = pessoasPorMinisterio[ministerioId] || [];
  todasPessoas.forEach(p => { porPessoa[p.toLowerCase()] = []; });

  datas.forEach(dataObj => {
    const turnoKey = dataObj.turno ?? "único";
    funcoes.forEach(f => {
      const pessoa = escalas[`${dataObj.data}-${turnoKey}-${f}`];
      if (pessoa) {
        if (!porPessoa[pessoa]) porPessoa[pessoa] = [];
        porPessoa[pessoa].push({ ...dataObj, funcao: f });
      }
    });
  });

  // ── Mapa de posição para detectar turnos seguidos ─────────────────────────
  // datas já vem ordenado: dom-manhã, dom-noite, qua, dom-manhã, dom-noite, qua...
  const posicao = {};
  datas.forEach((d, i) => { posicao[d.id] = i; });

  // ── Monta relatório por pessoa ────────────────────────────────────────────
  const relatorio = Object.entries(porPessoa).map(([pessoa, slots]) => {
    // Contagem por função
    const porFuncao = {};
    funcoes.forEach(f => { porFuncao[f] = 0; });
    slots.forEach(s => { porFuncao[s.funcao] = (porFuncao[s.funcao] || 0) + 1; });

    // Detecta turnos seguidos (posição consecutiva no array de datas)
    const slotsSorted = [...slots].sort((a, b) => posicao[a.id] - posicao[b.id]);
    const consecutivas = [];
    for (let i = 0; i < slotsSorted.length - 1; i++) {
      const posA = posicao[slotsSorted[i].id];
      const posB = posicao[slotsSorted[i + 1].id];
      if (posB - posA === 1) {
        consecutivas.push([slotsSorted[i], slotsSorted[i + 1]]);
      }
    }

    return { pessoa, total: slots.length, porFuncao, consecutivas };
  });

  // Ordena: mais escalados primeiro, depois alfabético
  relatorio.sort((a, b) => b.total - a.total || a.pessoa.localeCompare(b.pessoa));

  const escalados = relatorio.filter(r => r.total > 0);
  const semEscala = relatorio.filter(r => r.total === 0);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <button
          onClick={onVoltar}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "transparent", border: `1px solid ${t.border}`,
            borderRadius: "6px", padding: "6px 12px",
            color: t.textMuted, fontSize: "13px", fontWeight: 500,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Voltar para escala
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: t.text }}>
            Relatório do mês
          </h2>
          <p style={{ margin: 0, fontSize: "12px", color: t.textMuted }}>
            {escalados.length} pessoa{escalados.length !== 1 ? "s" : ""} escalada{escalados.length !== 1 ? "s" : ""} · {datas.length} slot{datas.length !== 1 ? "s" : ""} no mês
          </p>
        </div>
      </div>

      {/* Cards das pessoas escaladas */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {escalados.map(({ pessoa, total, porFuncao, consecutivas }) => (
          <div
            key={pessoa}
            style={{
              borderRadius: "8px", border: `1px solid ${t.border}`,
              background: t.surface, overflow: "hidden",
            }}
          >
            {/* Cabeçalho do card */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: `1px solid ${t.border}`,
            }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: t.text, letterSpacing: "0.2px" }}>
                {pessoa.toUpperCase()}
              </span>
              <span style={{
                background: t.accentDim || "rgba(99,102,241,0.12)",
                color: t.accent, borderRadius: "20px",
                padding: "2px 10px", fontSize: "12px", fontWeight: 700,
              }}>
                {total} {total === 1 ? "escala" : "escalas"}
              </span>
            </div>

            {/* Funções */}
            <div style={{ padding: "10px 16px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {funcoes.map(f => {
                const count = porFuncao[f];
                if (!count) return null;
                return (
                  <span key={f} style={{
                    fontSize: "11px", fontWeight: 600,
                    background: t.bg, border: `1px solid ${t.border}`,
                    borderRadius: "4px", padding: "3px 8px",
                    color: t.textMuted, letterSpacing: "0.3px",
                  }}>
                    {f} <span style={{ color: t.accent }}>×{count}</span>
                  </span>
                );
              })}
            </div>

            {/* Alerta de turnos seguidos */}
            {consecutivas.length > 0 && (
              <div style={{
                margin: "0 16px 12px",
                borderRadius: "6px",
                background: "rgba(210,153,58,0.08)",
                border: "1px solid rgba(210,153,58,0.3)",
                padding: "8px 12px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M12 9V14M12 17.5V18M12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12C21 16.97 16.97 21 12 21Z"
                      stroke="#d2993a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#d2993a", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    Turnos seguidos
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  {consecutivas.map(([a, b], i) => (
                    <span key={i} style={{ fontSize: "12px", color: "#d2993a", fontWeight: 500 }}>
                      {formatarData(a.data, a.turno)} → {formatarData(b.data, b.turno)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pessoas sem escala */}
      {semEscala.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <p style={{
            fontSize: "11px", fontWeight: 600, color: t.textMuted,
            textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "8px",
          }}>
            Sem escala este mês
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {semEscala.map(({ pessoa }) => (
              <span key={pessoa} style={{
                fontSize: "12px", color: t.textDim,
                background: t.bg, border: `1px solid ${t.border}`,
                borderRadius: "4px", padding: "3px 10px",
              }}>
                {pessoa.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
