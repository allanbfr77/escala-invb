// ===== src/components/RelatorioMinisterio.jsx =====
import { useState, useMemo, useCallback } from "react";
import { AlertTriangle, ChevronDown, ArrowLeft, Calendar } from "lucide-react";
import BotaoVoltar from "./BotaoVoltar";
import { pessoasPorMinisterio } from "../data/pessoas";
import { nomeParaExibicao, pessoaNomeFirestore } from "../utils/nomeExibicao";
import { turnoSalvoEscala, chaveSlotEscala, parseChaveEscala, encontrarDataObjNasDatas } from "../utils/escalaDisponibilidade";
import { montarFaixasPlanilha } from "../utils/planilhaFaixasLayout";
import {
  funcaoParaAbrev,
  getCorAbrev,
  getTomAbrev,
  getTooltipAbrev,
} from "../utils/gridAbreviacoes";
import {
  agruparContagensPorFuncao,
  obterGrupoFuncaoExibicao,
} from "../utils/relatorioUnificado";

const ESTILO_TOM = {
  azul: {
    fg: "var(--abrev-badge-azul-fg)",
    bg: "var(--abrev-badge-azul-bg)",
  },
  verde: {
    fg: "var(--abrev-badge-verde-fg)",
    bg: "var(--abrev-badge-verde-bg)",
  },
  amarelo: {
    fg: "var(--abrev-badge-amarelo-fg)",
    bg: "var(--abrev-badge-amarelo-bg)",
  },
};

const ALERTA = {
  fg: "var(--danger)",
  bg: "var(--danger-dim)",
  border: "color-mix(in srgb, var(--danger) 30%, transparent)",
};

const FAIXA_TURNOS = {
  fg: ALERTA.fg,
  bg: ALERTA.bg,
};

const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const LIMITE_SEM_ESCALA = 8;

function formatarDataCompacta(dataStr) {
  const [ano, mes, dia] = dataStr.split("-");
  const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
  return `${DIAS_CURTOS[data.getDay()]} ${dia}/${mes}`;
}

function formatarPeriodoConsecutivo([inicio, fim]) {
  return `${formatarDataCompacta(inicio.data)}  →  ${formatarDataCompacta(fim.data)}`;
}

function rotuloTurnoPill(turno) {
  if (!turno || turno === "único") return null;
  return turno;
}

function rotuloFuncaoExibicao(ministerioId, funcao) {
  const abrev = funcaoParaAbrev(ministerioId, funcao);
  return getTooltipAbrev(ministerioId, abrev) || obterGrupoFuncaoExibicao(funcao);
}

function TextoFuncao({ ministerioId, funcao }) {
  const estilo = estiloTom(ministerioId, funcao);
  return (
    <span className="rel-mes-funcao-texto" style={{ color: estilo.fg }}>
      {rotuloFuncaoExibicao(ministerioId, funcao)}
    </span>
  );
}

function buildPosicaoPorFaixa(datas) {
  const map = new Map();
  const { faixas } = montarFaixasPlanilha(datas);
  for (const faixa of faixas) {
    faixa.colunas.forEach((dataObj, colIdx) => {
      if (dataObj) map.set(dataObj.id, { faixaId: faixa.id, colIdx });
    });
  }
  return map;
}

function calcularConsecutivas(slots, posicaoPorFaixa) {
  const porFaixa = {};
  for (const slot of slots) {
    const pos = posicaoPorFaixa.get(slot.id);
    if (!pos) continue;
    if (!porFaixa[pos.faixaId]) porFaixa[pos.faixaId] = [];
    porFaixa[pos.faixaId].push({ slot, colIdx: pos.colIdx });
  }

  const consecutivas = [];
  for (const grupo of Object.values(porFaixa)) {
    grupo.sort((a, b) => a.colIdx - b.colIdx);
    for (let i = 0; i < grupo.length - 1; i++) {
      if (grupo[i + 1].colIdx - grupo[i].colIdx === 1) {
        consecutivas.push([grupo[i].slot, grupo[i + 1].slot]);
      }
    }
  }
  return consecutivas;
}

