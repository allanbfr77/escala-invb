import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { IconeMinisterio } from "../utils/ministerioIcons";
import TurnoLabelInline from "../components/TurnoLabelInline";
import { db } from "../firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc } from "firebase/firestore";
import { pessoasPorMinisterio } from "../data/pessoas";
import { formatarData } from "../utils/dateHelper";
import {
  abrevParaFuncao,
  abreviacoesValidas,
  formatarCabecalhoColuna,
  getCorAbrev,
  getTooltipAbrev,
  getTooltipAbrevCombinadas,
  parseAbreviacoesCombinadas,
  formatarAbreviacoesCombinadas,
  buildCellsFromEscalas,
} from "../utils/gridAbreviacoes";
import AbrevBadge from "../components/AbrevBadge";
import { estaIndisponivelTodoMesFromSet } from "../utils/indisponibilidadeHelpers";
import { getAbreviacoesPermitidasPessoa } from "../utils/permissoesMinisterio";
import { ministerioPermiteEscalaFlexivel } from "../utils/regrasMinisterio";

const NOMES_MINISTERIOS = {
  comunicacao: "Comunicações",
  louvor: "Louvor",
  recepcao: "Introdução",
  infantil: "Infantil",
};

const CELULA_VAZIA_BG = "var(--date-cell-bg)";
const CELULA_ATIVA_BG = "var(--row-hover)";
const CELULA_BLOQUEADA_BG = "var(--grid-cell-blocked)";
const CELULA_INDISPONIVEL_BG = "var(--grid-cell-indisponivel)";
const CELULA_ALTURA = 32;
const CELULA_PADDING = "6px 4px";

const estiloConteudoCelula = {
  width: "100%",
  minWidth: "64px",
  height: `${CELULA_ALTURA}px`,
  minHeight: `${CELULA_ALTURA}px`,
  maxHeight: `${CELULA_ALTURA}px`,
  boxSizing: "border-box",
  padding: CELULA_PADDING,
  fontSize: "14px",
  textAlign: "center",
  fontFamily: "'JetBrains Mono', monospace",
  lineHeight: 1,
};

function cellKey(pessoa, colId) {
  return `${pessoa.toLowerCase()}|${colId}`;
}

function lookupCelula(pessoa, dataObj) {
  const turno = dataObj.turno ?? "único";
  return `${pessoa.toLowerCase()}|${dataObj.data}|${turno}`;
}

function getIntervaloMes(mes) {
  const [ano, mesNum] = mes.split("-");
  const inicio = `${ano}-${mesNum}-01`;
  const fim = `${ano}-${mesNum}-${new Date(Number(ano), Number(mesNum), 0).getDate()}`;
  return { inicio, fim };
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

/**
 * Siglas para exibir na célula (somente visual).
 * Comunicação: separa "PS"/"PST" em letras; demais: uma sigla.
 */
function abrevsParaExibicaoCelula(ministerioId, valor) {
  if (valor == null || valor === "") return [];

  const texto = String(valor).trim().toUpperCase();
  if (!texto) return [];

  if (!ministerioPermiteEscalaFlexivel(ministerioId)) {
    return parseAbreviacoesCombinadas(ministerioId, texto);
  }

  const validasSet = new Set(abreviacoesValidas(ministerioId));
  const visto = new Set();

  for (const ch of texto.split("")) {
    if (!ch || !validasSet.has(ch) || visto.has(ch)) continue;
    visto.add(ch);
  }

  return abreviacoesValidas(ministerioId).filter((a) => visto.has(a));
}

function CelulaAbrevBadges({ ministerioId, valor }) {
  const abrevs = abrevsParaExibicaoCelula(ministerioId, valor);
  if (!abrevs?.length) return null;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "3px",
        flexWrap: "wrap",
      }}
    >
      {abrevs.map((abrev) =>
        abrev ? (
          <AbrevBadge
            key={abrev}
            ministerioId={ministerioId}
            abrev={abrev}
            variant="cell"
          />
        ) : null
      )}
    </span>
  );
}

