import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { db } from "../firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc } from "firebase/firestore";
import { formatarData } from "../utils/dateHelper";
import { chaveIndisponibilidadeColuna } from "../utils/indisponibilidadeHelpers";
import {
  montarFaixasPlanilha,
  formatarCabecalhoData,
  COLUNAS_POR_FAIXA,
} from "../utils/planilhaFaixasLayout";
import {
  NOMES_MINISTERIOS,
  getConfigPlanilhaMinisterio,
  getFuncoesPlanilha,
} from "../utils/planilhaMinisterioConfig";
import { pessoaNomeFirestore, nomeParaExibicao } from "../utils/nomeExibicao";
import { filtrarPessoasDisponiveisNoCulto } from "../utils/escalaDisponibilidade";

function turnoSalvo(dataObj) {
  return dataObj?.turno === "único" ? "único" : dataObj?.turno;
}

function escalaKey(dataObj, funcao) {
  const turno = turnoSalvo(dataObj);
  return `${dataObj.data}-${turno}-${funcao}`;
}

const LOUVOR_OPCAO_DISPONIVEL = "Disponível";

/** Contagem de vagas preenchidas para um culto (coluna) específico. */
function contarSlotsCulto(dataObj, funcoes, escalas, ministerioId) {
  if (!dataObj) return null;

  const total = funcoes.length;
  let preenchidos = 0;

  for (const funcao of funcoes) {
    const valor = escalas[escalaKey(dataObj, funcao)];
    if (!valor) continue;
    if (ministerioId === "louvor" && valor === "disponível") continue;
    preenchidos += 1;
  }

  return { preenchidos, total };
}

function getHorarios(dataObj) {
  return {
    horaInicio:
      dataObj.tipo === "domingo" && dataObj.turno === "manhã"
        ? "08:00"
        : dataObj.tipo === "domingo" && dataObj.turno === "noite"
          ? "18:00"
          : "19:00",
    horaFim: dataObj.tipo === "domingo" && dataObj.turno === "manhã" ? "12:00" : "22:00",
  };
}

const MENU_GAP = 4;
const MENU_ITEM_HEIGHT = 28;
const MENU_LIST_PADDING = 10;

function calcularPosicaoMenu(triggerEl, optionsCount = 1) {
  const rect = triggerEl.getBoundingClientRect();
  const espacoAbaixo = window.innerHeight - rect.bottom - MENU_GAP;
  const espacoAcima = rect.top - MENU_GAP;
  const height = optionsCount * MENU_ITEM_HEIGHT + MENU_LIST_PADDING;

  const abrirAcima = espacoAbaixo < height && espacoAcima > espacoAbaixo;

  const base = {
    left: rect.left,
    width: Math.max(rect.width, 100),
    placement: abrirAcima ? "above" : "below",
  };

  if (abrirAcima) {
    return {
      ...base,
      bottom: window.innerHeight - rect.top + MENU_GAP,
    };
  }

  return {
    ...base,
    top: rect.bottom + MENU_GAP,
  };
}