function registrarSlot(porPessoa, vistos, pl, dataObj, funcao) {
  if (!pl || pl === "disponível" || !dataObj || !funcao) return;
  const turnoKey = turnoSalvoEscala(dataObj);
  const chave = `${pl}|${dataObj.data}|${turnoKey}|${funcao}`;
  if (vistos.has(chave)) return;
  vistos.add(chave);
  if (!porPessoa[pl]) porPessoa[pl] = [];
  porPessoa[pl].push({ ...dataObj, funcao });
}

function coletarSlotsPorPessoa(escalas, datas, funcoes, ministerioId, porPessoa) {
  const vistos = new Set();

  datas.forEach((dataObj) => {
    funcoes.forEach((f) => {
      const pessoa = escalas[chaveSlotEscala(dataObj, f)];
      if (!pessoa || pessoa === "disponível") return;
      registrarSlot(porPessoa, vistos, pessoaNomeFirestore(pessoa), dataObj, f);
    });
  });

  for (const [chave, pessoaValor] of Object.entries(escalas || {})) {
    if (!pessoaValor || pessoaValor === "disponível") continue;
    const parsed = parseChaveEscala(chave, ministerioId);
    if (!parsed || !funcoes.includes(parsed.funcao)) continue;
    const dataObj = encontrarDataObjNasDatas(datas, parsed.data, parsed.turno);
    if (!dataObj) continue;
    registrarSlot(porPessoa, vistos, pessoaNomeFirestore(pessoaValor), dataObj, parsed.funcao);
  }
}

function iniciaisObreiro(nome) {
  const partes = nomeParaExibicao(nome).split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2);
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

function estiloTom(ministerioId, funcao) {
  const abrev = funcaoParaAbrev(ministerioId, funcao);
  const tom = getTomAbrev(ministerioId, abrev);
  const cor = getCorAbrev(ministerioId, abrev);
  if (tom && ESTILO_TOM[tom]) return { tom, ...ESTILO_TOM[tom] };
  return {
    tom: null,
    fg: cor || "var(--text-muted)",
    bg: "var(--surface-hover)",
  };
}

function PainelTurnosSeguidos({ consecutivas }) {
  return (
    <div
      className="rel-mes-alerta-faixa"
      style={{ background: FAIXA_TURNOS.bg, color: FAIXA_TURNOS.fg }}
      role="region"
      aria-label="Detalhes dos turnos seguidos"
    >
      <div className="rel-mes-alerta-linha rel-mes-alerta-linha--cabecalho">
        <Calendar size={14} strokeWidth={2} aria-hidden className="rel-mes-alerta-icone" />
        <span className="rel-mes-alerta-rotulo">Turnos seguidos</span>
      </div>
      {consecutivas.map(([a, b], i) => {
        const turno = rotuloTurnoPill(a.turno) || rotuloTurnoPill(b.turno);
        return (
          <div key={i} className="rel-mes-alerta-linha">
            <span className="rel-mes-alerta-periodo">{formatarPeriodoConsecutivo([a, b])}</span>
            {turno && <span className="rel-mes-alerta-turno-pill">{turno}</span>}
          </div>
        );
      })}
    </div>
  );
}

