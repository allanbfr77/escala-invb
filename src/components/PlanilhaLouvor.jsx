import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { db } from "../firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc } from "firebase/firestore";
import { funcoesPorMinisterio } from "../data/funcoes";
import { pessoasPorFuncaoLouvor } from "../data/pessoas";
import { formatarData } from "../utils/dateHelper";
import { chaveIndisponibilidadeColuna } from "../utils/indisponibilidadeHelpers";
import {
  montarFaixasPlanilhaLouvor,
  formatarCabecalhoData,
  COLUNAS_POR_FAIXA,
} from "../utils/planilhaLouvorLayout";
const MINISTERIO_ID = "louvor";

/** Grupo de cor do obreiro escalado (não da coluna de função). */
function grupoCorFuncao(funcao) {
  if (funcao === "MINISTRANTE") return "ministrante";
  if (funcao.startsWith("BVOCAL")) return "bvocal";
  if (funcao.startsWith("MÚSICO")) return "musico";
  return "";
}

const NOMES_MINISTERIOS = {
  comunicacao: "Comunicações",
  louvor: "Louvor",
  recepcao: "Introdução",
  infantil: "Infantil",
};

function turnoSalvo(dataObj) {
  return dataObj?.turno === "único" ? "único" : dataObj?.turno;
}