function CelulaSelect({
  dataObj,
  faixaId,
  inicioFaixa,
  funcao,
  grupoCor,
  valor,
  opcoes,
  podeEditar,
  salvando,
  onChange,
}) {
  const [aberto, setAberto] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const labelCulto = dataObj
    ? formatarData(dataObj.data, dataObj.turno, dataObj.descricao)
    : "";

  const totalOpcoesMenu = opcoes.length + 1;

  const atualizarPosicaoMenu = useCallback(() => {
    if (!triggerRef.current) return;
    setMenuPos(calcularPosicaoMenu(triggerRef.current, totalOpcoesMenu));
  }, [totalOpcoesMenu]);

  const abrirMenu = useCallback(() => {
    if (!triggerRef.current) return;
    setMenuPos(calcularPosicaoMenu(triggerRef.current, totalOpcoesMenu));
    setAberto(true);
  }, [totalOpcoesMenu]);

  const fecharMenu = useCallback(() => {
    setAberto(false);
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const onScrollOrResize = () => atualizarPosicaoMenu();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [aberto, atualizarPosicaoMenu]);

  useEffect(() => {
    if (!aberto) return;
    const fecharFora = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        listRef.current?.contains(e.target)
      ) {
        return;
      }
      fecharMenu();
    };
    const fecharEsc = (e) => {
      if (e.key === "Escape") fecharMenu();
    };
    document.addEventListener("mousedown", fecharFora);
    document.addEventListener("keydown", fecharEsc);
    return () => {
      document.removeEventListener("mousedown", fecharFora);
      document.removeEventListener("keydown", fecharEsc);
    };
  }, [aberto, fecharMenu]);

  if (!dataObj) {
    return (
      <td
        className="planilha-louvor-celula planilha-louvor-celula--vazia"
        aria-hidden
      />
    );
  }

  const desabilitado = !podeEditar || salvando;

  const escolher = (nome) => {
    fecharMenu();
    onChange(dataObj, funcao, nome);
  };

  const removerRapido = (e) => {
    e.preventDefault();
    e.stopPropagation();
    fecharMenu();
    onChange(dataObj, funcao, "");
  };

  const exibirRemover = Boolean(valor) && podeEditar;

  const celulaClass = [
    "planilha-louvor-celula",
    aberto ? "planilha-louvor-celula--ativa" : "",
    valor ? "planilha-louvor-celula--preenchida" : "",
    valor && grupoCor ? `planilha-louvor-celula--obreiro-${grupoCor}` : "",
    inicioFaixa ? "planilha-louvor-celula--inicio-faixa" : "",
    faixaId ? `planilha-louvor-celula--faixa-${faixaId}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const valorClass = !valor
    ? "planilha-louvor-select-valor--vazio"
    : grupoCor
      ? `planilha-louvor-select-valor--${grupoCor}`
      : "planilha-louvor-select-valor";

  const listaPortal =
    aberto &&
    !desabilitado &&
    menuPos &&
    createPortal(
      <ul
        ref={listRef}
        className={`planilha-louvor-select-list planilha-louvor-select-list--portal planilha-louvor-select-list--${menuPos.placement}`}
        role="listbox"
        aria-label={`Opções para ${funcao}`}
        style={{
          position: "fixed",
          left: menuPos.left,
          width: menuPos.width,
          zIndex: 9999,
          ...(menuPos.placement === "above"
            ? { bottom: menuPos.bottom, top: "auto" }
            : { top: menuPos.top, bottom: "auto" }),
        }}
      >
        <li role="presentation">
          <button
            type="button"
            role="option"
            className={`planilha-louvor-select-option${!valor ? " is-selected" : ""}`}
            onClick={() => escolher("")}
          >
            —
          </button>
        </li>
        {opcoes.map((nome) => (
          <li key={nome} role="presentation">
            <button
              type="button"
              role="option"
              className={`planilha-louvor-select-option${
                valor &&
                pessoaNomeFirestore(valor) === pessoaNomeFirestore(nome)
                  ? " is-selected"
                  : ""
              }`}
              onClick={() => escolher(nome)}
            >
              {nomeParaExibicao(nome)}
            </button>
          </li>
        ))}
      </ul>,
      document.body
    );

  return (
    <td
      className={celulaClass}
      data-label={funcao}
      data-faixa={faixaId || undefined}
      data-funcao-grupo={grupoCor || undefined}
    >
      <div className="planilha-louvor-select-wrap">
        <div
          ref={triggerRef}
          role="button"
          tabIndex={desabilitado ? -1 : 0}
          className={[
            "planilha-louvor-select-trigger",
            aberto && menuPos?.placement === "above"
              ? "planilha-louvor-select-trigger--dropup"
              : "",
            desabilitado ? "planilha-louvor-select-trigger--disabled" : "",
            valor ? "planilha-louvor-select-trigger--com-valor" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-expanded={aberto}
          aria-haspopup="listbox"
          aria-disabled={desabilitado}
          aria-label={`${funcao} em ${labelCulto}`}
          onClick={() => {
            if (desabilitado) return;
            if (aberto) fecharMenu();
            else abrirMenu();
          }}
          onKeyDown={(e) => {
            if (desabilitado) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (aberto) fecharMenu();
              else abrirMenu();
            }
          }}
        >
          <div className="planilha-louvor-select-leading">
            <span className={`planilha-louvor-select-valor ${valorClass}`}>
              {valor || "—"}
            </span>
            <span className="planilha-louvor-select-chevron" aria-hidden>
              ▾
            </span>
          </div>
          {exibirRemover && (
            <button
              type="button"
              className="planilha-louvor-remover-btn"
              disabled={salvando}
              aria-label={`Remover ${valor} de ${funcao}`}
              title="Remover escala"
              onClick={removerRapido}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <svg
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {listaPortal}
    </td>
  );
}

export default function PlanilhaMinisterio({
  ministerioId,
  escalas,
  datas,
  mes,
  loading,
  podeEditar,
  usuario,
  onMensagem,
  onConflito,
  indispRefreshKey = 0,
}) {
  const config = getConfigPlanilhaMinisterio(ministerioId);
  const funcoes = getFuncoesPlanilha(ministerioId);
  const [salvando, setSalvando] = useState(false);
  const [indispMap, setIndispMap] = useState({});

  const { faixas } = useMemo(() => montarFaixasPlanilha(datas), [datas]);

  const largurasGrid = useMemo(() => {
    const flat = faixas.flatMap((f) => f.colunas);
    const vazias = flat.filter((c) => !c).length;
    const comData = flat.filter(Boolean).length;
    const pctFuncao = 8.5;
    const pctVazia = 0.12;
    const pctData =
      comData > 0 ? (100 - pctFuncao - vazias * pctVazia) / comData : 6;
    return { pctFuncao, pctVazia, pctData };
  }, [faixas]);

  useEffect(() => {
    if (!ministerioId) return;
    let cancelled = false;
    getDocs(
      query(
        collection(db, "indisponibilidades"),
        where("ministerioId", "==", ministerioId)
      )
    )
      .then((snap) => {
        if (cancelled) return;
        const mapa = {};
        snap.docs.forEach((docSnap) => {
          const { pessoaNome, datas: datasIndisp = [] } = docSnap.data();
          if (!pessoaNome) return;
          const pl = pessoaNome.toLowerCase();
          mapa[pl] = new Set(datasIndisp);
        });
        setIndispMap(mapa);
      })
      .catch((err) =>
        console.error(`PlanilhaMinisterio(${ministerioId}): indisponibilidades`, err)
      );
    return () => {
      cancelled = true;
    };
  }, [ministerioId, indispRefreshKey]);

  const pessoaIndisponivel = useCallback(
    (pessoa, dataObj) => {
      const set = indispMap[pessoaNomeFirestore(pessoa)];
      if (!set?.size || !dataObj) return false;
      return set.has(chaveIndisponibilidadeColuna(dataObj));
    },
    [indispMap]
  );

  const getOpcoesSelect = useCallback(
    (dataObj, funcao) => {
      if (!dataObj || !config) return [];
      const qualificados = config.getPessoasPorFuncao(funcao) || [];
      const atual = escalas[escalaKey(dataObj, funcao)];
      const atualUpper =
        atual && atual !== "disponível" ? nomeParaExibicao(atual) : null;

      const filtrados = filtrarPessoasDisponiveisNoCulto(qualificados, {
        escalas,
        ministerioId,
        dataObj,
        funcaoAtual: funcao,
        pessoaIndisponivel,
      });
      let opcoes = filtrados;
      if (atualUpper && !opcoes.includes(atualUpper)) {
        opcoes = [...opcoes, atualUpper];
      }
      if (ministerioId === "louvor") {
        opcoes = opcoes.filter(
          (n) => pessoaNomeFirestore(n) !== "disponível"
        );
        return [LOUVOR_OPCAO_DISPONIVEL, ...opcoes];
      }
      return opcoes;
    },
    [config, escalas, ministerioId, pessoaIndisponivel]
  );

  const salvarCelula = useCallback(
    async (dataObj, funcao, valorBruto) => {
      if (!podeEditar) {
        onMensagem?.("Você só pode editar seu próprio ministério", "erro");
        return;
      }

      const turno = turnoSalvo(dataObj);
      const chaveAtual = escalaKey(dataObj, funcao);
      const valorAnterior = escalas[chaveAtual] || "";
      const pessoaLower = valorBruto ? pessoaNomeFirestore(valorBruto) : "";
      const anteriorLower = valorAnterior ? pessoaNomeFirestore(valorAnterior) : "";

      if (!valorBruto && !valorAnterior) return;
      if (pessoaLower === anteriorLower) return;

      setSalvando(true);
      try {
        const qFuncao = query(
          collection(db, "escalas"),
          where("ministerioId", "==", ministerioId),
          where("data", "==", dataObj.data),
          where("funcao", "==", funcao),
          where("turno", "==", turno)
        );
        const snapFuncao = await getDocs(qFuncao);
        for (const docSnap of snapFuncao.docs) await deleteDoc(docSnap.ref);

        if (!valorBruto) {
          onMensagem?.("Escala removida", "sucesso");
          return;
        }

        const isDisponivelLouvor =
          ministerioId === "louvor" && pessoaLower === "disponível";

        if (!isDisponivelLouvor) {
          const qConflito = query(
            collection(db, "escalas"),
            where("pessoaNome", "==", pessoaLower),
            where("data", "==", dataObj.data),
            where("turno", "==", turno)
          );
          const snapConflito = await getDocs(qConflito);
          const conflitoOutro = snapConflito.docs.find(
            (d) => d.data().ministerioId !== ministerioId
          );
          if (conflitoOutro) {
            const dd = conflitoOutro.data();
            onConflito?.({
              pessoa: valorBruto,
              data: formatarData(dataObj.data, dataObj.turno, dataObj.descricao),
              ministerio: NOMES_MINISTERIOS[dd.ministerioId] || dd.ministerioId,
              funcao: dd.funcao,
            });
            return;
          }

          const mesmaPessoaMinisterio = snapConflito.docs.filter(
            (d) =>
              d.data().ministerioId === ministerioId && d.data().funcao !== funcao
          );
          for (const docSnap of mesmaPessoaMinisterio) {
            await deleteDoc(docSnap.ref);
          }
        }

        const { horaInicio, horaFim } = getHorarios(dataObj);
        await addDoc(collection(db, "escalas"), {
          pessoaNome: pessoaLower,
          funcao,
          ministerioId,
          data: dataObj.data,
          turno,
          horaInicio,
          horaFim,
          criadoPor: usuario.uid,
          criadoPorEmail: usuario.email,
          criadoEm: new Date().toISOString(),
        });

        onMensagem?.(`${nomeParaExibicao(valorBruto)} — ${funcao}`, "sucesso");
      } catch (err) {
        console.error(err);
        onMensagem?.("Erro ao salvar escala", "erro");
      } finally {
        setSalvando(false);
      }
    },
    [escalas, ministerioId, podeEditar, usuario, onMensagem, onConflito]
  );

  if (!config) {
    return null;
  }

  if (loading && (!datas || datas.length === 0)) {
    return (
      <div className="planilha-louvor-loading">
        Carregando planilha de {config.labelCarregando}...
      </div>
    );
  }

  if (!datas || datas.length === 0) {
    return (
      <div className="planilha-louvor-loading">
        Nenhuma data disponível para este mês
      </div>
    );
  }

  return (
    <div className="planilha-louvor-wrap">
      <table className="planilha-louvor-table">
        <colgroup>
          <col
            className="planilha-louvor-col-funcao"
            style={{ width: `${largurasGrid.pctFuncao}%` }}
          />
          {faixas.flatMap((faixa) =>
            faixa.colunas.map((dataObj, colIdx) => (
              <col
                key={`${faixa.id}-${colIdx}`}
                className={
                  dataObj
                    ? "planilha-louvor-col-data"
                    : "planilha-louvor-col-data planilha-louvor-col-data--compacta"
                }
                style={{
                  width: dataObj
                    ? `${largurasGrid.pctData}%`
                    : `${largurasGrid.pctVazia}%`,
                }}
              />
            ))
          )}
        </colgroup>
        <thead>
          <tr className="planilha-louvor-faixa-row">
            <th rowSpan={2} scope="col" className="planilha-louvor-th-funcao">
              Função
            </th>
            {faixas.map((faixa) => (
              <th
                key={faixa.id}
                colSpan={COLUNAS_POR_FAIXA}
                className="planilha-louvor-th-faixa"
                data-faixa={faixa.id}
              >
                {faixa.titulo}
              </th>
            ))}
          </tr>
          <tr className="planilha-louvor-datas-row">
            {faixas.map((faixa) =>
              faixa.colunas.map((dataObj, colIdx) => (
                <th
                  key={`${faixa.id}-${colIdx}`}
                  data-faixa={faixa.id}
                  className={[
                    "planilha-louvor-th-data",
                    !dataObj ? "planilha-louvor-th-data--vazia" : "",
                    colIdx === 0 && faixa.id !== "domingo-manha"
                      ? "planilha-louvor-th-data--inicio-faixa"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {dataObj ? (
                    <span
                      className="planilha-louvor-data-label"
                      title={formatarData(dataObj.data, dataObj.turno, dataObj.descricao)}
                    >
                      {formatarCabecalhoData(dataObj)}
                    </span>
                  ) : null}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {funcoes.map((funcao, rowIdx) => {
            const grupoCor = config.grupoCorObreiro(funcao);
            return (
              <tr
                key={funcao}
                className="planilha-louvor-row"
                style={{
                  background: rowIdx % 2 === 0 ? "transparent" : "var(--row-zebra)",
                }}
              >
                <th className="planilha-louvor-td-funcao">{funcao}</th>
                {faixas.map((faixa) =>
                  faixa.colunas.map((dataObj, colIdx) => {
                    const valorRaw = dataObj
                      ? escalas[escalaKey(dataObj, funcao)]
                      : null;
                    const isDisponivelLouvor =
                      ministerioId === "louvor" && valorRaw === "disponível";
                    const valor = valorRaw ? nomeParaExibicao(valorRaw) : "";
                    return (
                      <CelulaSelect
                        key={`${faixa.id}-${colIdx}-${funcao}`}
                        faixaId={faixa.id}
                        inicioFaixa={colIdx === 0 && faixa.id !== "domingo-manha"}
                        dataObj={dataObj}
                        funcao={funcao}
                        grupoCor={isDisponivelLouvor ? "" : grupoCor}
                        valor={valor}
                        opcoes={getOpcoesSelect(dataObj, funcao)}
                        podeEditar={podeEditar}
                        salvando={salvando}
                        onChange={salvarCelula}
                      />
                    );
                  })
                )}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="planilha-louvor-tfoot-row">
            <th className="planilha-louvor-tfoot-label" scope="row">
              Total
            </th>
            {faixas.map((faixa) =>
              faixa.colunas.map((dataObj, colIdx) => {
                const stats = contarSlotsCulto(
                  dataObj,
                  funcoes,
                  escalas,
                  ministerioId
                );
                const completo =
                  stats && stats.preenchidos === stats.total && stats.total > 0;

                return (
                  <td
                    key={`footer-${faixa.id}-${colIdx}`}
                    className={[
                      "planilha-louvor-tfoot-celula",
                      !dataObj ? "planilha-louvor-tfoot-celula--vazia" : "",
                      colIdx === 0 && faixa.id !== "domingo-manha"
                        ? "planilha-louvor-tfoot-celula--inicio-faixa"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    data-faixa={faixa.id}
                  >
                    {stats ? (
                      <span
                        className={[
                          "planilha-louvor-preenchimento-badge",
                          completo ? "is-completo" : "is-incompleto",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        title={`${stats.preenchidos} de ${stats.total} funções preenchidas`}
                      >
                        {stats.preenchidos}/{stats.total}
                      </span>
                    ) : null}
                  </td>
                );
              })
            )}
          </tr>
        </tfoot>
      </table>
      {salvando && (
        <div className="planilha-louvor-salvando" aria-live="polite">
          Salvando...
        </div>
      )}
    </div>
  );
}
