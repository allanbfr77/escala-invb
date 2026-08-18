import { useMemo } from "react";
import BotaoVoltar from "./BotaoVoltar";
import { chamadaEbdPorMes } from "../data/ebd";
import { nomeParaExibicao } from "../utils/nomeExibicao";
import {
  STATUS_EBD,
  rotuloMesEbd,
  rotuloDomingoCurto,
  domingosDoMes,
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

export default function ChamadaEBD({ mes, ministerioId, theme, onVoltar }) {
  const geradoEm = useMemo(
    () => new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" }),
    []
  );

  const chamadaMes = chamadaEbdPorMes[mes];
  const domingos = chamadaMes?.domingos ?? domingosDoMes(mes);
  const tituloMes = rotuloMesEbd(mes);

  const alunos = useMemo(() => alunosEbdDoMinisterio(ministerioId), [ministerioId]);

  const linhas = useMemo(
    () =>
      alunos.map((nome) => {
        const registros = registrosEbdDaPessoa(chamadaMes?.presencas, nome, domingos.length);
        return {
          nome,
          registros,
          pct: calcularPresencaPct(registros),
        };
      }),
    [alunos, chamadaMes, domingos]
  );

  return (
    <div className="ebd-chamada rel-mes">
      <header className="ebd-chamada-header">
        <div>
          <h2 className="ebd-chamada-titulo" style={{ color: theme.text }}>
            EBD · Chamada {tituloMes}
          </h2>
          <p className="ebd-chamada-subtitulo">Gerado em {geradoEm}</p>
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
                {domingos.map((data) => (
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
                    <td key={`${nome}-${domingos[idx]}`} className="ebd-chamada-td ebd-chamada-td--status">
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
          Total de obreiros: {alunos.length} · Domingos no mês: {domingos.length}
        </footer>
      </div>
    </div>
  );
}