function renderCabecalhoColunaColorido(dataObj) {
  const cabecalho = formatarCabecalhoColuna(dataObj);

  if (dataObj.turno !== "manhã" && dataObj.turno !== "noite") {
    return cabecalho;
  }

  const cabecalhoBase = cabecalho.replace(/\s+\(([MN])\)$/, "");

  return <TurnoLabelInline label={cabecalhoBase} turno={dataObj.turno} title={cabecalho} />;
}

export default function DashboardGrid({
  ministerioId,
  mes,
  datas,
  escalas,
  loading,
  usuario,
  podeEditar,
  onMensagem,
  onConflito,
  indispRefreshKey = 0,
  isExternalDetectionEnabled = false,
}) {
  const pessoas = pessoasPorMinisterio[ministerioId] || [];
  const pessoasLowerSet = useMemo(
    () => new Set(pessoas.map((p) => p.toLowerCase())),
    [pessoas]
  );
  const validas = useMemo(() => abreviacoesValidas(ministerioId), [ministerioId]);
  const escalaFlexivel = ministerioPermiteEscalaFlexivel(ministerioId);
  const getValidasPessoa = useCallback(
    (pessoa) => getAbreviacoesPermitidasPessoa(ministerioId, pessoa),
    [ministerioId]
  );

  const [cells, setCells] = useState({});
  const [indispMap, setIndispMap] = useState(() => new Set());
  const [outroMinisterioMap, setOutroMinisterioMap] = useState(() => new Map());
  const [editingKey, setEditingKey] = useState(null);
  const [celulaAtiva, setCelulaAtiva] = useState(null);
  const [draft, setDraft] = useState("");
  const [salvando, setSalvando] = useState(false);
  const editingRef = useRef(null);
  const skipBlurRef = useRef(false);
  const externalDetectionRef = useRef(isExternalDetectionEnabled);
  const externalFetchGenRef = useRef(0);

  useEffect(() => {
    externalDetectionRef.current = isExternalDetectionEnabled;
    if (!isExternalDetectionEnabled) {
      externalFetchGenRef.current += 1;
      setOutroMinisterioMap(new Map());
    }
  }, [isExternalDetectionEnabled]);

  useEffect(() => {
    if (!ministerioId) return;
    let cancelled = false;

    getDocs(query(
      collection(db, "indisponibilidades"),
      where("ministerioId", "==", ministerioId)
    ))
      .then((indispSnap) => {
        if (cancelled) return;

        const indisp = new Set();
        indispSnap.docs.forEach((docSnap) => {
          const { pessoaNome, datas: datasIndisp = [] } = docSnap.data();
          if (!pessoaNome) return;
          const pl = pessoaNome.toLowerCase();
          datasIndisp.forEach((chave) => {
            const [data, turno = "único"] = chave.split("|");
            if (data) indisp.add(`${pl}|${data}|${turno}`);
          });
        });

        setIndispMap(indisp);
      })
      .catch((err) => console.error("Erro ao carregar indisponibilidades da planilha:", err));

    return () => { cancelled = true; };
  }, [ministerioId, indispRefreshKey]);

  useEffect(() => {
    if (!isExternalDetectionEnabled) return;
    if (!ministerioId || !mes) return;

    let cancelled = false;
    const fetchGen = ++externalFetchGenRef.current;
    const { inicio, fim } = getIntervaloMes(mes);

    getDocs(query(
      collection(db, "escalas"),
      where("data", ">=", inicio),
      where("data", "<=", fim)
    ))
      .then((escalasSnap) => {
        if (
          cancelled
          || !externalDetectionRef.current
          || fetchGen !== externalFetchGenRef.current
        ) return;

        const outro = new Map();
        escalasSnap.docs.forEach((docSnap) => {
          const d = docSnap.data();
          if (d.ministerioId === ministerioId) return;
          if (!pessoasLowerSet.has(d.pessoaNome)) return;
          const turno = d.turno || "único";
          outro.set(`${d.pessoaNome}|${d.data}|${turno}`, d.ministerioId);
        });

        if (
          cancelled
          || !externalDetectionRef.current
          || fetchGen !== externalFetchGenRef.current
        ) return;

        setOutroMinisterioMap(outro);
      })
      .catch((err) => console.error("Erro ao carregar escalas externas da planilha:", err));

    return () => { cancelled = true; };
  }, [isExternalDetectionEnabled, ministerioId, mes, pessoasLowerSet, indispRefreshKey]);

  const isIndisponivel = useCallback(
    (pessoa, dataObj) => indispMap.has(lookupCelula(pessoa, dataObj)),
    [indispMap]
  );

  const getOutroMinisterio = useCallback(
    (pessoa, dataObj) => {
      if (!isExternalDetectionEnabled) return null;
      return outroMinisterioMap.get(lookupCelula(pessoa, dataObj)) ?? null;
    },
    [isExternalDetectionEnabled, outroMinisterioMap]
  );

  const pessoasVisiveis = useMemo(
    () =>
      pessoas.filter((p) => !estaIndisponivelTodoMesFromSet(p, datas, indispMap)),
    [pessoas, datas, indispMap]
  );

  useEffect(() => {
    editingRef.current = editingKey;
  }, [editingKey]);

  useEffect(() => {
    if (editingRef.current) return;
    setCells(buildCellsFromEscalas(escalas, datas, ministerioId));
  }, [escalas, datas, ministerioId]);

  const turnoSalvo = (dataObj) => (dataObj.turno === "único" ? "único" : dataObj.turno);

  const salvarCelula = useCallback(
    async (pessoa, dataObj, valorBruto) => {
      if (!podeEditar) {
        onMensagem?.("Você só pode editar seu próprio ministério", "erro");
        return false;
      }

      const key = cellKey(pessoa, dataObj.id);
      const valorAnterior = cells[key] || "";
      const valor = valorBruto.trim().toUpperCase();

      if (valor === valorAnterior) return true;

      setSalvando(true);
      const turno = turnoSalvo(dataObj);
      const pessoaLower = pessoa.toLowerCase();
      const validasPessoa = getValidasPessoa(pessoa);

      try {
        if (!valor) {
          const q = query(
            collection(db, "escalas"),
            where("ministerioId", "==", ministerioId),
            where("pessoaNome", "==", pessoaLower),
            where("data", "==", dataObj.data),
            where("turno", "==", turno)
          );
          const snap = await getDocs(q);
          for (const docSnap of snap.docs) await deleteDoc(docSnap.ref);
          setCells((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
          onMensagem?.("Escala removida", "sucesso");
          return true;
        }

        const abrevs = parseAbreviacoesCombinadas(ministerioId, valor);
        if (
          !abrevs.length ||
          !abrevs.every((a) => validasPessoa.includes(a))
        ) {
          const sugestao = validasPessoa.length
            ? escalaFlexivel
              ? `Combine: ${validasPessoa.join("")} (ex.: PS, PT, PST)`
              : `Use: ${validasPessoa.join(", ")}`
            : `${pessoa} não possui funções permitidas nesta planilha`;
          onMensagem?.(
            `Abreviação inválida para ${pessoa}. ${sugestao}`,
            "erro"
          );
          return false;
        }

        const funcoesAlvo = abrevs
          .map((a) => abrevParaFuncao(ministerioId, a))
          .filter(Boolean);

        const qPessoa = query(
          collection(db, "escalas"),
          where("pessoaNome", "==", pessoaLower),
          where("data", "==", dataObj.data),
          where("turno", "==", turno)
        );
        const snapPessoa = await getDocs(qPessoa);

        if (!escalaFlexivel) {
          const conflitoOutro = snapPessoa.docs.find(
            (d) => d.data().ministerioId !== ministerioId
          );
          if (conflitoOutro) {
            const dd = conflitoOutro.data();
            onConflito?.({
              pessoa,
              data: formatarData(dataObj.data, dataObj.turno, dataObj.descricao),
              ministerio: NOMES_MINISTERIOS[dd.ministerioId] || dd.ministerioId,
              funcao: dd.funcao,
            });
            return false;
          }

          const funcao = funcoesAlvo[0];
          const mesmaPessoaOutraFuncao = snapPessoa.docs.filter(
            (d) =>
              d.data().ministerioId === ministerioId && d.data().funcao !== funcao
          );
          for (const docSnap of mesmaPessoaOutraFuncao) {
            await deleteDoc(docSnap.ref);
          }

          const qFuncao = query(
            collection(db, "escalas"),
            where("ministerioId", "==", ministerioId),
            where("data", "==", dataObj.data),
            where("funcao", "==", funcao),
            where("turno", "==", turno)
          );
          const snapFuncao = await getDocs(qFuncao);
          for (const docSnap of snapFuncao.docs) await deleteDoc(docSnap.ref);

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

          setCells((prev) => ({ ...prev, [key]: abrevs[0] }));
          onMensagem?.(`${pessoa} — ${funcao}`, "sucesso");
          return true;
        }

        const docsMesmoMinisterio = snapPessoa.docs.filter(
          (d) => d.data().ministerioId === ministerioId
        );
        for (const docSnap of docsMesmoMinisterio) {
          if (!funcoesAlvo.includes(docSnap.data().funcao)) {
            await deleteDoc(docSnap.ref);
          }
        }

        const { horaInicio, horaFim } = getHorarios(dataObj);
        for (const funcao of funcoesAlvo) {
          const qFuncao = query(
            collection(db, "escalas"),
            where("ministerioId", "==", ministerioId),
            where("data", "==", dataObj.data),
            where("funcao", "==", funcao),
            where("turno", "==", turno)
          );
          const snapFuncao = await getDocs(qFuncao);
          for (const docSnap of snapFuncao.docs) await deleteDoc(docSnap.ref);

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
        }

        const valorCelula = formatarAbreviacoesCombinadas(ministerioId, abrevs);
        setCells((prev) => ({ ...prev, [key]: valorCelula }));
        onMensagem?.(
          `${pessoa} — ${funcoesAlvo.join(", ")}`,
          "sucesso"
        );
        return true;
      } catch (err) {
        console.error(err);
        onMensagem?.("Erro ao salvar escala", "erro");
        return false;
      } finally {
        setSalvando(false);
      }
    },
    [cells, escalaFlexivel, getValidasPessoa, ministerioId, podeEditar, usuario, onMensagem, onConflito]
  );

  const iniciarEdicao = (pessoa, dataObj) => {
    if (!podeEditar || salvando) return;
    const key = cellKey(pessoa, dataObj.id);
    const validasPessoa = getValidasPessoa(pessoa);
    if (!cells[key] && isIndisponivel(pessoa, dataObj)) return;
    if (
      !cells[key] &&
      !escalaFlexivel &&
      isExternalDetectionEnabled &&
      getOutroMinisterio(pessoa, dataObj)
    ) {
      return;
    }
    if (!cells[key] && validasPessoa.length === 0) return;
    setCelulaAtiva({ pessoa, colId: dataObj.id });
    setEditingKey(key);
    setDraft(cells[key] || "");
  };

  const confirmarEdicao = async (pessoa, dataObj) => {
    const key = cellKey(pessoa, dataObj.id);
    if (editingKey !== key) return;
    const ok = await salvarCelula(pessoa, dataObj, draft);
    setEditingKey(null);
    setDraft("");
    setCelulaAtiva(null);
    if (!ok) skipBlurRef.current = false;
  };

  const cancelarEdicao = () => {
    setEditingKey(null);
    setDraft("");
    setCelulaAtiva(null);
  };

  const linhaAtiva = (pessoa) => celulaAtiva?.pessoa === pessoa;
  const colunaAtiva = (colId) => celulaAtiva?.colId === colId;

  const corCelula = (abrev) => getCorAbrev(ministerioId, abrev);

  if (loading && datas.length === 0) {
    return (
      <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px", fontFamily: "'Outfit', sans-serif" }}>
        Carregando planilha...
      </div>
    );
  }

  if (!datas.length) {
    return (
      <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px", fontFamily: "'Outfit', sans-serif" }}>
        Nenhuma data disponível para este mês
      </div>
    );
  }

  return (
    <div className="dashboard-grid-wrap">
      <div
        className="dashboard-grid-scroll"
        style={{
          overflowX: "auto",
          borderRadius: "10px",
          border: "1px solid var(--border)",
          background: "var(--bg)",
        }}
      >
        <table
          className="dashboard-grid-table"
          style={{
            borderCollapse: "collapse",
            width: "max-content",
            minWidth: "100%",
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          <thead>
            <tr>
              <th
                className="dashboard-grid-name-col"
                style={{
                  position: "sticky",
                  left: 0,
                  zIndex: 3,
                  width: "140px",
                  minWidth: "140px",
                  maxWidth: "140px",
                  padding: "8px 10px",
                  textAlign: "left",
                  fontSize: "9px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "var(--text-muted)",
                  background: "var(--bg)",
                  borderBottom: "1px solid var(--border)",
                  borderRight: "1px solid var(--border)",
                }}
              >
                OBREIRO(A)
              </th>
              {datas.map((dataObj) => (
                <th
                  key={dataObj.id}
                  data-col-id={dataObj.id}
                  title={formatarData(dataObj.data, dataObj.turno, dataObj.descricao)}
                  style={{
                    padding: "6px 4px",
                    minWidth: "72px",
                    maxWidth: "88px",
                    fontSize: "9px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.35px",
                    textAlign: "center",
                    color: "var(--text-muted)",
                    background: colunaAtiva(dataObj.id) ? CELULA_ATIVA_BG : "var(--bg)",
                    borderBottom: "1px solid var(--border)",
                    borderRight: "1px solid var(--border)",
                    lineHeight: 1.25,
                    whiteSpace: "normal",
                  }}
                >
                  {renderCabecalhoColunaColorido(dataObj)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pessoasVisiveis.map((pessoa) => (
              <tr key={pessoa}>
                <td
                  className="dashboard-grid-name-col"
                  style={{
                    position: "sticky",
                    left: 0,
                    zIndex: 2,
                    width: "140px",
                    minWidth: "140px",
                    maxWidth: "140px",
                    padding: "6px 10px",
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "var(--text)",
                    textAlign: "left",
                    background: linhaAtiva(pessoa) ? CELULA_ATIVA_BG : "var(--bg)",
                    borderRight: "1px solid var(--border)",
                    borderBottom: "1px solid var(--border)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {pessoa}
                </td>
                {datas.map((dataObj) => {
                  const key = cellKey(pessoa, dataObj.id);
                  const isEditing = editingKey === key;
                  const isAtiva = celulaAtiva?.pessoa === pessoa && celulaAtiva?.colId === dataObj.id;
                  const valorBruto = cells[key];
                  const valor =
                    valorBruto != null && valorBruto !== ""
                      ? String(valorBruto).trim()
                      : "";
                  const validasPessoa = getValidasPessoa(pessoa) ?? [];
                  const semFuncaoPermitida = validasPessoa.length === 0;
                  const vazio = !valor && !isEditing;
                  const indisponivel = vazio && isIndisponivel(pessoa, dataObj);
                  const outroMinisterioId =
                    isExternalDetectionEnabled && vazio
                      ? getOutroMinisterio(pessoa, dataObj)
                      : null;
                  const celulaBloqueada =
                    indisponivel || (!escalaFlexivel && !!outroMinisterioId);
                  const tooltip = valor
                    ? getTooltipAbrevCombinadas(ministerioId, valor) ||
                      abrevsParaExibicaoCelula(ministerioId, valor)
                        .map((a) => getTooltipAbrev(ministerioId, a))
                        .filter(Boolean)
                        .join(" · ")
                    : indisponivel
                      ? "Indisponível nesta data"
                      : outroMinisterioId
                        ? `Escalado(a) em ${NOMES_MINISTERIOS[outroMinisterioId] || outroMinisterioId}`
                        : semFuncaoPermitida
                          ? `${pessoa} não pode ser escalado(a) nas funções deste ministério`
                          : validasPessoa.length
                            ? `Abreviações permitidas: ${validasPessoa.join(", ")}`
                        : "";

                  const bgCelula = isAtiva
                    ? CELULA_ATIVA_BG
                    : colunaAtiva(dataObj.id) || linhaAtiva(pessoa)
                      ? CELULA_ATIVA_BG
                      : indisponivel
                        ? CELULA_INDISPONIVEL_BG
                        : celulaBloqueada
                          ? CELULA_BLOQUEADA_BG
                          : CELULA_VAZIA_BG;

                  return (
                    <td
                      key={dataObj.id}
                      data-col-id={dataObj.id}
                      style={{
                        padding: 0,
                        height: `${CELULA_ALTURA}px`,
                        minHeight: `${CELULA_ALTURA}px`,
                        maxHeight: `${CELULA_ALTURA}px`,
                        verticalAlign: "middle",
                        borderRight: "1px solid var(--border)",
                        borderBottom: "1px solid var(--border)",
                        background: bgCelula,
                        boxShadow: isEditing ? "inset 0 0 0 1px var(--accent)" : undefined,
                      }}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={draft}
                          onChange={(e) => setDraft(e.target.value.toUpperCase())}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              skipBlurRef.current = true;
                              confirmarEdicao(pessoa, dataObj);
                            }
                            if (e.key === "Escape") {
                              skipBlurRef.current = true;
                              cancelarEdicao();
                            }
                          }}
                          onBlur={() => {
                            if (skipBlurRef.current) {
                              skipBlurRef.current = false;
                              return;
                            }
                            confirmarEdicao(pessoa, dataObj);
                          }}
                          autoFocus
                          disabled={salvando}
                          style={{
                            ...estiloConteudoCelula,
                            display: "block",
                            border: "none",
                            outline: "none",
                            margin: 0,
                            background: "transparent",
                            color:
                              corCelula(
                                abrevsParaExibicaoCelula(ministerioId, draft)[0] || draft
                              ) || "var(--text)",
                            fontWeight: 700,
                          }}
                        />
                      ) : celulaBloqueada ? (
                        <div
                          title={tooltip}
                          style={{
                            ...estiloConteudoCelula,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "default",
                          }}
                        >
                          {outroMinisterioId && (
                            <IconeMinisterio ministerioId={outroMinisterioId} size={14} />
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="dashboard-grid-cell-btn"
                          onClick={() => iniciarEdicao(pessoa, dataObj)}
                          disabled={!podeEditar || salvando || (!valor && semFuncaoPermitida)}
                          title={
                            tooltip ||
                            (podeEditar
                              ? (validasPessoa.length
                                ? `Abreviações: ${validasPessoa.join(", ")}`
                                : `${pessoa} não pode ser escalado(a) nas funções deste ministério`)
                              : "Somente leitura")
                          }
                          style={{
                            ...estiloConteudoCelula,
                            border: "none",
                            background: "transparent",
                            color: "transparent",
                            fontWeight: valor ? 700 : 400,
                            cursor: podeEditar && !salvando && !(!valor && semFuncaoPermitida) ? "text" : "default",
                            opacity: !podeEditar || (!valor && semFuncaoPermitida) ? 0.85 : 1,
                          }}
                        >
                          <CelulaAbrevBadges ministerioId={ministerioId} valor={valor} />
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {podeEditar && (
        <div
          style={{
            marginTop: "10px",
            fontSize: "10px",
            color: "var(--text-muted)",
            fontFamily: "'Outfit', sans-serif",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "6px 12px",
          }}
        >
          <span style={{ marginRight: "4px" }}>Abreviações:</span>
          {validas.map((abrev) => {
            const nome = getTooltipAbrev(ministerioId, abrev);
            return (
              <span
                key={abrev}
                style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
              >
                <AbrevBadge ministerioId={ministerioId} abrev={abrev} variant="legend" />
                <span style={{ color: "var(--text-dim)" }}>=</span>
                <span>{nome}</span>
              </span>
            );
          })}
          {escalaFlexivel && (
            <span style={{ color: "var(--text-dim)" }}>
              Combine siglas na mesma célula (ex.: PS, PT, PST)
            </span>
          )}
          <span style={{ color: "var(--text-dim)", marginLeft: "4px" }}>
            — Enter ou sair da célula para salvar
          </span>
        </div>
      )}

      <style>{`
        .dashboard-grid-wrap .dashboard-grid-name-col {
          box-shadow: 2px 0 6px rgba(0,0,0,0.06);
        }
      `}</style>
    </div>
  );
}
