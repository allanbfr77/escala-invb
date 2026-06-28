import { gerarDatasEscala } from "./dateHelper";
import { funcoesPorMinisterio } from "../data/funcoes";
import { pessoasPorMinisterio } from "../data/pessoas";
import { chaveIndisponibilidadeColuna, estaIndisponivelTodoMes } from "./indisponibilidadeHelpers";
import { turnoSalvoEscala } from "./escalaDisponibilidade";
import { canonicalizarFuncaoEscala } from "./gridAbreviacoes";
import { pessoaNomeFirestore } from "./nomeExibicao";

export const MINISTERIOS_IDS = ["comunicacao", "louvor", "recepcao", "infantil"];

export const MINISTERIOS_INFO = {
  comunicacao: { nome: "Comunicações", color: "#60a5fa" },
  louvor: { nome: "Louvor", color: "#e8c766" },
  recepcao: { nome: "Introdução", color: "#34d399" },
  infantil: { nome: "Infantil", color: "#f472b6" },
};

/** Agrupa slots numerados (BVOCAL 1…4, MÚSICO 1…4, INTRODUTOR(A) 1…3) para exibição. */
export function obterGrupoFuncaoExibicao(funcao) {
  const match = String(funcao).match(/^(.+?) \d+$/);
  return match ? match[1] : funcao;
}

export function agruparContagensPorFuncao(funcoes, porFuncao) {
  const grupos = new Map();
  const ordem = [];

  for (const f of funcoes || []) {
    const grupo = obterGrupoFuncaoExibicao(f);
    if (!grupos.has(grupo)) {
      grupos.set(grupo, 0);
      ordem.push(grupo);
    }
    grupos.set(grupo, grupos.get(grupo) + (porFuncao?.[f] || 0));
  }

  return ordem
    .map((funcao) => ({ funcao, count: grupos.get(funcao) }))
    .filter((g) => g.count > 0);
}

const TURNO_ORDER = { manhã: 0, único: 1, noite: 2 };
/** Alerta de sobrecarga quando a pessoa está em mais de 50% dos cultos do mês */
const SOBRECARGA_PERCENTUAL = 0.5;

/** Pastores excluídos do relatório geral (não aparecem em nenhuma seção) */
const PESSOAS_EXCLUIDAS_RELATORIO_GERAL = new Set([
  "pr. marcio",
  "pr. humberto",
]);

function isExcluidaRelatorioGeral(pessoaNome) {
  if (!pessoaNome || pessoaNome === "disponível") return false;
  return PESSOAS_EXCLUIDAS_RELATORIO_GERAL.has(String(pessoaNome).toLowerCase());
}

/** ID canônico da pessoa (minúsculas, aliases unificados) para cruzamento global. */
function idPessoaRelatorio(pessoaNome) {
  if (!pessoaNome || pessoaNome === "disponível") return null;
  if (isExcluidaRelatorioGeral(pessoaNome)) return null;
  return pessoaNomeFirestore(pessoaNome);
}

const CATEGORIAS_TURNO_DIA = [
  {
    id: "quarta",
    label: "nenhuma QUARTA-FEIRA",
    test: (d) => d.tipo === "quarta" || getDiaSemana(d.data) === 3,
  },
  {
    id: "domingo-manha",
    label: "nenhum DOMINGO (MANHÃ)",
    test: (d) =>
      (d.tipo === "domingo" || getDiaSemana(d.data) === 0) && d.turno === "manhã",
  },
  {
    id: "domingo-noite",
    label: "nenhum DOMINGO (NOITE)",
    test: (d) =>
      (d.tipo === "domingo" || getDiaSemana(d.data) === 0) && d.turno === "noite",
  },
];

function getDiaSemana(dataStr) {
  const [ano, mes, dia] = dataStr.split("-").map(Number);
  return new Date(ano, mes - 1, dia).getDay();
}

export function getIntervaloMes(mes) {
  const [ano, mesNum] = mes.split("-");
  const inicio = `${ano}-${mesNum}-01`;
  const fim = `${ano}-${mesNum}-${new Date(Number(ano), Number(mesNum), 0).getDate()}`;
  return { inicio, fim };
}

