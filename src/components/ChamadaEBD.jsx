import { useMemo } from "react";
import BotaoVoltar from "./BotaoVoltar";
import { nomeParaExibicao } from "../utils/nomeExibicao";
import { useChamadaEbd } from "../hooks/useChamadaEbd";
import { useMesAtual } from "../hooks/useMesAtual";
import {
  STATUS_EBD,
  rotuloMesEbd,
  rotuloDomingoCurto,
  calcularPresencaPct,
  alunosEbdDoMinisterio,
  registrosEbdDaPessoa,
} from "../utils/ebdChamada";

function CelulaStatus({ status }) {
  if (!status) {
    return <span className="ebd-chamada-celula-vazia" aria-label="Sem registro">—</span>;
  }
  const info = STATUS_EBD[status];
  return (
    <span
      className="ebd-chamada-badge"
      style={{ background: info?.cor ?? "var(--text-dim)" }}
      title={info?.label ?? status}
      aria-label={info?.label ?? status}
    >
      {status}
    </span>
  );
}

function rotuloAtualizacao(atualizadoEm, fonte, loading, erro, planilhaHabilitada) {
  if (loading) return "Atualizando da planilha…";
  if (!planilhaHabilitada) return "Planilha não configurada · dados locais";
  if (atualizadoEm) {
    const quando = new Date(atualizadoEm).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
    });
    if (erro) return `Cópia salva nesta página · ${quando}`;
    if (fonte === "local") return `Dados locais · ${quando}`;
    return `Atualizado da planilha em ${quando}`;
  }
  if (erro) return `Não foi possível ler a planilha: ${erro}`;
  return "Aguardando planilha";
}

export default function ChamadaEBD({ ministerioId, theme, onVoltar }) {
  const mes = useMesAtual();
  const {
    domingos: domingosPlanilha,
    presencas,
    nomes,
    loading,
    erro,
    atualizadoEm,
    fonte,
    planilhaHabilitada,
  } = useChamadaEbd(mes);

  const tituloMes = rotuloMesEbd(mes);
  const alunos = useMemo(
    () => alunosEbdDoMinisterio(ministerioId, nomes),
    [ministerioId, nomes]
  );
  const linhas = useMemo(
    () =>
      alunos.map((nome) => {
        const registros = registrosEbdDaPessoa(presencas, nome, domingosPlanilha.length);
        return {
          nome,
          registros,
          pct: calcularPresencaPct(registros),
        };
      }),
    [alunos, presencas, domingosPlanilha]
  );

  return (
    <div className="ebd-chamada rel-mes">
      <header className="ebd-chamada-header">
        <div>
          <h2 className="ebd-chamada-titulo" style={{ color: theme.text }}>
            EBD · Chamada {tituloMes}
          </h2>
          <p className="ebd-chamada-subtitulo">
            {rotuloAtualizacao(atualizadoEm, fonte, loading, erro, planilhaHabilitada)}
          </p>
        </div>
        {onVoltar && (
          <div className="ebd-chamada-voltar">
            <BotaoVoltar onClick={onVoltar} title="Voltar para escala" />
          </div>
        )}
      </header>

      <div className="ebd-chamada-legenda" aria-label="Legenda de presença">
        {Object.entries(STATUS_EBD).map(([codigo, info]) => (
          <span key={codigo} className="ebd-chamada-legenda-item">
            <span className="ebd-chamada-badge ebd-chamada-badge--sm" style={{ background: info.cor }}>
              {codigo}
            </span>
            {info.label}
          </span>
        ))}
      </div>

      <div className="ebd-chamada-table-wrap">
        <div className="ebd-chamada-table-scroll" role="region" aria-label="Chamada EBD por aluno">
          <table className="ebd-chamada-table">
            <thead>
              <tr>
                <th className="ebd-chamada-th ebd-chamada-th--nome">Aluno</th>
                {domingosPlanilha.map((data) => (
                  <th key={data} className="ebd-chamada-th ebd-chamada-th--dia">
                    {rotuloDomingoCurto(data)}
                  </th>
                ))}
                <th className="ebd-chamada-th ebd-chamada-th--pct">% Pres.</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map(({ nome, registros, pct }) => (
                <tr key={nome} className="ebd-chamada-row">
                  <td className="ebd-chamada-td ebd-chamada-td--nome">{nomeParaExibicao(nome)}</td>
                  {registros.map((status, idx) => (
                    <td key={`${nome}-${domingosPlanilha[idx]}`} className="ebd-chamada-td ebd-chamada-td--status">
                      <CelulaStatus status={status} />
                    </td>
                  ))}
                  <td className="ebd-chamada-td ebd-chamada-td--pct">
                    {pct !== null ? `${pct}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="ebd-chamada-footer">
          Total de obreiros: {alunos.length} · Domingos no mês: {domingosPlanilha.length}
        </footer>
      </div>
    </div>
  );
}
