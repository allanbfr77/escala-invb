// ===== src/components/RelatorioMinisterio.jsx =====
import { useState, useMemo, useCallback } from "react";
import { AlertTriangle, ChevronDown, ArrowLeft, Calendar } from "lucide-react";
import BotaoVoltar from "./BotaoVoltar";
import { pessoasPorMinisterio } from "../data/pessoas";
import { nomeParaExibicao, pessoaNomeFirestore } from "../utils/nomeExibicao";
import { turnoSalvoEscala } from "../utils/escalaDisponibilidade";
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

function obterTurmaPrincipal(ministerioId, porFuncao, funcoes) {
  const grupos = agruparContagensPorFuncao(funcoes, porFuncao);
  if (!grupos.length) return null;

  const principal = grupos.reduce((a, b) => (b.count > a.count ? b : a));
  const funcaoRef = funcoes.find(
    (f) => obterGrupoFuncaoExibicao(f) === principal.funcao && porFuncao[f] > 0
  );
  if (!funcaoRef) return null;

  const abrev = funcaoParaAbrev(ministerioId, funcaoRef);
  const estilo = estiloTom(ministerioId, funcaoRef);
  const label = getTooltipAbrev(ministerioId, abrev) || principal.funcao;

  return { label, grupo: principal.funcao, ...estilo };
}