function montarDatasMinisterio(mes, cultosExtrasDocs) {
  const geradas = gerarDatasEscala(mes);
  const extrasFormatted = (cultosExtrasDocs || [])
    .filter((e) => {
      if (!e?.data) return false;
      const mesDoDocumento = e.mes || String(e.data).slice(0, 7);
      return mesDoDocumento === mes;
    })
    .map((e) => ({
      id: `${e.data}-extra-${e.turno ?? "único"}`,
      data: e.data,
      tipo: "extra",
      turno: e.turno ?? "único",
      descricao: e.nome || e.descricao || "",
    }));

  return [...geradas, ...extrasFormatted].sort((a, b) => {
    if (a.data !== b.data) return a.data.localeCompare(b.data);
    return (TURNO_ORDER[a.turno] ?? 1) - (TURNO_ORDER[b.turno] ?? 1);
  });
}

function montarEscalasPorMinisterio(escalasDocs) {
  const porMinisterio = {};
  for (const mid of MINISTERIOS_IDS) {
    porMinisterio[mid] = {};
  }

  for (const d of escalasDocs) {
    const mid = d.ministerioId;
    if (!porMinisterio[mid]) continue;
    const turnoKey = turnoSalvoEscala({ turno: d.turno });
    const funcaoKey = canonicalizarFuncaoEscala(mid, d.funcao);
    const pl = idPessoaRelatorio(d.pessoaNome);
    if (!pl) continue;
    porMinisterio[mid][`${d.data}-${turnoKey}-${funcaoKey}`] = pl;
  }

  return porMinisterio;
}

function montarIndisponibilidadesMap(indispDocs, mes) {
  const { inicio, fim } = getIntervaloMes(mes);
  const map = {};

  for (const d of indispDocs) {
    const mid = d.ministerioId;
    if (!mid) continue;
    if (!map[mid]) map[mid] = {};

    const datasNoMes = (d.datas || []).filter((chave) => {
      const data = chave.split("|")[0];
      return data >= inicio && data <= fim;
    });

    if (datasNoMes.length === 0) continue;

    const key = d.pessoaNome.toLowerCase();
    if (!map[mid][key]) map[mid][key] = new Set();
    for (const chave of datasNoMes) {
      map[mid][key].add(chave);
    }
  }

  return map;
}

function encontrarDataObj(datas, data, turnoKey) {
  const exato = datas.find((dt) => dt.data === data && turnoSalvoEscala(dt) === turnoKey);
  if (exato) return exato;
  const porData = datas.filter((dt) => dt.data === data);
  if (porData.length === 1) return porData[0];
  return null;
}

function adicionarSlotPessoa(porPessoa, pl, dataObj, funcao) {
  if (!porPessoa[pl]) porPessoa[pl] = [];
  const turnoKey = turnoSalvoEscala(dataObj);
  const jaExiste = porPessoa[pl].some(
    (s) => s.data === dataObj.data && turnoSalvoEscala(s) === turnoKey && s.funcao === funcao
  );
  if (!jaExiste) {
    porPessoa[pl].push({ ...dataObj, funcao });
  }
}

/** Reforça contagens a partir dos documentos reais (evita falso "sem escala"). */
function enriquecerPorPessoaComDocumentos(porPessoa, datas, escalasDocsMinisterio) {
  for (const d of escalasDocsMinisterio || []) {
    const pl = idPessoaRelatorio(d.pessoaNome);
    if (!pl) continue;
    const turnoKey = turnoSalvoEscala({ turno: d.turno });
    const dataObj = encontrarDataObj(datas, d.data, turnoKey);
    if (!dataObj) continue;
    adicionarSlotPessoa(porPessoa, pl, dataObj, d.funcao);
  }
}