function PainelEscalasDetalhe({ slots, ministerioId }) {
  const ordenados = [...slots].sort((a, b) => a.data.localeCompare(b.data));
  return (
    <div className="rel-mes-detalhe-faixa" role="region" aria-label="Datas escaladas no mês">
      <div className="rel-mes-detalhe-cabecalho">Datas escaladas</div>
      <ul className="rel-mes-detalhe-lista">
        {ordenados.map((slot) => (
          <li key={`${slot.id}-${slot.funcao}`} className="rel-mes-detalhe-item">
            <span className="rel-mes-detalhe-data">{formatarDataCompacta(slot.data)}</span>
            <TextoFuncao ministerioId={ministerioId} funcao={slot.funcao} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SecaoSemEscala({ pessoas }) {
  const [expandido, setExpandido] = useState(false);
  if (!pessoas.length) return null;

  const temMais = pessoas.length > LIMITE_SEM_ESCALA;
  const visiveis = !temMais || expandido ? pessoas : pessoas.slice(0, LIMITE_SEM_ESCALA);
  const restantes = pessoas.length - LIMITE_SEM_ESCALA;

  return (
    <section className="rel-mes-sem-escala-faixa" aria-label="Obreiros sem escala">
      <div className="rel-mes-sem-escala-cabecalho">
        <span className="rel-mes-sem-escala-rotulo">Sem escala este mês</span>
        <span className="rel-mes-sem-escala-contador" aria-label={`${pessoas.length} obreiros`}>
          · {pessoas.length}
        </span>
      </div>
      <div className="rel-mes-sem-escala-divisor" aria-hidden />
      <div className="rel-mes-sem-escala-nomes">
        {visiveis.map(({ pessoa }) => (
          <span key={pessoa} className="rel-mes-sem-escala-nome">
            {nomeParaExibicao(pessoa)}
          </span>
        ))}
      </div>
      {temMais && !expandido && (
        <button
          type="button"
          className="rel-mes-sem-escala-mais"
          onClick={() => setExpandido(true)}
          aria-expanded={false}
        >
          +{restantes} mais
        </button>
      )}
      {temMais && expandido && (
        <button
          type="button"
          className="rel-mes-sem-escala-mais"
          onClick={() => setExpandido(false)}
          aria-expanded
        >
          Ver menos
        </button>
      )}
    </section>
  );
}

function CardResumo({ label, valor, destaque, theme }) {
  const isAlerta = destaque === "alerta";
  return (
    <div
      className="rel-mes-card"
      style={{
        borderColor: isAlerta ? ALERTA.border : theme.border,
        background: isAlerta ? ALERTA.bg : theme.surface,
      }}
    >
      <span
        className="rel-mes-card__valor"
        style={{ color: isAlerta ? ALERTA.fg : theme.text }}
      >
        {valor}
      </span>
      <span
        className="rel-mes-card__label"
        style={{ color: isAlerta ? ALERTA.fg : theme.textMuted }}
      >
        {label}
      </span>
    </div>
  );
}

function LinhaObreiro({
  pessoa,
  total,
  slots,
  porFuncao,
  consecutivas,
  ministerioId,
  funcoes,
  theme,
  expandido,
  onToggle,
}) {
  const turmas = agruparContagensPorFuncao(funcoes, porFuncao);
  const temAlerta = consecutivas.length > 0;
  const podeExpandir = total > 0;
  const nome = nomeParaExibicao(pessoa);

  const handleToggle = useCallback(() => {
    if (podeExpandir) onToggle(pessoa);
  }, [podeExpandir, onToggle, pessoa]);

  const handleKeyDown = useCallback(
    (e) => {
      if (!podeExpandir) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onToggle(pessoa);
      }
    },
    [podeExpandir, onToggle, pessoa]
  );

  return (
    <>
      <tr
        className={`rel-mes-row${temAlerta ? " rel-mes-row--alerta" : ""}${podeExpandir ? " rel-mes-row--expansivel" : ""}${expandido ? " rel-mes-row--aberta" : ""}`}
        onClick={podeExpandir ? handleToggle : undefined}
        onKeyDown={podeExpandir ? handleKeyDown : undefined}
        role={podeExpandir ? "button" : undefined}
        tabIndex={podeExpandir ? 0 : undefined}
        aria-expanded={podeExpandir ? expandido : undefined}
        aria-label={
          podeExpandir
            ? `${nome}, ${total} escalas${temAlerta ? `, ${consecutivas.length} turno${consecutivas.length !== 1 ? "s" : ""} seguido${consecutivas.length !== 1 ? "s" : ""}` : ""}. Clique para ${expandido ? "recolher" : "expandir"}`
            : undefined
        }
      >
        <td className="rel-mes-cell rel-mes-cell--obreiro">
          <div className="rel-mes-obreiro">
            <span className="rel-mes-avatar" aria-hidden>
              {iniciaisObreiro(pessoa)}
            </span>
            <span className="rel-mes-nome" style={{ color: theme.text }}>
              {nome}
            </span>
          </div>
        </td>
        <td className="rel-mes-cell rel-mes-cell--turma">
          {turmas.length > 0 ? (
            <div className="rel-mes-turmas">
              {turmas.map(({ funcao: grupoFuncao, count }) => {
                const funcaoRef =
                  funcoes.find(
                    (f) => obterGrupoFuncaoExibicao(f) === grupoFuncao && porFuncao[f] > 0
                  ) || grupoFuncao;
                return (
                  <span key={grupoFuncao} className="rel-mes-turma-chip">
                    <TextoFuncao ministerioId={ministerioId} funcao={funcaoRef} />
                    {count > 1 && (
                      <span className="rel-mes-turma-count" style={{ color: theme.textMuted }}>
                        ×{count}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          ) : (
            <span className="rel-mes-turma-vazia" style={{ color: theme.textDim }}>
              —
            </span>
          )}
        </td>
        <td className="rel-mes-cell rel-mes-cell--escalas">
          <span className="rel-mes-escalas-num" style={{ color: theme.text }}>
            {total}
          </span>
        </td>
        <td className="rel-mes-cell rel-mes-cell--indicador">
          {podeExpandir ? (
            <span className="rel-mes-indicador">
              {temAlerta && (
                <AlertTriangle
                  size={15}
                  color={ALERTA.fg}
                  aria-label="Alerta de turnos seguidos"
                />
              )}
              <ChevronDown
                size={14}
                color={theme.textMuted}
                className={`rel-mes-chevron${expandido ? " rel-mes-chevron--aberto" : ""}`}
                aria-hidden
              />
            </span>
          ) : null}
        </td>
      </tr>

      {podeExpandir && expandido && (
        <tr className="rel-mes-expandida">
          <td colSpan={4}>
            <PainelEscalasDetalhe slots={slots} ministerioId={ministerioId} />
            {temAlerta && (
              <PainelTurnosSeguidos consecutivas={consecutivas} />
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function RelatorioMinisterio({
  escalas,
  datas,
  funcoes,
  ministerioId,
  theme: t,
  onVoltar,
}) {
  const [expandidos, setExpandidos] = useState(new Set());

  const toggleExpandido = useCallback((pessoa) => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(pessoa)) next.delete(pessoa);
      else next.add(pessoa);
      return next;
    });
  }, []);

  const porPessoa = {};
  const todasPessoas = pessoasPorMinisterio[ministerioId] || [];
  todasPessoas.forEach((p) => {
    const pl = pessoaNomeFirestore(p);
    if (pl && pl !== "disponível") porPessoa[pl] = [];
  });

  coletarSlotsPorPessoa(escalas, datas, funcoes, ministerioId, porPessoa);

  const posicaoPorFaixa = buildPosicaoPorFaixa(datas);

  const relatorio = Object.entries(porPessoa).map(([pessoa, slots]) => {
    const porFuncao = {};
    funcoes.forEach((f) => {
      porFuncao[f] = 0;
    });
    slots.forEach((s) => {
      porFuncao[s.funcao] = (porFuncao[s.funcao] || 0) + 1;
    });

    const consecutivas = calcularConsecutivas(slots, posicaoPorFaixa);

    return { pessoa, total: slots.length, slots, porFuncao, consecutivas };
  });

  relatorio.sort((a, b) => b.total - a.total || a.pessoa.localeCompare(b.pessoa));

  const escalados = relatorio.filter((r) => r.total > 0);
  const semEscala = relatorio.filter((r) => r.total === 0);

  const resumo = useMemo(() => {
    const totalEscalas = escalados.reduce((acc, r) => acc + r.total, 0);
    const turmas = new Set();
    escalados.forEach(({ porFuncao }) => {
      agruparContagensPorFuncao(funcoes, porFuncao).forEach((g) => turmas.add(g.funcao));
    });
    const alertas = escalados.filter((r) => r.consecutivas.length > 0).length;
    const obreirosTotal = (pessoasPorMinisterio[ministerioId] || []).filter((p) => {
      const pl = pessoaNomeFirestore(p);
      return pl && pl !== "disponível";
    }).length;
    return {
      totalEscalas,
      obreirosEscalados: escalados.length,
      obreirosTotal,
      turmas: turmas.size,
      alertas,
    };
  }, [escalados, funcoes, ministerioId]);

  const theme = {
    ...t,
    surfaceHover: t.surfaceHover || "var(--surface-hover)",
  };

  return (
    <div className="rel-mes">
      <style>{`
        .rel-mes {
          font-family: 'Outfit', sans-serif;
          max-width: 720px;
          margin: 0 auto;
          padding-bottom: 24px;
        }

        .rel-mes-header {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 20px;
          min-height: 40px;
        }

        .rel-mes-header-voltar {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
        }

        .rel-mes-titulo {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          font-family: 'Outfit', sans-serif;
          line-height: 1.4;
          text-align: center;
        }

        .rel-mes-voltar {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 6px 12px;
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          font-family: inherit;
          flex-shrink: 0;
          transition: border-color 0.15s, color 0.15s;
        }

        .rel-mes-voltar:hover {
          border-color: var(--border-light);
          color: var(--text);
        }

        .rel-mes-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }

        .rel-mes-card {
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 14px 12px;
          text-align: center;
        }

        .rel-mes-card__valor {
          display: block;
          font-size: 22px;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          line-height: 1.2;
        }

        .rel-mes-card__label {
          display: block;
          margin-top: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .rel-mes-table-wrap {
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
          background: var(--surface);
        }

        .rel-mes-table-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .rel-mes-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 420px;
          table-layout: fixed;
        }

        .rel-mes-col-obreiro {
          width: 26%;
        }

        .rel-mes-col-turma {
          width: auto;
        }

        .rel-mes-col-escalas {
          width: 84px;
        }

        .rel-mes-col-indicador {
          width: 64px;
        }

        .rel-mes-table thead th {
          padding: 10px 14px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          text-align: left;
          border-bottom: 1px solid var(--border);
          background: var(--bg);
        }

        .rel-mes-table thead th.rel-mes-th--escalas {
          text-align: center;
          padding-left: 12px;
          padding-right: 12px;
          border-left: 1px solid var(--border);
          background: var(--bg);
          color: var(--text-muted);
        }

        .rel-mes-cell--escalas {
          text-align: center;
          padding-left: 12px;
          padding-right: 12px;
          border-left: 1px solid var(--border);
          background: var(--surface);
        }

        .rel-mes-cell--turma {
          max-width: 0;
          width: 42%;
          overflow: hidden;
          padding-right: 12px;
        }

        .rel-mes-cell--obreiro {
          max-width: 0;
          overflow: hidden;
        }

        .rel-mes-table thead th.rel-mes-th--indicador,
        .rel-mes-cell--indicador {
          text-align: center;
          padding-left: 6px;
          padding-right: 14px;
        }

        .rel-mes-row {
          border-bottom: 1px solid var(--border);
          transition: background 0.12s ease;
        }

        .rel-mes-row:hover {
          background: var(--row-hover);
        }

        .rel-mes-row:last-child {
          border-bottom: none;
        }

        .rel-mes-row--alerta {
          cursor: pointer;
        }

        .rel-mes-row--expansivel {
          cursor: pointer;
        }

        .rel-mes-row--alerta:focus-visible,
        .rel-mes-row--expansivel:focus-visible {
          outline: 2px solid var(--accent-focus-ring);
          outline-offset: -2px;
        }

        .rel-mes-cell {
          padding: 10px 14px;
          vertical-align: middle;
        }

        .rel-mes-obreiro {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .rel-mes-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
          font-family: 'JetBrains Mono', monospace;
          color: var(--text-muted);
          background: var(--surface-hover);
          border: 1px solid var(--border);
        }

        .rel-mes-nome {
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rel-mes-funcao-texto {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .rel-mes-turmas {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          row-gap: 4px;
          max-width: 100%;
          font-size: 11px;
          line-height: 1.45;
        }

        .rel-mes-turma-chip {
          display: inline-flex;
          align-items: baseline;
          gap: 0.15em;
          white-space: nowrap;
          flex-shrink: 0;
          max-width: 100%;
        }

        .rel-mes-turma-chip:not(:last-child)::after {
          content: ",";
          margin-left: 0.1em;
          margin-right: 0.55em;
          color: var(--text-muted);
          font-weight: 400;
        }

        .rel-mes-turma-count {
          font-size: 12px;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
        }

        .rel-mes-turma-vazia {
          font-size: 12px;
        }

        .rel-mes-escalas-num {
          display: inline-block;
          min-width: 1.5em;
          text-align: center;
          font-size: 14px;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
        }

        .rel-mes-indicador {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          min-width: 44px;
          min-height: 40px;
          padding: 8px 4px;
          margin-right: 2px;
          border-radius: 6px;
          pointer-events: none;
        }

        .rel-mes-chevron {
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }

        .rel-mes-chevron--aberto {
          transform: rotate(180deg);
        }

        .rel-mes-expandida td {
          padding: 0;
          border-bottom: 1px solid var(--border);
        }

        .rel-mes-alerta-faixa {
          padding: 9px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .rel-mes-alerta-linha {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 11px;
          line-height: 1.4;
          justify-content: flex-start;
        }

        .rel-mes-alerta-linha--cabecalho {
          margin-bottom: 2px;
        }

        .rel-mes-detalhe-faixa {
          padding: 10px 14px;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
        }

        .rel-mes-detalhe-cabecalho {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.35px;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .rel-mes-detalhe-lista {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .rel-mes-detalhe-item {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .rel-mes-detalhe-data {
          font-weight: 500;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: var(--text);
          min-width: 72px;
        }

        .rel-mes-alerta-icone {
          flex-shrink: 0;
          opacity: 0.9;
        }

        .rel-mes-alerta-rotulo {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.35px;
          flex-shrink: 0;
        }

        .rel-mes-alerta-periodo {
          font-weight: 500;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: -0.02em;
        }

        .rel-mes-alerta-turno-pill {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 10px;
          background: color-mix(in srgb, currentColor 12%, transparent);
          text-transform: uppercase;
          letter-spacing: 0.3px;
          flex-shrink: 0;
        }

        .rel-mes-sem-escala-faixa {
          margin-top: 16px;
          margin-bottom: 4px;
          display: flex;
          flex-wrap: nowrap;
          align-items: center;
          gap: 16px;
          padding: 12px 14px;
          border-radius: 8px;
          background: var(--surface-hover);
          border: 1px solid var(--border);
        }

        @media (max-width: 520px) {
          .rel-mes-sem-escala-faixa {
            flex-wrap: wrap;
            row-gap: 10px;
          }
          .rel-mes-sem-escala-nomes {
            flex: 1 1 100%;
            order: 3;
          }
          .rel-mes-sem-escala-mais {
            order: 4;
          }
        }

        .rel-mes-sem-escala-cabecalho {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 0 0 auto;
          white-space: nowrap;
          line-height: 1.5;
        }

        .rel-mes-sem-escala-rotulo,
        .rel-mes-sem-escala-contador,
        .rel-mes-sem-escala-nome {
          font-size: 12px;
          font-weight: 500;
          line-height: 1.5;
          color: var(--text-muted);
        }

        .rel-mes-sem-escala-rotulo {
          text-transform: uppercase;
          letter-spacing: 0.35px;
        }

        .rel-mes-sem-escala-contador {
          font-family: inherit;
        }

        .rel-mes-sem-escala-divisor {
          width: 1px;
          align-self: stretch;
          flex: 0 0 1px;
          min-height: 1em;
          background: var(--border);
        }

        .rel-mes-sem-escala-nomes {
          flex: 1 1 0;
          min-width: 0;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px 0;
          align-items: center;
        }

        @media (max-width: 640px) {
          .rel-mes-sem-escala-nomes {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .rel-mes-sem-escala-nome:nth-child(4n + 1) {
            padding-left: 12px;
          }
          .rel-mes-sem-escala-nome:nth-child(3n + 1) {
            padding-left: 0;
          }
        }

        @media (max-width: 420px) {
          .rel-mes-sem-escala-nomes {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .rel-mes-sem-escala-nome:nth-child(3n + 1) {
            padding-left: 12px;
          }
          .rel-mes-sem-escala-nome:nth-child(2n + 1) {
            padding-left: 0;
          }
        }

        .rel-mes-sem-escala-nome {
          position: relative;
          padding: 0 12px;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rel-mes-sem-escala-nome:nth-child(4n + 1) {
          padding-left: 0;
        }

        .rel-mes-sem-escala-nome:not(:nth-child(4n)):not(:last-child)::after {
          content: "|";
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-dim);
          font-weight: 300;
          font-size: 11px;
        }

        @media (max-width: 640px) {
          .rel-mes-sem-escala-nome:not(:nth-child(4n)):not(:last-child)::after {
            content: none;
          }
          .rel-mes-sem-escala-nome:not(:nth-child(3n)):not(:last-child)::after {
            content: "|";
          }
        }

        @media (max-width: 420px) {
          .rel-mes-sem-escala-nome:not(:nth-child(3n)):not(:last-child)::after {
            content: none;
          }
          .rel-mes-sem-escala-nome:not(:nth-child(2n)):not(:last-child)::after {
            content: "|";
          }
        }

        .rel-mes-sem-escala-mais {
          flex: 0 0 auto;
          align-self: center;
          white-space: nowrap;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          cursor: pointer;
          font-family: inherit;
          transition: border-color 0.15s, color 0.15s;
        }

        .rel-mes-sem-escala-mais:hover {
          border-color: var(--border-light);
          color: var(--text);
        }

        .rel-mes-sem-escala-mais:focus-visible {
          outline: 2px solid var(--accent-focus-ring);
          outline-offset: 2px;
        }

        .rel-mes-table-footer {
          border-top: 1px solid var(--border);
          padding: 10px 14px 12px;
          background: var(--surface);
        }

        .rel-mes-legenda {
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          flex-wrap: wrap;
          gap: 6px;
          font-size: 11px;
          color: var(--text-muted);
          text-align: left;
        }

        .rel-mes-legenda-sep {
          opacity: 0.5;
        }

        .rel-mes-vazio {
          padding: 32px 16px;
          text-align: center;
          font-size: 13px;
          color: var(--text-muted);
        }

        @media (max-width: 767px) {
          .rel-mes {
            width: 100%;
            max-width: 100%;
            min-width: 0;
            box-sizing: border-box;
          }

          .rel-mes-cards {
            grid-template-columns: 1fr;
            width: 100%;
            min-width: 0;
          }

          .rel-mes-card {
            width: 100%;
            min-width: 0;
            box-sizing: border-box;
          }

          .rel-mes-table-wrap,
          .rel-mes-table-scroll {
            width: 100%;
            max-width: 100%;
            min-width: 0;
            box-sizing: border-box;
          }

          .rel-mes-table {
            min-width: 0;
            width: 100%;
            table-layout: fixed;
          }

          .rel-mes-col-turma {
            width: auto;
          }

          .rel-mes-col-escalas {
            width: 60px;
          }

          .rel-mes-col-indicador {
            width: 40px;
          }

          .rel-mes-cell--turma {
            width: 38%;
            padding-right: 8px;
          }

          .rel-mes-table thead th,
          .rel-mes-cell {
            padding: 8px 6px;
          }

          .rel-mes-table thead th.rel-mes-th--escalas {
            padding-left: 10px;
            padding-right: 8px;
          }

          .rel-mes-cell--escalas {
            padding-left: 10px;
            padding-right: 8px;
          }

          .rel-mes-table thead th.rel-mes-th--indicador,
          .rel-mes-cell--indicador {
            padding-left: 2px;
            padding-right: 6px;
          }

          .rel-mes-avatar {
            width: 28px;
            height: 28px;
            font-size: 10px;
          }

          .rel-mes-obreiro {
            gap: 8px;
          }

          .rel-mes-nome {
            font-size: 12px;
          }

          .rel-mes-turmas {
            font-size: 10px;
          }

          .rel-mes-turma-count {
            font-size: 11px;
          }

          .rel-mes-escalas-num {
            font-size: 13px;
          }

          .rel-mes-indicador {
            min-width: 32px;
            min-height: 32px;
            padding: 4px 2px;
            margin-right: 0;
          }

          .rel-mes-sem-escala-faixa {
            width: 100%;
            max-width: 100%;
            min-width: 0;
            box-sizing: border-box;
          }
        }

        @media (max-width: 639px) {
          .rel-mes-titulo {
            font-size: 16px;
            letter-spacing: 0.4px;
          }
        }
      `}</style>

      <header className="rel-mes-header">
        <h2 className="rel-mes-titulo" style={{ color: theme.text }}>
          Escalas do mês
        </h2>
        {onVoltar && (
          <div className="rel-mes-header-voltar">
            <BotaoVoltar onClick={onVoltar} title="Voltar para escala" />
          </div>
        )}
      </header>

      <div className="rel-mes-cards">
        <CardResumo label="Total de escalas" valor={resumo.totalEscalas} theme={theme} />
        <CardResumo
          label="Obreiros"
          valor={`${resumo.obreirosEscalados}/${resumo.obreirosTotal}`}
          theme={theme}
        />
        <CardResumo label="Alertas" valor={resumo.alertas} destaque="alerta" theme={theme} />
      </div>

      <div className="rel-mes-table-wrap">
        <div className="rel-mes-table-scroll" role="region" aria-label="Tabela de escalas por obreiro">
          {escalados.length === 0 ? (
            <p className="rel-mes-vazio">Nenhum obreiro escalado neste mês.</p>
          ) : (
            <table className="rel-mes-table">
              <colgroup>
                <col className="rel-mes-col-obreiro" />
                <col className="rel-mes-col-turma" />
                <col className="rel-mes-col-escalas" />
                <col className="rel-mes-col-indicador" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Obreiro(a)</th>
                  <th scope="col">Função</th>
                  <th scope="col" className="rel-mes-th--escalas">
                    Escala
                  </th>
                  <th scope="col" className="rel-mes-th--indicador" aria-label="Alertas">
                    <span className="rel-mes-th-indicador-vazio" aria-hidden="true">
                      &nbsp;
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {escalados.map(({ pessoa, total, slots, porFuncao, consecutivas }) => (
                  <LinhaObreiro
                    key={pessoa}
                    pessoa={pessoa}
                    total={total}
                    slots={slots}
                    porFuncao={porFuncao}
                    consecutivas={consecutivas}
                    ministerioId={ministerioId}
                    funcoes={funcoes}
                    theme={theme}
                    expandido={expandidos.has(pessoa)}
                    onToggle={toggleExpandido}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
        {escalados.some((r) => r.total > 0) && (
          <div className="rel-mes-table-footer">
            <footer className="rel-mes-legenda">
              <ChevronDown size={13} color={theme.textMuted} aria-hidden />
              <span>Clique na linha para ver todas as datas escaladas</span>
              {escalados.some((r) => r.consecutivas.length > 0) && (
                <>
                  <span className="rel-mes-legenda-sep" aria-hidden>·</span>
                  <AlertTriangle size={13} color={ALERTA.fg} aria-hidden />
                  <span>Indica turnos seguidos na mesma faixa</span>
                </>
              )}
            </footer>
          </div>
        )}
      </div>

      {semEscala.length > 0 && <SecaoSemEscala pessoas={semEscala} />}
    </div>
  );
}
