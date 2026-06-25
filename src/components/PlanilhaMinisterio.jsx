import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from "react";
import { createPortal } from "react-dom";
import { db } from "../firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc } from "firebase/firestore";
import { formatarData } from "../utils/dateHelper";
import { chaveIndisponibilidadeColuna } from "../utils/indisponibilidadeHelpers";
import {
  montarFaixasPlanilha,
  formatarCabecalhoData,
} from "../utils/planilhaFaixasLayout";
import {
  NOMES_MINISTERIOS,
  getConfigPlanilhaMinisterio,
  getFuncoesPlanilha,
} from "../utils/planilhaMinisterioConfig";
import { pessoaNomeFirestore, nomeParaExibicao } from "../utils/nomeExibicao";
import { filtrarPessoasDisponiveisNoCulto } from "../utils/escalaDisponibilidade";
import {
  MINISTERIO_INFANTIL_ID,
  contarCultosEscaladosInfantilNoMes,
  mensagemLimiteInfantil,
  precisaConfirmarLimiteInfantil,
} from "../utils/limiteEscalasInfantil";
import { useMediaQuery, TABLET_MIN_QUERY } from "../hooks/useMediaQuery";

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
const MENU_ITEM_HEIGHT = 34;
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
  valor,
  opcoes,
  podeEditar,
  salvando,
  onChange,
  destacar = false,
  filtroAtivo = false,
  variant = "table",
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
    inicioFaixa ? "planilha-louvor-celula--inicio-faixa" : "",
    faixaId ? `planilha-louvor-celula--faixa-${faixaId}` : "",
    destacar ? "planilha-louvor-celula--destaque" : "",
    filtroAtivo && valor && !destacar ? "planilha-louvor-celula--esmaecida" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const valorClass = !valor
    ? "planilha-louvor-select-valor--vazio"
    : "planilha-louvor-select-valor--preenchido";

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

  const toggleMenu = () => {
    if (desabilitado) return;
    if (aberto) fecharMenu();
    else abrirMenu();
  };

  const celulaClassFinal = [
    celulaClass,
    desabilitado ? "planilha-louvor-celula--disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (variant === "card") {
    const cardClass = [
      "planilha-mobile-select",
      aberto ? "is-ativa" : "",
      valor ? "is-preenchida" : "",
      destacar ? "is-destaque" : "",
      filtroAtivo && valor && !destacar ? "is-esmaecida" : "",
      desabilitado ? "is-disabled" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div
        ref={triggerRef}
        className={cardClass}
        role="button"
        tabIndex={desabilitado ? -1 : 0}
        aria-expanded={aberto}
        aria-haspopup="listbox"
        aria-disabled={desabilitado}
        aria-label={`${funcao} em ${labelCulto}`}
        onClick={toggleMenu}
        onKeyDown={(e) => {
          if (desabilitado) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleMenu();
          }
        }}
      >
        <span
          className={`planilha-louvor-select-valor ${valorClass}`}
          title={valor || undefined}
        >
          {valor || "—"}
        </span>
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
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
        {!desabilitado && (
          <svg className="planilha-mobile-select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 9l6 6 6-6" />
          </svg>
        )}
        {listaPortal}
      </div>
    );
  }

  return (
    <td
      ref={triggerRef}
      className={celulaClassFinal}
      data-label={funcao}
      data-faixa={faixaId || undefined}
      role="button"
      tabIndex={desabilitado ? -1 : 0}
      aria-expanded={aberto}
      aria-haspopup="listbox"
      aria-disabled={desabilitado}
      aria-label={`${funcao} em ${labelCulto}`}
      onClick={toggleMenu}
      onKeyDown={(e) => {
        if (desabilitado) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleMenu();
        }
      }}
    >
      <div className="planilha-louvor-select-wrap">
        <div
          className={[
            "planilha-louvor-select-trigger",
            valor ? "planilha-louvor-select-trigger--com-valor" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span
            className={`planilha-louvor-select-valor ${valorClass}`}
            title={valor || undefined}
          >
            {valor || "—"}
          </span>
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
  pedirConfirmacao = null,
  filtroNome = "",
}) {
  const config = getConfigPlanilhaMinisterio(ministerioId);
  const funcoes = getFuncoesPlanilha(ministerioId);
  const termoFiltro = filtroNome.trim().toLowerCase();
  const filtroAtivo = termoFiltro.length > 0;
  const [salvando, setSalvando] = useState(false);
  const [indispMap, setIndispMap] = useState({});
  const isTabletUp = useMediaQuery(TABLET_MIN_QUERY);
  const [abertos, setAbertos] = useState(() => new Set());

  const { faixas } = useMemo(() => montarFaixasPlanilha(datas), [datas]);

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

      if (
        ministerioId === MINISTERIO_INFANTIL_ID &&
        pedirConfirmacao &&
        mes &&
        pessoaLower &&
        pessoaLower !== "disponível" &&
        precisaConfirmarLimiteInfantil(
          pessoaLower,
          mes,
          escalas,
          [dataObj],
          datas
        )
      ) {
        const cultosAtuais = contarCultosEscaladosInfantilNoMes(
          pessoaLower,
          mes,
          escalas,
          datas
        );
        const confirmou = await pedirConfirmacao({
          titulo: "Limite de escalas — Infantil",
          descricao: mensagemLimiteInfantil(
            nomeParaExibicao(valorBruto),
            cultosAtuais
          ),
        });
        if (!confirmou) return;
      }

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
    [escalas, ministerioId, mes, datas, podeEditar, usuario, onMensagem, onConflito, pedirConfirmacao]
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

  if (!isTabletUp) {
    return (
      <div className="planilha-mobile">
        {faixas.map((faixa) => {
          const cultos = faixa.colunas.filter(Boolean);
          if (cultos.length === 0) return null;
          return (
            <section className="planilha-mobile-faixa" data-faixa={faixa.id} key={faixa.id}>
              <h3 className="planilha-mobile-faixa-titulo">{faixa.titulo}</h3>
              {cultos.map((dataObj) => {
                const cardKey = `${faixa.id}::${dataObj.data}::${dataObj.turno}`;
                const aberto = abertos.has(cardKey);
                const stats = contarSlotsCulto(dataObj, funcoes, escalas, ministerioId);
                const completo = stats && stats.preenchidos === stats.total && stats.total > 0;
                return (
                  <div
                    className={`planilha-mobile-card${aberto ? " is-aberto" : ""}`}
                    data-faixa={faixa.id}
                    key={cardKey}
                  >
                    <button
                      type="button"
                      className="planilha-mobile-card-header"
                      aria-expanded={aberto}
                      onClick={() =>
                        setAbertos((prev) => {
                          const next = new Set(prev);
                          if (next.has(cardKey)) next.delete(cardKey);
                          else next.add(cardKey);
                          return next;
                        })
                      }
                    >
                      <span className="planilha-mobile-card-data">
                        {formatarData(dataObj.data, dataObj.turno, dataObj.descricao)}
                      </span>
                      <span className="planilha-mobile-card-meta">
                        {stats && (
                          <span
                            className={`planilha-louvor-preenchimento-badge ${completo ? "is-completo" : "is-incompleto"}`}
                          >
                            {stats.preenchidos}/{stats.total}
                          </span>
                        )}
                        <svg
                          className="planilha-mobile-card-chevron"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </span>
                    </button>
                    {aberto && (
                      <div className="planilha-mobile-card-body">
                        {funcoes.map((funcao) => {
                          const valorRaw = escalas[escalaKey(dataObj, funcao)];
                          const valor = valorRaw ? nomeParaExibicao(valorRaw) : "";
                          const destacar =
                            filtroAtivo &&
                            valor &&
                            valor.toLowerCase().includes(termoFiltro);
                          return (
                            <div className="planilha-mobile-funcao" key={funcao}>
                              <span className="planilha-mobile-funcao-label">{funcao}</span>
                              <CelulaSelect
                                variant="card"
                                faixaId={faixa.id}
                                dataObj={dataObj}
                                funcao={funcao}
                                valor={valor}
                                opcoes={getOpcoesSelect(dataObj, funcao)}
                                podeEditar={podeEditar}
                                salvando={salvando}
                                onChange={salvarCelula}
                                destacar={destacar}
                                filtroAtivo={filtroAtivo}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          );
        })}
        {salvando && (
          <div className="planilha-louvor-salvando" aria-live="polite">
            Salvando...
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="planilha-louvor-wrap planilha-louvor-wrap--empilhada">
      {faixas.map((faixa, faixaIdx) => {
        const colunas = faixa.colunas.map((dataObj, colIdx) => ({
          dataObj,
          colIdx,
        }));

        return (
          <Fragment key={faixa.id}>
            {faixaIdx > 0 && (
              <div className="planilha-bloco-divisoria" aria-hidden />
            )}
          <section
            className="planilha-louvor-bloco"
            data-faixa={faixa.id}
          >
            <h3 className="planilha-louvor-bloco-titulo">
              {faixa.id === "domingo-manha" ? (
                <svg
                  className="planilha-louvor-bloco-icone"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg
                  className="planilha-louvor-bloco-icone"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
              <span>{faixa.titulo}</span>
            </h3>
            <div className="planilha-louvor-bloco-corpo">
              <table className="planilha-louvor-table planilha-louvor-table--bloco">
                <colgroup>
                  <col className="planilha-louvor-col-funcao" />
                  {colunas.map(({ colIdx }) => (
                    <col key={colIdx} className="planilha-louvor-col-data" />
                  ))}
                </colgroup>
                <thead>
                  <tr className="planilha-louvor-datas-row">
                    <th
                      scope="col"
                      className="planilha-louvor-th-funcao planilha-louvor-th-funcao--bloco"
                      aria-label="Função"
                    />
                    {colunas.map(({ dataObj, colIdx }, idx) => {
                      if (!dataObj) {
                        return (
                          <th
                            key={`${faixa.id}-${colIdx}`}
                            scope="col"
                            data-faixa={faixa.id}
                            aria-hidden
                            className={[
                              "planilha-louvor-th-data",
                              "planilha-louvor-th-data--vazia",
                              idx === 0 ? "planilha-louvor-th-data--inicio-dados" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          />
                        );
                      }
                      return (
                        <th
                          key={`${faixa.id}-${colIdx}`}
                          scope="col"
                          data-faixa={faixa.id}
                          className={[
                            "planilha-louvor-th-data",
                            idx === 0 ? "planilha-louvor-th-data--inicio-dados" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <span
                            className="planilha-louvor-data-label"
                            title={formatarData(dataObj.data, dataObj.turno, dataObj.descricao)}
                          >
                            <svg
                              className="planilha-louvor-data-icone"
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                            >
                              <rect x="3" y="4" width="18" height="18" rx="2" />
                              <path d="M16 2v4M8 2v4M3 10h18" />
                            </svg>
                            {formatarCabecalhoData(dataObj)}
                          </span>
                        </th>
                      );
                    })}
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
                        <th
                          className={[
                            "planilha-louvor-td-funcao",
                            grupoCor ? `planilha-louvor-td-funcao--${grupoCor}` : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <span className="planilha-louvor-funcao-label">{funcao}</span>
                        </th>
                        {colunas.map(({ dataObj, colIdx }) => {
                          const valorRaw = dataObj
                            ? escalas[escalaKey(dataObj, funcao)]
                            : "";
                          const valor = valorRaw ? nomeParaExibicao(valorRaw) : "";
                          const destacar =
                            filtroAtivo &&
                            valor &&
                            valor.toLowerCase().includes(termoFiltro);
                          return (
                            <CelulaSelect
                              key={`${faixa.id}-${colIdx}-${funcao}`}
                              faixaId={faixa.id}
                              inicioFaixa={false}
                              dataObj={dataObj}
                              funcao={funcao}
                              valor={valor}
                              opcoes={getOpcoesSelect(dataObj, funcao)}
                              podeEditar={podeEditar}
                              salvando={salvando}
                              onChange={salvarCelula}
                              destacar={destacar}
                              filtroAtivo={filtroAtivo}
                            />
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="planilha-louvor-tfoot-row">
                    <th className="planilha-louvor-tfoot-label" scope="row">
                      Total
                    </th>
                    {colunas.map(({ dataObj, colIdx }) => {
                      if (!dataObj) {
                        return (
                          <td
                            key={`footer-${faixa.id}-${colIdx}`}
                            className="planilha-louvor-tfoot-celula planilha-louvor-tfoot-celula--vazia"
                            data-faixa={faixa.id}
                            aria-hidden
                          />
                        );
                      }
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
                          className="planilha-louvor-tfoot-celula"
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
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
          </Fragment>
        );
      })}
      {salvando && (
        <div className="planilha-louvor-salvando" aria-live="polite">
          Salvando...
        </div>
      )}
    </div>
  );
}