function calcularRelatorioMinisterio(ministerioId, datas, escalasMap, escalasDocsMinisterio) {
  const funcoes = funcoesPorMinisterio[ministerioId] || [];
  const todasPessoas = (pessoasPorMinisterio[ministerioId] || []).filter(
    (p) => !isExcluidaRelatorioGeral(p)
  );
  const porPessoa = {};

  todasPessoas.forEach((p) => {
    const pl = idPessoaRelatorio(p);
    if (pl) porPessoa[pl] = [];
  });

  let totalSlots = 0;
  let preenchidos = 0;
  const slotsVazios = [];

  const posicao = {};
  datas.forEach((d, i) => {
    posicao[d.id] = i;
  });

  datas.forEach((dataObj) => {
    const turnoKey = turnoSalvoEscala(dataObj);
    funcoes.forEach((f) => {
      totalSlots++;
      const pessoa = escalasMap[`${dataObj.data}-${turnoKey}-${f}`];
      if (pessoa && pessoa !== "disponível") {
        preenchidos++;
        const pl = idPessoaRelatorio(pessoa);
        if (!pl) return;
        adicionarSlotPessoa(porPessoa, pl, dataObj, f);
      } else {
        slotsVazios.push({ dataObj, funcao: f });
      }
    });
  });

  enriquecerPorPessoaComDocumentos(porPessoa, datas, escalasDocsMinisterio);

  const relatorioPessoas = Object.entries(porPessoa).map(([pessoa, slots]) => {
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

  relatorioPessoas.sort((a, b) => b.total - a.total || a.pessoa.localeCompare(b.pessoa));

  const taxaPreenchimento = totalSlots > 0 ? Math.round((preenchidos / totalSlots) * 100) : 0;

  return {
    ministerioId,
    nome: MINISTERIOS_INFO[ministerioId]?.nome || ministerioId,
    totalSlots,
    preenchidos,
    vazios: totalSlots - preenchidos,
    taxaPreenchimento,
    slotsVazios,
    datas,
    relatorioPessoas,
    escalados: relatorioPessoas.filter((r) => r.total > 0),
    semEscala: relatorioPessoas.filter((r) => r.total === 0),
    funcoes,
  };
}

function buildTimelineGlobal(datasPorMinisterio) {
  const map = new Map();

  for (const datas of Object.values(datasPorMinisterio)) {
    for (const d of datas) {
      const key = `${d.data}|${d.turno ?? "único"}`;
      if (!map.has(key)) {
        map.set(key, { key, data: d.data, turno: d.turno ?? "único", dataObj: d });
      }
    }
  }

  return [...map.values()].sort((a, b) => {
    if (a.data !== b.data) return a.data.localeCompare(b.data);
    return (TURNO_ORDER[a.turno] ?? 1) - (TURNO_ORDER[b.turno] ?? 1);
  });
}

function calcularCargaCruzada(escalasPorMinisterio, datasPorMinisterio) {
  const carga = {};

  for (const mid of MINISTERIOS_IDS) {
    const escalasMap = escalasPorMinisterio[mid] || {};
    const datas = datasPorMinisterio[mid] || [];
    const funcoes = funcoesPorMinisterio[mid] || [];

    datas.forEach((dataObj) => {
      const turnoKey = turnoSalvoEscala(dataObj);
      funcoes.forEach((f) => {
        const pessoa = escalasMap[`${dataObj.data}-${turnoKey}-${f}`];
        const pl = idPessoaRelatorio(pessoa);
        if (!pl) return;

        if (!carga[pl]) {
          carga[pl] = { pessoa: pl, total: 0, porMinisterio: {}, slots: [] };
        }
        carga[pl].total++;
        carga[pl].porMinisterio[mid] = (carga[pl].porMinisterio[mid] || 0) + 1;
        carga[pl].slots.push({
          ministerioId: mid,
          data: dataObj.data,
          turno: dataObj.turno ?? "único",
          funcao: f,
          dataObj,
        });
      });
    });
  }

  const timeline = buildTimelineGlobal(datasPorMinisterio);
  const totalCultosMes = timeline.length;
  const posicaoGlobal = {};
  timeline.forEach((item, i) => {
    posicaoGlobal[item.key] = i;
  });

  const lista = Object.values(carga).map((item) => {
    const ministeriosAtivos = Object.keys(item.porMinisterio);
    const cultosKeys = new Set(
      item.slots.map((s) => `${s.data}|${s.turno}`)
    );
    const qtdCultos = cultosKeys.size;
    const percentualCultos =
      totalCultosMes > 0 ? Math.round((qtdCultos / totalCultosMes) * 1000) / 10 : 0;

    const consecutivasGlobais = [];
    for (let i = 0; i < timeline.length - 1; i++) {
      const atual = timeline[i];
      const proximo = timeline[i + 1];
      if (cultosKeys.has(atual.key) && cultosKeys.has(proximo.key)) {
        consecutivasGlobais.push([atual, proximo]);
      }
    }

    return {
      ...item,
      qtdCultos,
      totalCultosMes,
      percentualCultos,
      ministeriosAtivos,
      qtdMinisterios: ministeriosAtivos.length,
      consecutivasGlobais,
      sobrecarga: totalCultosMes > 0 && qtdCultos / totalCultosMes > SOBRECARGA_PERCENTUAL,
    };
  });

  lista.sort((a, b) => b.qtdCultos - a.qtdCultos || a.pessoa.localeCompare(b.pessoa));
  return { lista, totalCultosMes, timeline };
}

/**
 * IDs de pessoas com ao menos um slot preenchido em qualquer ministério do mês.
 * Varre todos os documentos de escala e reforça com os mapas por ministério.
 */
function coletarIdsEscaladosGlobal(escalasPorMinisterio, escalasDocs) {
  const escalados = new Set();

  for (const d of escalasDocs || []) {
    if (!MINISTERIOS_IDS.includes(d.ministerioId)) continue;
    const pl = idPessoaRelatorio(d.pessoaNome);
    if (pl) escalados.add(pl);
  }

  for (const mid of MINISTERIOS_IDS) {
    const map = escalasPorMinisterio[mid] || {};
    for (const pessoa of Object.values(map)) {
      const pl = idPessoaRelatorio(pessoa);
      if (pl) escalados.add(pl);
    }
  }

  return escalados;
}

function calcularSemEscalaGlobal(escalasPorMinisterio, escalasDocs) {
  const escalados = coletarIdsEscaladosGlobal(escalasPorMinisterio, escalasDocs);
  const todas = new Set();

  for (const mid of MINISTERIOS_IDS) {
    for (const p of pessoasPorMinisterio[mid] || []) {
      const pl = idPessoaRelatorio(p);
      if (pl) todas.add(pl);
    }
  }

  return [...todas]
    .filter((p) => !escalados.has(p))
    .sort((a, b) => a.localeCompare(b));
}

function calcularIndisponibilidades(indispMap, datasPorMinisterio) {
  const alertas = [];

  for (const mid of MINISTERIOS_IDS) {
    const mapMid = indispMap[mid] || {};
    const datas = datasPorMinisterio[mid] || [];
    const pessoas = pessoasPorMinisterio[mid] || [];

    for (const pessoa of pessoas) {
      if (isExcluidaRelatorioGeral(pessoa)) continue;
      const pl = pessoa.toLowerCase();
      const setDatas = mapMid[pl];
      if (!setDatas?.size) continue;

      const indispMapPessoa = { [pl]: setDatas };
      if (estaIndisponivelTodoMes(pessoa, datas, indispMapPessoa)) {
        alertas.push({ pessoa: pl, ministerioId: mid });
      }
    }
  }

  return alertas;
}

function calcularAlertasTurnoDia(timeline, cargaCruzada) {
  const cultosPorCategoria = {};
  for (const cat of CATEGORIAS_TURNO_DIA) {
    cultosPorCategoria[cat.id] = timeline.filter((t) => cat.test(t.dataObj));
  }

  const alertas = [];

  for (const pessoa of cargaCruzada) {
    const pessoaCultosKeys = new Set(pessoa.slots.map((s) => `${s.data}|${s.turno}`));

    for (const cat of CATEGORIAS_TURNO_DIA) {
      if (cultosPorCategoria[cat.id].length === 0) continue;

      const participou = cultosPorCategoria[cat.id].some((c) => pessoaCultosKeys.has(c.key));
      if (!participou) {
        alertas.push({
          pessoa: pessoa.pessoa,
          categoria: cat.id,
          label: cat.label,
          qtdCultosCategoria: cultosPorCategoria[cat.id].length,
          porMinisterio: pessoa.porMinisterio,
          ministeriosAtivos: pessoa.ministeriosAtivos,
        });
      }
    }
  }

  alertas.sort(
    (a, b) => a.pessoa.localeCompare(b.pessoa) || a.categoria.localeCompare(b.categoria)
  );
  return agruparAlertasTurnoDia(alertas);
}

function chaveMinisteriosTurnoDia(porMinisterio) {
  if (!porMinisterio) return "";
  return MINISTERIOS_IDS.filter((mid) => porMinisterio[mid]).join(",");
}

function agruparAlertasTurnoDia(alertas) {
  const ordemCat = CATEGORIAS_TURNO_DIA.map((c) => c.id);
  const map = new Map();

  for (const alerta of alertas) {
    const key = `${alerta.pessoa}|${chaveMinisteriosTurnoDia(alerta.porMinisterio)}`;
    if (!map.has(key)) {
      map.set(key, {
        pessoa: alerta.pessoa,
        porMinisterio: alerta.porMinisterio,
        ministeriosAtivos: alerta.ministeriosAtivos,
        itens: [],
      });
    }
    map.get(key).itens.push(alerta);
  }

  const agrupados = [];

  for (const grupo of map.values()) {
    grupo.itens.sort(
      (a, b) => ordemCat.indexOf(a.categoria) - ordemCat.indexOf(b.categoria)
    );

    const labels = grupo.itens.map((item) => item.label);
    agrupados.push({
      pessoa: grupo.pessoa,
      label: labels.join(" e em "),
      categorias: grupo.itens.map((item) => item.categoria),
      qtdCultosTotal: grupo.itens.reduce((acc, item) => acc + item.qtdCultosCategoria, 0),
      porMinisterio: grupo.porMinisterio,
      ministeriosAtivos: grupo.ministeriosAtivos,
    });
  }

  agrupados.sort((a, b) => a.pessoa.localeCompare(b.pessoa));
  return agrupados;
}

export function calcularRelatorioUnificado(mes, escalasDocs, cultosExtrasDocs, indispDocs) {
  const escalasPorMinisterio = montarEscalasPorMinisterio(escalasDocs);

  const escalasDocsPorMinisterio = {};
  for (const mid of MINISTERIOS_IDS) {
    escalasDocsPorMinisterio[mid] = (escalasDocs || []).filter((d) => d.ministerioId === mid);
  }

  const extrasPorMinisterio = {};
  for (const mid of MINISTERIOS_IDS) {
    extrasPorMinisterio[mid] = (cultosExtrasDocs || []).filter((e) => e.ministerioId === mid);
  }

  const datasPorMinisterio = {};
  const porMinisterio = {};

  for (const mid of MINISTERIOS_IDS) {
    datasPorMinisterio[mid] = montarDatasMinisterio(mes, extrasPorMinisterio[mid]);
    porMinisterio[mid] = calcularRelatorioMinisterio(
      mid,
      datasPorMinisterio[mid],
      escalasPorMinisterio[mid] || {},
      escalasDocsPorMinisterio[mid]
    );
  }

  const { lista: cargaCruzada, totalCultosMes, timeline } = calcularCargaCruzada(
    escalasPorMinisterio,
    datasPorMinisterio
  );
  const semEscalaGlobal = calcularSemEscalaGlobal(escalasPorMinisterio, escalasDocs);
  const indispMap = montarIndisponibilidadesMap(indispDocs, mes);
  const indisponibilidadesMes = calcularIndisponibilidades(indispMap, datasPorMinisterio);
  const turnoDia = calcularAlertasTurnoDia(timeline, cargaCruzada);

  const totalSlots = MINISTERIOS_IDS.reduce((acc, mid) => acc + porMinisterio[mid].totalSlots, 0);
  const preenchidos = MINISTERIOS_IDS.reduce((acc, mid) => acc + porMinisterio[mid].preenchidos, 0);
  const pessoasEscaladas = cargaCruzada.length;
  const slotsVaziosCriticos = MINISTERIOS_IDS.flatMap((mid) =>
    porMinisterio[mid].slotsVazios.map((s) => ({
      ...s,
      ministerioId: mid,
      ministerioNome: MINISTERIOS_INFO[mid]?.nome,
    }))
  );
  const sobrecarga = cargaCruzada.filter((c) => c.sobrecarga);
  const multiministerio = cargaCruzada.filter((c) => c.qtdMinisterios >= 2);

  return {
    mes,
    resumo: {
      totalSlots,
      preenchidos,
      vazios: totalSlots - preenchidos,
      taxaPreenchimento: totalSlots > 0 ? Math.round((preenchidos / totalSlots) * 100) : 0,
      pessoasEscaladas,
      pessoasSemEscala: semEscalaGlobal.length,
      totalCultosMes,
    },
    porMinisterio,
    cargaCruzada,
    semEscalaGlobal,
    alertas: {
      slotsVazios: slotsVaziosCriticos,
      sobrecarga,
      multiministerio,
      indisponibilidadesMes,
      turnoDia,
    },
  };
}