function PainelTurnosSeguidos({ consecutivas }) {
  return (
    <div
      className="rel-mes-alerta-faixa"
      style={{ background: FAIXA_TURNOS.bg, color: FAIXA_TURNOS.fg }}
      role="region"
      aria-label="Detalhes dos turnos seguidos"
    >
      {consecutivas.map(([a, b], i) => {
        const turno = rotuloTurnoPill(b.turno);
        return (
          <div key={i} className="rel-mes-alerta-linha">
            {i === 0 ? (
              <>
                <Calendar size={14} strokeWidth={2} aria-hidden className="rel-mes-alerta-icone" />
                <span className="rel-mes-alerta-rotulo">Turnos seguidos</span>
              </>
            ) : (
              <span className="rel-mes-alerta-indent" aria-hidden />
            )}
            <span className="rel-mes-alerta-periodo">{formatarPeriodoConsecutivo([a, b])}</span>
            {turno && <span className="rel-mes-alerta-turno-pill">{turno}</span>}
          </div>
        );
      })}
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
      <div className="rel-mes-sem-escala-lista">
        {visiveis.map(({ pessoa }) => (
          <div key={pessoa} className="rel-mes-sem-escala-item">
            <span className="rel-mes-avatar rel-mes-avatar--sem-escala" aria-hidden>
              {iniciaisObreiro(pessoa)}
            </span>
            <span className="rel-mes-sem-escala-nome">{nomeParaExibicao(pessoa)}</span>
          </div>
        ))}
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
      </div>
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
  porFuncao,
  consecutivas,
  ministerioId,
  funcoes,
  theme,
  expandido,
  onToggle,
}) {
  const turma = obterTurmaPrincipal(ministerioId, porFuncao, funcoes);
  const temAlerta = consecutivas.length > 0;
  const nome = nomeParaExibicao(pessoa);

  const handleToggle = useCallback(() => {
    if (temAlerta) onToggle(pessoa);
  }, [temAlerta, onToggle, pessoa]);

  const handleKeyDown = useCallback(
    (e) => {
      if (!temAlerta) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onToggle(pessoa);
      }
    },
    [temAlerta, onToggle, pessoa]
  );

  return (
    <>
      <tr
        className={`rel-mes-row${temAlerta ? " rel-mes-row--alerta" : ""}${expandido ? " rel-mes-row--aberta" : ""}`}
        onClick={temAlerta ? handleToggle : undefined}
        onKeyDown={temAlerta ? handleKeyDown : undefined}
        role={temAlerta ? "button" : undefined}
        tabIndex={temAlerta ? 0 : undefined}
        aria-expanded={temAlerta ? expandido : undefined}
        aria-label={
          temAlerta
            ? `${nome}, ${total} escalas, ${consecutivas.length} turno${consecutivas.length !== 1 ? "s" : ""} seguido${consecutivas.length !== 1 ? "s" : ""}. Clique para ${expandido ? "recolher" : "expandir"}`
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
          {turma ? (
            <span
              className="rel-mes-turma-badge"
              style={{ color: turma.fg, background: turma.bg }}
            >
              {turma.label}
            </span>
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
          {temAlerta ? (
            <span className="rel-mes-indicador">
              <AlertTriangle
                size={15}
                color={ALERTA.fg}
                aria-label="Alerta de turnos seguidos"
              />
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

      {temAlerta && expandido && (
        <tr className="rel-mes-expandida">
          <td colSpan={4}>
            <PainelTurnosSeguidos consecutivas={consecutivas} />
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

  datas.forEach((dataObj) => {
    const turnoKey = turnoSalvoEscala(dataObj);
    funcoes.forEach((f) => {
      const pessoa = escalas[`${dataObj.data}-${turnoKey}-${f}`];
      if (pessoa && pessoa !== "disponível") {
        const pl = pessoaNomeFirestore(pessoa);
        if (!pl || pl === "disponível") return;
        if (!porPessoa[pl]) porPessoa[pl] = [];
        porPessoa[pl].push({ ...dataObj, funcao: f });
      }
    });
  });

  const posicao = {};
  datas.forEach((d, i) => {
    posicao[d.id] = i;
  });

  const relatorio = Object.entries(porPessoa).map(([pessoa, slots]) => {
    const porFuncao = {};
    funcoes.forEach((f) => {
      porFuncao[f] = 0;
    });
    slots.forEach((s) => {
      porFuncao[s.funcao] = (porFuncao[s.funcao] || 0) + 1;
    });

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
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }

        .rel-mes-titulo {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .rel-mes-subtitulo {
          margin: 4px 0 0;
          font-size: 12px;
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
          width: auto;
        }

        .rel-mes-col-turma {
          width: 32%;
        }

        .rel-mes-col-escalas {
          width: 68px;
        }

        .rel-mes-col-indicador {
          width: 60px;
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

        .rel-mes-table thead th.rel-mes-th--escalas,
        .rel-mes-cell--escalas {
          text-align: center;
          padding-left: 8px;
          padding-right: 8px;
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

        .rel-mes-row--alerta:focus-visible {
          outline: 2px solid var(--accent-focus-ring);
          outline-offset: -2px;
        }

        .rel-mes-cell {
          padding: 10px 14px;
          vertical-align: middle;
        }

        .rel-mes-cell--escalas {
          text-align: center;
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

        .rel-mes-turma-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          border-radius: 4px;
          padding: 3px 8px;
          white-space: nowrap;
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .rel-mes-turma-vazia {
          font-size: 12px;
        }

        .rel-mes-escalas-num {
          display: block;
          width: 100%;
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

        .rel-mes-alerta-indent {
          flex-shrink: 0;
          width: calc(14px + 8px + 7.2rem);
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
          flex-wrap: wrap;
          align-items: center;
          gap: 12px 16px;
          padding: 12px 14px;
          border-radius: 8px;
          background: var(--surface-hover);
          border: 1px solid var(--border);
        }

        .rel-mes-sem-escala-cabecalho {
          display: flex;
          align-items: baseline;
          gap: 4px;
          flex-shrink: 0;
        }

        .rel-mes-sem-escala-rotulo {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.45px;
          color: var(--text-muted);
        }

        .rel-mes-sem-escala-contador {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          font-family: 'JetBrains Mono', monospace;
        }

        .rel-mes-sem-escala-divisor {
          width: 1px;
          align-self: stretch;
          min-height: 24px;
          background: var(--border);
          flex-shrink: 0;
        }

        .rel-mes-sem-escala-lista {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px 14px;
          flex: 1;
          min-width: 0;
        }

        .rel-mes-sem-escala-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .rel-mes-avatar--sem-escala {
          width: 28px;
          height: 28px;
          font-size: 10px;
          color: var(--text-dim);
          background: var(--bg);
        }

        .rel-mes-sem-escala-nome {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
          white-space: nowrap;
        }

        .rel-mes-sem-escala-mais {
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
          gap: 6px;
          font-size: 11px;
          color: var(--text-muted);
          text-align: left;
        }

        .rel-mes-vazio {
          padding: 32px 16px;
          text-align: center;
          font-size: 13px;
          color: var(--text-muted);
        }

        @media (max-width: 520px) {
          .rel-mes-cards {
            grid-template-columns: 1fr;
          }

          .rel-mes-header {
            flex-direction: column;
          }

          .rel-mes-voltar {
            align-self: flex-start;
          }

          .rel-mes-turma-badge {
            max-width: 100px;
          }
        }
      `}</style>

      <header className="rel-mes-header">
        <div>
          <h2 className="rel-mes-titulo" style={{ color: theme.text }}>
            Escalas do mês
          </h2>
          <p className="rel-mes-subtitulo" style={{ color: theme.textMuted }}>
            {resumo.obreirosEscalados} obreiro{resumo.obreirosEscalados !== 1 ? "s" : ""}
            {resumo.turmas > 0 && (
              <>
                {" · "}
                {resumo.turmas} turma{resumo.turmas !== 1 ? "s" : ""}
              </>
            )}
          </p>
        </div>
        {onVoltar && <BotaoVoltar onClick={onVoltar} title="Voltar para escala" />}
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
                  <th scope="col">Obreiro</th>
                  <th scope="col">Turma</th>
                  <th scope="col" className="rel-mes-th--escalas">
                    Escalas
                  </th>
                  <th scope="col" className="rel-mes-th--indicador" aria-label="Alertas">
                    <span className="rel-mes-th-indicador-vazio" aria-hidden="true">
                      &nbsp;
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {escalados.map(({ pessoa, total, porFuncao, consecutivas }) => (
                  <LinhaObreiro
                    key={pessoa}
                    pessoa={pessoa}
                    total={total}
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
        {escalados.some((r) => r.consecutivas.length > 0) && (
          <div className="rel-mes-table-footer">
            <footer className="rel-mes-legenda">
              <AlertTriangle size={13} color={ALERTA.fg} aria-hidden />
              <span>Indica turnos em dias consecutivos no mês</span>
            </footer>
          </div>
        )}
      </div>

      {semEscala.length > 0 && <SecaoSemEscala pessoas={semEscala} />}
    </div>
  );
}