function escalaKey(dataObj, funcao) {
  const turno = turnoSalvo(dataObj);
  return `${dataObj.data}-${turno}-${funcao}`;
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

function getIntervaloMes(mes) {
  const [ano, mesNum] = mes.split("-");
  const inicio = `${ano}-${mesNum}-01`;
  const fim = `${ano}-${mesNum}-${new Date(Number(ano), Number(mesNum), 0).getDate()}`;
  return { inicio, fim };
}

const MENU_GAP = 4;
const MENU_MAX_HEIGHT = 280;
const MENU_FLIP_THRESHOLD = 160;

function calcularPosicaoMenu(triggerEl) {
  const rect = triggerEl.getBoundingClientRect();
  const espacoAbaixo = window.innerHeight - rect.bottom - MENU_GAP;
  const espacoAcima = rect.top - MENU_GAP;
  const abrirAcima =
    espacoAbaixo < MENU_FLIP_THRESHOLD && espacoAcima > espacoAbaixo;

  const maxHeight = Math.min(
    MENU_MAX_HEIGHT,
    Math.max(120, (abrirAcima ? espacoAcima : espacoAbaixo) - 8)
  );

  const base = {
    left: rect.left,
    width: Math.max(rect.width, 100),
    maxHeight,
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
}) {
  const [aberto, setAberto] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const labelCulto = dataObj
    ? formatarData(dataObj.data, dataObj.turno, dataObj.descricao)
    : "";

  const atualizarPosicaoMenu = useCallback(() => {
    if (!triggerRef.current) return;
    setMenuPos(calcularPosicaoMenu(triggerRef.current));
  }, []);

  const abrirMenu = useCallback(() => {
    if (!triggerRef.current) return;
    setMenuPos(calcularPosicaoMenu(triggerRef.current));
    setAberto(true);
  }, []);

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

  const grupoCor = grupoCorFuncao(funcao);

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

  const valorClass = valor
    ? `planilha-louvor-select-valor--${grupoCor}`
    : "planilha-louvor-select-valor--vazio";

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
          maxHeight: menuPos.maxHeight,
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
                valor === nome ? " is-selected" : ""
              }`}
              onClick={() => escolher(nome)}
            >
              {nome}
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
        <button
          ref={triggerRef}
          type="button"
          className={`planilha-louvor-select-trigger${
            aberto && menuPos?.placement === "above"
              ? " planilha-louvor-select-trigger--dropup"
              : ""
          }`}
          disabled={desabilitado}
          aria-expanded={aberto}
          aria-haspopup="listbox"
          aria-label={`${funcao} em ${labelCulto}`}
          onClick={() => {
            if (desabilitado) return;
            if (aberto) fecharMenu();
            else abrirMenu();
          }}
        >
          <span className={`planilha-louvor-select-valor ${valorClass}`}>
            {valor || "—"}
          </span>
          <span className="planilha-louvor-select-chevron" aria-hidden>
            ▾
          </span>
        </button>
      </div>
      {listaPortal}
    </td>
  );
}

export default function PlanilhaLouvor({
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
  const funcoes = funcoesPorMinisterio.louvor;
  const [salvando, setSalvando] = useState(false);
  const [indispMap, setIndispMap] = useState({});
  const [ocupacaoPorCulto, setOcupacaoPorCulto] = useState(new Map());

  const { faixas } = useMemo(() => montarFaixasPlanilhaLouvor(datas), [datas]);

  const largurasGrid = useMemo(() => {
    const flat = faixas.flatMap((f) => f.colunas);
    const vazias = flat.filter((c) => !c).length;
    const comData = flat.filter(Boolean).length;
    const pctFuncao = 7;
    const pctVazia = 0.12;
    const pctData =
      comData > 0 ? (100 - pctFuncao - vazias * pctVazia) / comData : 6;
    return { pctFuncao, pctVazia, pctData };
  }, [faixas]);

  useEffect(() => {
    let cancelled = false;
    getDocs(
      query(collection(db, "indisponibilidades"), where("ministerioId", "==", MINISTERIO_ID))
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
      .catch((err) => console.error("PlanilhaLouvor: indisponibilidades", err));
    return () => {
      cancelled = true;
    };
  }, [indispRefreshKey]);

  useEffect(() => {
    if (!mes) return;
    let cancelled = false;
    const { inicio, fim } = getIntervaloMes(mes);

    getDocs(
      query(collection(db, "escalas"), where("data", ">=", inicio), where("data", "<=", fim))
    )
      .then((snap) => {
        if (cancelled) return;
        const mapa = new Map();
        snap.docs.forEach((docSnap) => {
          const d = docSnap.data();
          const turno = d.turno || "único";
          const chave = `${d.data}|${turno}`;
          if (!mapa.has(chave)) mapa.set(chave, []);
          mapa.get(chave).push({
            pessoaNome: d.pessoaNome,
            ministerioId: d.ministerioId,
            funcao: d.funcao,
          });
        });
        setOcupacaoPorCulto(mapa);
      })
      .catch((err) => console.error("PlanilhaLouvor: ocupação", err));

    return () => {
      cancelled = true;
    };
  }, [mes, escalas, indispRefreshKey]);

  const pessoaIndisponivel = useCallback(
    (pessoa, dataObj) => {
      const set = indispMap[pessoa.toLowerCase()];
      if (!set?.size || !dataObj) return false;
      return set.has(chaveIndisponibilidadeColuna(dataObj));
    },
    [indispMap]
  );

  const pessoaOcupadaNoCulto = useCallback(
    (pessoa, dataObj, funcaoAtual) => {
      if (!dataObj) return false;
      const turno = turnoSalvo(dataObj);
      const chave = `${dataObj.data}|${turno}`;
      const alocacoes = ocupacaoPorCulto.get(chave) || [];
      const pl = pessoa.toLowerCase();

      return alocacoes.some((a) => {
        if (a.pessoaNome !== pl) return false;
        if (a.ministerioId !== MINISTERIO_ID) return true;
        return a.funcao !== funcaoAtual;
      });
    },
    [ocupacaoPorCulto]
  );

  const getOpcoesSelect = useCallback(
    (dataObj, funcao) => {
      if (!dataObj) return [];
      const qualificados = pessoasPorFuncaoLouvor[funcao] || [];
      const atual = escalas[escalaKey(dataObj, funcao)];
      const atualUpper = atual && atual !== "disponível" ? atual.toUpperCase() : null;

      const filtrados = qualificados.filter((nome) => {
        if (pessoaIndisponivel(nome, dataObj)) return false;
        if (pessoaOcupadaNoCulto(nome, dataObj, funcao)) return false;
        return true;
      });
      if (atualUpper && !filtrados.includes(atualUpper)) {
        return [...filtrados, atualUpper];
      }
      return filtrados;
    },
    [escalas, pessoaIndisponivel, pessoaOcupadaNoCulto]
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
      const pessoaLower = valorBruto ? valorBruto.toLowerCase() : "";

      if (!valorBruto && !valorAnterior) return;
      if (pessoaLower === valorAnterior) return;

      setSalvando(true);
      try {
        const qFuncao = query(
          collection(db, "escalas"),
          where("ministerioId", "==", MINISTERIO_ID),
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

        const qConflito = query(
          collection(db, "escalas"),
          where("pessoaNome", "==", pessoaLower),
          where("data", "==", dataObj.data),
          where("turno", "==", turno)
        );
        const snapConflito = await getDocs(qConflito);
        const conflitoOutro = snapConflito.docs.find(
          (d) => d.data().ministerioId !== MINISTERIO_ID
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

        const mesmaPessoaLouvor = snapConflito.docs.filter(
          (d) =>
            d.data().ministerioId === MINISTERIO_ID && d.data().funcao !== funcao
        );
        for (const docSnap of mesmaPessoaLouvor) await deleteDoc(docSnap.ref);

        const { horaInicio, horaFim } = getHorarios(dataObj);
        await addDoc(collection(db, "escalas"), {
          pessoaNome: pessoaLower,
          funcao,
          ministerioId: MINISTERIO_ID,
          data: dataObj.data,
          turno,
          horaInicio,
          horaFim,
          criadoPor: usuario.uid,
          criadoPorEmail: usuario.email,
          criadoEm: new Date().toISOString(),
        });

        onMensagem?.(`${valorBruto.toUpperCase()} — ${funcao}`, "sucesso");
      } catch (err) {
        console.error(err);
        onMensagem?.("Erro ao salvar escala", "erro");
      } finally {
        setSalvando(false);
      }
    },
    [escalas, podeEditar, usuario, onMensagem, onConflito]
  );

  if (loading && (!datas || datas.length === 0)) {
    return (
      <div className="planilha-louvor-loading">
        Carregando planilha de louvor...
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
            <th rowSpan={2} className="planilha-louvor-th-funcao">
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
          {funcoes.map((funcao, rowIdx) => (
            <tr
              key={funcao}
              className="planilha-louvor-row"
              style={{ background: rowIdx % 2 === 0 ? "transparent" : "var(--row-zebra)" }}
            >
              <th className="planilha-louvor-td-funcao">{funcao}</th>
              {faixas.map((faixa) =>
                faixa.colunas.map((dataObj, colIdx) => {
                  const valorRaw = dataObj ? escalas[escalaKey(dataObj, funcao)] : null;
                  const valor =
                    valorRaw && valorRaw !== "disponível" ? valorRaw.toUpperCase() : "";
                  return (
                    <CelulaSelect
                      key={`${faixa.id}-${colIdx}-${funcao}`}
                      faixaId={faixa.id}
                      inicioFaixa={colIdx === 0 && faixa.id !== "domingo-manha"}
                      dataObj={dataObj}
                      funcao={funcao}
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
          ))}
        </tbody>
      </table>
      {salvando && (
        <div className="planilha-louvor-salvando" aria-live="polite">
          Salvando...
        </div>
      )}
    </div>
  );
}
