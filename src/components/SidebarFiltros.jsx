// ===== src/components/SidebarFiltros.jsx =====
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { db } from "../firebase";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { funcoesPorMinisterio } from "../data/funcoes";
import { pessoasPorMinisterio, pessoasPorFuncaoLouvor, pessoasPorFuncaoInfantil, pessoasPorFuncaoRecepcao } from "../data/pessoas";
import { formatarData } from "../utils/dateHelper";
import { podeEditarMinisterio } from "../utils/permissions";
import { ministerioPermiteEscalaFlexivel } from "../utils/regrasMinisterio";
import { nomeParaExibicao, pessoaNomeFirestore } from "../utils/nomeExibicao";
import { pessoaJaEscaladaNoMesmoMinisterioNoCulto } from "../utils/escalaDisponibilidade";
import { pessoaEscaladaEmOutroMinisterioNoCulto } from "../utils/escalasCruzadas";
import { useEscalasCruzadas } from "../hooks/useEscalasCruzadas";
import { useIndisponibilidadesMinisterio } from "../hooks/useIndisponibilidadesMinisterio";
import {
  MINISTERIO_INFANTIL_ID,
  contarCultosEscaladosInfantilNoMes,
  mensagemLimiteInfantil,
  precisaConfirmarLimiteInfantil,
} from "../utils/limiteEscalasInfantil";

const ministerios = [
  {
    id: "comunicacao", nome: "COMUNICAÇÕES",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="13" height="10" rx="2"/>
        <polygon points="15,9 21,6 21,18 15,15"/>
        <circle cx="4" cy="9.5" r="0.8" fill="white" stroke="none"/>
      </svg>
    ),
  },
  {
    id: "louvor", nome: "LOUVOR",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </svg>
    ),
  },
  {
    id: "recepcao", nome: "INTRODUÇÃO",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    id: "infantil", nome: "INFANTIL",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="2.5"/>
        <path d="M12 7.5L12 14"/>
        <path d="M12 14L9 19"/>
        <path d="M12 14L15 19"/>
        <path d="M12 10L8 12"/>
        <path d="M12 10L16 12"/>
      </svg>
    ),
  },
];

// Ministérios com filtro Função → Pessoa
const MINISTERIOS_COM_FILTRO = ["louvor", "infantil", "recepcao"];

// Funções exibidas na sidebar para recepcao
const FUNCOES_RECEPCAO_SIDEBAR = ["INTRODUTOR", "INTRODUTORA"];

// Slots reais no Firestore para recepcao
const RECEPCAO_SLOTS = ["INTRODUTOR(A) 1", "INTRODUTOR(A) 2", "INTRODUTOR(A) 3"];

// Ordem de preferência de preenchimento por função
const RECEPCAO_PREFERENCIA = {
  "INTRODUTOR":  ["INTRODUTOR(A) 1", "INTRODUTOR(A) 2", "INTRODUTOR(A) 3"],
  "INTRODUTORA": ["INTRODUTOR(A) 2", "INTRODUTOR(A) 3", "INTRODUTOR(A) 1"],
};

const NOMES_MINISTERIOS = {
  comunicacao: "COMUNICAÇÕES", louvor: "LOUVOR", recepcao: "INTRODUÇÃO", infantil: "INFANTIL",
};

// Funções agrupadas do Louvor (intercambiáveis entre si)
const GRUPO_FUNCOES = {
  "BVOCAL": ["BVOCAL 1", "BVOCAL 2", "BVOCAL 3", "BVOCAL 4"],
  "MÚSICO":  ["MÚSICO 1",  "MÚSICO 2",  "MÚSICO 3",  "MÚSICO 4"],
};

// Lista simplificada exibida na sidebar para o Louvor
const FUNCOES_LOUVOR_SIDEBAR = ["MINISTRANTE", "BVOCAL", "MÚSICO"];

/** Slots Firestore associados à função exibida na sidebar. */
function slotsDaFuncaoSidebar(funcaoSelecionada, ministerioSelecionado) {
  if (!funcaoSelecionada || funcaoSelecionada === "TODOS") return [];
  if (GRUPO_FUNCOES[funcaoSelecionada]) return GRUPO_FUNCOES[funcaoSelecionada];
  if (ministerioSelecionado === "recepcao" && RECEPCAO_PREFERENCIA[funcaoSelecionada]) {
    return RECEPCAO_SLOTS;
  }
  return [funcaoSelecionada];
}

/** Funções com sub-slots repetidos no mesmo culto (BV1–4, MS1–4, I1–3). */
function funcaoTemMultiplosSlots(funcaoEfetiva, ministerioSelecionado) {
  return Boolean(GRUPO_FUNCOES[funcaoEfetiva]) ||
    (ministerioSelecionado === "recepcao" && RECEPCAO_PREFERENCIA[funcaoEfetiva]);
}

/** Ordem de preenchimento dos sub-slots para uma função da sidebar. */
function ordemSlotsFuncao(funcaoEfetiva, ministerioSelecionado) {
  if (GRUPO_FUNCOES[funcaoEfetiva]) return GRUPO_FUNCOES[funcaoEfetiva];
  if (ministerioSelecionado === "recepcao" && RECEPCAO_PREFERENCIA[funcaoEfetiva]) {
    return RECEPCAO_PREFERENCIA[funcaoEfetiva];
  }
  return [funcaoEfetiva];
}

/** Sub-slots ainda livres/vazios para a função na data (ignora "disponível" como ocupado). */
function slotsDisponiveis(funcaoEfetiva, dataObj, turnoSalvo, mapaEscalas, ministerioSelecionado) {
  if (!dataObj || !funcaoEfetiva) return [];
  return ordemSlotsFuncao(funcaoEfetiva, ministerioSelecionado).filter((slot) => {
    const ocupante = mapaEscalas[`${dataObj.data}-${turnoSalvo}-${slot}`];
    return !ocupante || ocupante === "disponível";
  });
}

/** Data ainda tem escala real neste ministério (ignora "disponível"). */
function dataTemEscalaNoMinisterio(d, ministerioSelecionado, escalas) {
  const turnoKey = d.turno ?? "único";
  const funcoes = funcoesPorMinisterio[ministerioSelecionado] || [];
  return funcoes.some((f) => {
    const p = escalas[`${d.data}-${turnoKey}-${f}`];
    return p && p !== "disponível";
  });
}

export default function SidebarFiltros({
  usuario, ministerioSelecionado, setMinisterioSelecionado,
  datasDisponiveis, onRefresh, theme, onConfirmar,
  onMensagem, onConflito,
  refreshKey = 0,
  indispRefreshKey = 0,
  mes = "",
  escalas = {},
  pedirConfirmacao = null,
}) {
  const t = theme || {};
  const [salvando, setSalvando]               = useState(false);
  const [pessoasMarcadas, setPessoasMarcadas] = useState([]);
  const [funcaoSelecionada, setFuncao]        = useState("");
  const [datasIds, setDatasIds] = useState([]);
  const [datasConfirmadas, setDatasConfirmadas] = useState([]);
  const [extrasAberta, setExtrasAberta]       = useState(false);
  const [minDropAberto, setMinDropAberto]     = useState(false);
  const minDropRef                            = useRef(null);
  // ─── Fecha dropdown de ministério ao clicar fora ─────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (minDropRef.current && !minDropRef.current.contains(e.target)) {
        setMinDropAberto(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const TIPOS_EXTRA = [
    "Consagração",
    "Culto das Mulheres",
    "Encontro de Amigas",
    "Encontro de Casados",
    "Encontro de Guerreiros",
  ];

  const [novoExtra, setNovoExtra]             = useState({ data: "", turno: "único", nome: "" });
  const [adicionandoExtra, setAdicionandoExtra] = useState(false);
  const [modalEscolhaFuncao, setModalEscolhaFuncao] = useState({ aberto: false, opcoes: [] });

  const usaFiltro = MINISTERIOS_COM_FILTRO.includes(ministerioSelecionado);

  // ─── Limpa estado ao trocar ministério ───────────────────────────────────
  useEffect(() => {
    setDatasConfirmadas([]);
    setDatasIds([]);
    setFuncao("");
    setPessoasMarcadas([]);
    setModalEscolhaFuncao({ aberto: false, opcoes: [] });
  }, [ministerioSelecionado]);

  useEffect(() => {
    setDatasIds([]);
    setPessoasMarcadas([]);
  }, [funcaoSelecionada]);

  // ─── Limpa datasConfirmadas ao remover da grid ────────────────────────────
  useEffect(() => {
    if (refreshKey === 0) return;
    setDatasConfirmadas([]);
  }, [refreshKey]);

  // ─── Sincroniza datasConfirmadas com escalas (onSnapshot / remoções na tabela) ─
  useEffect(() => {
    setDatasConfirmadas((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.filter((id) => {
        const d = datasDisponiveis.find((x) => x.id === id);
        if (!d) return false;
        return dataTemEscalaNoMinisterio(d, ministerioSelecionado, escalas);
      });
      return next.length === prev.length ? prev : next;
    });
  }, [escalas, datasDisponiveis, ministerioSelecionado]);

  const { indisponiveisMap } = useIndisponibilidadesMinisterio(
    ministerioSelecionado,
    !!ministerioSelecionado
  );

  // ─── Datas ocupadas — computado direto do escalas (onSnapshot, sempre atual) ─
  const datasOcupadas = useMemo(() => {
    const ocupadas = new Set();
    if (!funcaoSelecionada || funcaoSelecionada === "TODOS" || !ministerioSelecionado) return ocupadas;
    datasDisponiveis.forEach(d => {
      const turnoKey = d.turno ?? "único";

      // Recepcao: ocupado apenas quando os 3 slots estão preenchidos
      if (ministerioSelecionado === "recepcao" && RECEPCAO_PREFERENCIA[funcaoSelecionada]) {
        const allFull = RECEPCAO_SLOTS.every(f => {
          const p = escalas[`${d.data}-${turnoKey}-${f}`];
          return p && p !== "disponível";
        });
        if (allFull) ocupadas.add(`${d.data}|${turnoKey}|${funcaoSelecionada}`);
        return;
      }

      if (GRUPO_FUNCOES[funcaoSelecionada]) {
        // Agrupada: conta sub-slots com pessoas reais (ignora "disponível")
        const subFuncoes = GRUPO_FUNCOES[funcaoSelecionada];
        const count = subFuncoes.filter(f => {
          const p = escalas[`${d.data}-${turnoKey}-${f}`];
          return p && p !== "disponível";
        }).length;
        if (count >= subFuncoes.length) {
          ocupadas.add(`${d.data}|${turnoKey}|${funcaoSelecionada}`);
        }
      } else {
        // Simples: ocupado só com pessoa real ("disponível" permanece escalável na sidebar)
        const p = escalas[`${d.data}-${turnoKey}-${funcaoSelecionada}`];
        if (p && p !== "disponível") ocupadas.add(`${d.data}|${turnoKey}|${funcaoSelecionada}`);
      }
    });
    return ocupadas;
  }, [escalas, funcaoSelecionada, datasDisponiveis, ministerioSelecionado]);

  // ─── Quando função muda (para ministérios com filtro), revalida pessoa ───
  useEffect(() => {
    if (!usaFiltro || !funcaoSelecionada || funcaoSelecionada === "TODOS") return;
    let permitidos = [];
    if (ministerioSelecionado === "louvor") {
      if (GRUPO_FUNCOES[funcaoSelecionada]) {
        permitidos = [...new Set(
          GRUPO_FUNCOES[funcaoSelecionada].flatMap(f => pessoasPorFuncaoLouvor[f] || [])
        )];
      } else {
        permitidos = pessoasPorFuncaoLouvor[funcaoSelecionada] || [];
      }
    } else if (ministerioSelecionado === "recepcao") {
      permitidos = pessoasPorFuncaoRecepcao[funcaoSelecionada] || [];
    } else {
      permitidos = pessoasPorFuncaoInfantil[funcaoSelecionada] || [];
    }
    if (pessoasMarcadas.some(p => p !== "Disponível" && !permitidos.includes(p))) {
      setPessoasMarcadas(prev => prev.filter(p => p === "Disponível" || permitidos.includes(p)));
    }
  }, [funcaoSelecionada]);

  const pessoasDoMinisterio = pessoasPorMinisterio[ministerioSelecionado] || [];
  const pessoasLowerSet = useMemo(
    () => new Set(pessoasDoMinisterio.map((p) => p.toLowerCase())),
    [pessoasDoMinisterio]
  );
  const { mapa: escalasCruzadasMap } = useEscalasCruzadas({
    mes,
    pessoasLowerSet,
    enabled: !!ministerioSelecionado && !!mes,
  });
  const funcoesDoMinisterio = ministerioSelecionado === "louvor"
    ? FUNCOES_LOUVOR_SIDEBAR
    : ministerioSelecionado === "recepcao"
      ? FUNCOES_RECEPCAO_SIDEBAR
      : (funcoesPorMinisterio[ministerioSelecionado] || []);
  const podeEditar = podeEditarMinisterio(usuario, ministerioSelecionado);

  // Lista de pessoas filtrada por função (louvor/infantil/recepcao)
  const pessoasFiltradas = useMemo(() => {
    if (!usaFiltro || !funcaoSelecionada || funcaoSelecionada === "TODOS") {
      return pessoasDoMinisterio;
    }
    if (ministerioSelecionado === "louvor") {
      // Função agrupada: união deduplicada de todas as sub-funções
      if (GRUPO_FUNCOES[funcaoSelecionada]) {
        return [...new Set(
          GRUPO_FUNCOES[funcaoSelecionada].flatMap(f => pessoasPorFuncaoLouvor[f] || [])
        )];
      }
      return pessoasPorFuncaoLouvor[funcaoSelecionada] || pessoasDoMinisterio;
    }
    if (ministerioSelecionado === "recepcao") {
      return pessoasPorFuncaoRecepcao[funcaoSelecionada] || pessoasDoMinisterio;
    }
    return pessoasPorFuncaoInfantil[funcaoSelecionada] || pessoasDoMinisterio;
  }, [usaFiltro, funcaoSelecionada, ministerioSelecionado, pessoasDoMinisterio]);

  /** Disponibilidade de uma pessoa em uma data/função (indisp., ocupação, slot "disponível"). */
  const dataEscalavelParaPessoa = useCallback((d, nomePessoa, funcaoCtx) => {
    const funcao = funcaoCtx ?? funcaoSelecionada;
    if (!funcao || funcao === "TODOS") return false;

    const turnoKey = d.turno ?? "único";
    const pl = pessoaNomeFirestore(nomePessoa);

    if (
      !ministerioPermiteEscalaFlexivel(ministerioSelecionado) &&
      datasConfirmadas.includes(d.id) &&
      dataTemEscalaNoMinisterio(d, ministerioSelecionado, escalas)
    ) {
      return false;
    }

    if (datasOcupadas.has(`${d.data}|${turnoKey}|${funcao}`)) return false;

    const livres = slotsDisponiveis(
      funcao, d, turnoKey, escalas, ministerioSelecionado
    );
    if (livres.length === 0) return false;

    if (pl === "disponível") {
      // Louvor: "Disponível" pode repetir em vários slots; não ocultar por já existir no culto
      if (ministerioSelecionado !== "louvor") {
        if (GRUPO_FUNCOES[funcao]) {
          const subFuncoes = GRUPO_FUNCOES[funcao];
          if (subFuncoes.some(f => escalas[`${d.data}-${turnoKey}-${f}`] === "disponível")) {
            return false;
          }
        } else if (escalas[`${d.data}-${turnoKey}-${funcao}`] === "disponível") {
          return false;
        }
      }
    } else if (pl !== "disponível") {
      if (
        pessoaJaEscaladaNoMesmoMinisterioNoCulto({
          escalas,
          ministerioId: ministerioSelecionado,
          dataObj: d,
          pessoaNome: nomePessoa,
          funcaoAtual: funcao,
        })
      ) {
        return false;
      }
    }

    const chave = `${d.data}|${turnoKey}`;
    if (indisponiveisMap[pl]?.has(chave)) return false;

    if (
      pl !== "disponível" &&
      pessoaEscaladaEmOutroMinisterioNoCulto(
        escalasCruzadasMap,
        ministerioSelecionado,
        nomePessoa,
        d
      )
    ) {
      return false;
    }

    return true;
  }, [datasConfirmadas, datasOcupadas, funcaoSelecionada, escalas, indisponiveisMap, ministerioSelecionado, escalasCruzadasMap]);

  /** Datas escaláveis na função (sem filtro por obreiro). */
  const datasParaSelect = useMemo(() => {
    if (!funcaoSelecionada) return [];
    return datasDisponiveis.filter(d => {
      if (
        !ministerioPermiteEscalaFlexivel(ministerioSelecionado) &&
        datasConfirmadas.includes(d.id) &&
        dataTemEscalaNoMinisterio(d, ministerioSelecionado, escalas)
      ) {
        return false;
      }
      if (funcaoSelecionada === "TODOS") return true;
      const turnoKey = d.turno ?? "único";
      return !datasOcupadas.has(`${d.data}|${turnoKey}|${funcaoSelecionada}`);
    });
  }, [funcaoSelecionada, datasDisponiveis, datasConfirmadas, datasOcupadas, escalas, ministerioSelecionado]);

  /** Mantém datas selecionadas visíveis na lista enquanto o usuário observa a reatividade. */
  const datasParaLista = useMemo(() => {
    const turnoOrder = { "manhã": 0, "único": 1, "noite": 2 };
    const ordenar = (a, b) => {
      if (a.data !== b.data) return a.data.localeCompare(b.data);
      return (turnoOrder[a.turno] ?? 1) - (turnoOrder[b.turno] ?? 1);
    };
    const extras = datasIds
      .filter((id) => !datasParaSelect.some((d) => d.id === id))
      .map((id) => datasDisponiveis.find((d) => d.id === id))
      .filter(Boolean);
    if (extras.length === 0) return datasParaSelect;
    return [...datasParaSelect, ...extras].sort(ordenar);
  }, [datasParaSelect, datasIds, datasDisponiveis]);

  const datasSelecionadasObjs = useMemo(
    () => datasIds
      .map((id) => datasDisponiveis.find((d) => d.id === id))
      .filter(Boolean),
    [datasIds, datasDisponiveis]
  );

  /** Obreiros clicáveis: ao menos uma data selecionada ainda tem vaga para a função. */
  const pessoasDisponiveisNasDatas = useMemo(() => {
    if (!funcaoSelecionada || datasSelecionadasObjs.length === 0) return [];
    return pessoasFiltradas.filter((p) =>
      datasSelecionadasObjs.some((d) => dataEscalavelParaPessoa(d, p))
    );
  }, [funcaoSelecionada, datasSelecionadasObjs, pessoasFiltradas, dataEscalavelParaPessoa]);

  /** Louvor: "Disponível" permanece na lista sempre que há função + datas (ignora duplicidade no grid). */
  const disponivelNasDatasSelecionadas = useMemo(() => {
    if (ministerioSelecionado !== "louvor" || datasSelecionadasObjs.length === 0) {
      return false;
    }
    if (!funcaoSelecionada || funcaoSelecionada === "TODOS") return false;
    return true;
  }, [ministerioSelecionado, funcaoSelecionada, datasSelecionadasObjs]);

  /** Só quando todos os cultos do mês estão ocupados na função (não confundir com indisponibilidade pessoal). */
  const todasDatasOcupadasNaFuncao = useMemo(() => {
    if (!funcaoSelecionada || funcaoSelecionada === "TODOS") return false;
    const candidatas = datasDisponiveis.filter(d => !datasConfirmadas.includes(d.id));
    if (candidatas.length === 0) return false;
    return candidatas.every(d => {
      const turnoKey = d.turno ?? "único";
      return datasOcupadas.has(`${d.data}|${turnoKey}|${funcaoSelecionada}`);
    });
  }, [funcaoSelecionada, datasDisponiveis, datasConfirmadas, datasOcupadas]);

  useEffect(() => {
    const disponiveis = new Set(datasParaSelect.map((d) => d.id));
    setDatasIds((prev) => {
      const next = prev.filter((id) => {
        if (!datasDisponiveis.some((d) => d.id === id)) return false;
        return disponiveis.has(id);
      });
      return next.length === prev.length ? prev : next;
    });
  }, [datasParaSelect, datasDisponiveis]);

  useEffect(() => {
    setPessoasMarcadas((prev) =>
      prev.filter((p) => {
        if (p === "Disponível") {
          if (ministerioSelecionado === "louvor") {
            return (
              datasIds.length > 0 &&
              funcaoSelecionada &&
              funcaoSelecionada !== "TODOS"
            );
          }
          return disponivelNasDatasSelecionadas;
        }
        return pessoasDisponiveisNasDatas.includes(p);
      })
    );
  }, [
    pessoasDisponiveisNasDatas,
    disponivelNasDatasSelecionadas,
    ministerioSelecionado,
    datasIds.length,
    funcaoSelecionada,
  ]);

  const obreirosLista = useMemo(() => {
    const nomes = [...pessoasDisponiveisNasDatas].sort((a, b) => a.localeCompare(b, "pt"));
    if (disponivelNasDatasSelecionadas) nomes.unshift("Disponível");
    return nomes;
  }, [pessoasDisponiveisNasDatas, disponivelNasDatasSelecionadas]);

  const qtdDisponiveisObreiros = obreirosLista.length;

  const toggleData = (id) => {
    if (!podeEditar || !funcaoSelecionada) return;
    setDatasIds(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
    onConflito?.(null);
  };

  const selecionarTodasDatas = () => {
    if (!podeEditar || !funcaoSelecionada) return;
    setDatasIds(datasParaSelect.map(d => d.id));
    onConflito?.(null);
  };

  const limparDatasSelecionadas = () => {
    setDatasIds([]);
    setPessoasMarcadas([]);
    onConflito?.(null);
  };

  const toggleObreiro = (nome) => {
    if (!podeEditar || datasIds.length === 0) return;
    setPessoasMarcadas(prev => {
      if (prev.includes(nome)) return prev.filter(p => p !== nome);

      if (nome === "Disponível") return ["Disponível"];
      if (prev.includes("Disponível")) return [nome];

      const multiSlot = funcaoTemMultiplosSlots(funcaoSelecionada, ministerioSelecionado);
      if (!multiSlot) return [nome];

      const vagasPorData = datasSelecionadasObjs.map((dataObj) => {
        const turnoKey = dataObj.turno ?? "único";
        return slotsDisponiveis(
          funcaoSelecionada, dataObj, turnoKey, escalas, ministerioSelecionado
        ).length;
      }).filter((n) => n > 0);
      const vagasLivres = vagasPorData.length > 0 ? Math.min(...vagasPorData) : 0;
      if (prev.length >= vagasLivres.length) {
        onMensagem?.(
          `Limite de vagas atingido para esta função neste dia (Restam apenas ${vagasLivres.length} ${vagasLivres.length === 1 ? "vaga" : "vagas"})`,
          "erro"
        );
        return prev;
      }
      return [...prev, nome];
    });
    onConflito?.(null);
  };

  const confirmarEscalaComFuncao = async (funcaoEfetiva) => {
    setSalvando(true);
    onConflito?.(null);

    const datasObj = datasIds
      .map(id => datasDisponiveis.find(d => d.id === id))
      .filter(Boolean);
    const pessoasParaSalvar = [...pessoasMarcadas];

    let erros = 0;
    let conflito = null;
    const idsSalvos = [];
    let salvos = 0;
    const escalasLocal = { ...escalas };

    for (const dataItem of datasObj) {
      const turnoSalvo = dataItem.turno === "único" ? "único" : dataItem.turno;
      const slotsLivres = slotsDisponiveis(
        funcaoEfetiva, dataItem, turnoSalvo, escalasLocal, ministerioSelecionado
      );

      const pessoasNestaData = pessoasParaSalvar.filter((nome) =>
        dataEscalavelParaPessoa(dataItem, nome, funcaoEfetiva)
      );

      if (pessoasNestaData.length === 0) continue;

      if (pessoasNestaData.length > slotsLivres.length) {
        onMensagem?.(
          `Limite de vagas atingido para esta função neste dia (Restam apenas ${slotsLivres.length} ${slotsLivres.length === 1 ? "vaga" : "vagas"})`,
          "erro"
        );
        setSalvando(false);
        return;
      }

      for (let i = 0; i < pessoasNestaData.length; i++) {
        const nomePessoa = pessoasNestaData[i];
        const funcaoReal = slotsLivres[i] ?? null;
        if (!funcaoReal) { erros++; continue; }

        try {
          const pessoaLower = pessoaNomeFirestore(nomePessoa);
          if (
            pessoaLower !== "disponível" &&
            !ministerioPermiteEscalaFlexivel(ministerioSelecionado)
          ) {
            const qConflito = query(
              collection(db, "escalas"),
              where("pessoaNome", "==", pessoaLower),
              where("data", "==", dataItem.data),
              where("turno", "==", turnoSalvo)
            );
            const conflitoSnap = await getDocs(qConflito);
            const conflitoOutro = conflitoSnap.docs.find(d => d.data().ministerioId !== ministerioSelecionado);

            if (conflitoOutro) {
              const dd = conflitoOutro.data();
              if (!conflito) {
                conflito = {
                  pessoa: nomePessoa,
                  data: formatarData(dataItem.data, dataItem.turno, dataItem.descricao),
                  ministerio: NOMES_MINISTERIOS[dd.ministerioId] || dd.ministerioId,
                  funcao: dd.funcao,
                };
              }
              erros++;
              continue;
            }
          }

          const qExistente = query(
            collection(db, "escalas"),
            where("ministerioId", "==", ministerioSelecionado),
            where("data", "==", dataItem.data),
            where("funcao", "==", funcaoReal),
            where("turno", "==", turnoSalvo)
          );
          const existenteSnap = await getDocs(qExistente);
          for (const docSnap of existenteSnap.docs) await deleteDoc(docSnap.ref);

          await addDoc(collection(db, "escalas"), {
            pessoaNome: pessoaLower,
            funcao: funcaoReal,
            ministerioId: ministerioSelecionado,
            data: dataItem.data,
            turno: turnoSalvo,
            horaInicio: dataItem.tipo === "domingo" && dataItem.turno === "manhã" ? "08:00" :
                        dataItem.tipo === "domingo" && dataItem.turno === "noite" ? "18:00" : "19:00",
            horaFim: dataItem.tipo === "domingo" && dataItem.turno === "manhã" ? "12:00" : "22:00",
            criadoPor: usuario.uid,
            criadoPorEmail: usuario.email,
            criadoEm: new Date().toISOString()
          });

          escalasLocal[`${dataItem.data}-${turnoSalvo}-${funcaoReal}`] = pessoaLower;
          idsSalvos.push(dataItem.id);
          salvos++;

        } catch (error) {
          console.error(error);
          erros++;
        }
      }
    }

    if (conflito) onConflito?.(conflito);

    if (salvos > 0) {
      const isGrupo = GRUPO_FUNCOES[funcaoEfetiva] ||
        (ministerioSelecionado === "recepcao" && RECEPCAO_PREFERENCIA[funcaoEfetiva]);
      if (!isGrupo && !ministerioPermiteEscalaFlexivel(ministerioSelecionado)) {
        setDatasConfirmadas(prev => [...new Set([...prev, ...idsSalvos])]);
      }
      const nomes = pessoasParaSalvar.map((p) => nomeParaExibicao(p)).join(", ");
      const pluralPessoa = pessoasParaSalvar.length === 1 ? "Obreiro" : "Obreiros";
      onMensagem?.(
        `${pluralPessoa} ${nomes} escalado(s) como ${funcaoEfetiva}`,
        "sucesso"
      );
      setPessoasMarcadas([]);
      setDatasIds([]);
      if (onRefresh) onRefresh();
      if (!erros) setTimeout(() => { if (onConfirmar) onConfirmar(); }, 1200);
    }

    setSalvando(false);
  };

  const confirmarLimiteInfantilSeNecessario = async (funcaoEfetiva) => {
    if (
      ministerioSelecionado !== MINISTERIO_INFANTIL_ID ||
      !pedirConfirmacao ||
      !mes
    ) {
      return true;
    }

    const datasObj = datasIds
      .map((id) => datasDisponiveis.find((d) => d.id === id))
      .filter(Boolean);

    for (const nome of pessoasMarcadas) {
      if (nome === "Disponível") continue;

      const pessoaLower = pessoaNomeFirestore(nome);
      const datasParaPessoa = datasObj.filter((d) =>
        dataEscalavelParaPessoa(d, nome, funcaoEfetiva)
      );

      if (
        !precisaConfirmarLimiteInfantil(
          pessoaLower,
          mes,
          escalas,
          datasParaPessoa,
          datasDisponiveis
        )
      ) {
        continue;
      }

      const cultosAtuais = contarCultosEscaladosInfantilNoMes(
        pessoaLower,
        mes,
        escalas,
        datasDisponiveis
      );

      const confirmou = await pedirConfirmacao({
        titulo: "Limite de escalas — Infantil",
        descricao: mensagemLimiteInfantil(nomeParaExibicao(nome), cultosAtuais),
      });

      if (!confirmou) return false;
    }

    return true;
  };

  const handleConfirmarEscala = async () => {
    if (!podeEditar)           { onMensagem?.("Você só pode editar seu próprio ministério", "erro"); return; }
    if (pessoasMarcadas.length === 0) { onMensagem?.("Selecione ao menos um obreiro", "erro"); return; }
    if (!funcaoSelecionada)    { onMensagem?.("Selecione uma função", "erro"); return; }
    if (datasIds.length === 0) { onMensagem?.("Selecione ao menos uma data", "erro"); return; }

    if (funcaoTemMultiplosSlots(funcaoSelecionada, ministerioSelecionado)) {
      for (const dataObj of datasSelecionadasObjs) {
        const turnoKey = dataObj.turno ?? "único";
        const vagasLivres = slotsDisponiveis(
          funcaoSelecionada, dataObj, turnoKey, escalas, ministerioSelecionado
        );
        const pessoasNestaData = pessoasMarcadas.filter((nome) =>
          dataEscalavelParaPessoa(dataObj, nome)
        );
        if (pessoasNestaData.length > vagasLivres.length) {
          onMensagem?.(
            `Limite de vagas atingido para esta função neste dia (Restam apenas ${vagasLivres.length} ${vagasLivres.length === 1 ? "vaga" : "vagas"})`,
            "erro"
          );
          return;
        }
      }
    }

    if (funcaoSelecionada === "TODOS") {
      const opcoes = [...funcoesDoMinisterio];
      if (opcoes.length === 0) {
        onMensagem?.("Nenhuma função configurada para este ministério.", "erro");
        return;
      }
      setModalEscolhaFuncao({ aberto: true, opcoes });
      return;
    }

    if (!(await confirmarLimiteInfantilSeNecessario(funcaoSelecionada))) return;

    await confirmarEscalaComFuncao(funcaoSelecionada);
  };

  // ─── Cultos extras do mês atual ──────────────────────────────────────────
  const extrasDoMes = datasDisponiveis.filter(d => d.tipo === "extra");

  // Min/Max para o date input
  const mesMinMax = (() => {
    const m = mes || new Date().toISOString().slice(0, 7);
    const [ano, mesN] = m.split("-");
    const last = new Date(parseInt(ano), parseInt(mesN), 0).getDate();
    return {
      min: `${m}-01`,
      max: `${m}-${String(last).padStart(2, "0")}`,
    };
  })();

  const handleAdicionarExtra = async () => {
    if (!novoExtra.nome) { onMensagem?.("Selecione o tipo de culto", "erro"); return; }
    if (!novoExtra.data) { onMensagem?.("Selecione uma data", "erro"); return; }
    const jaExiste = datasDisponiveis.some(d => d.data === novoExtra.data && d.turno === novoExtra.turno);
    if (jaExiste) { onMensagem?.("Já existe um culto neste dia/turno", "erro"); return; }
    setAdicionandoExtra(true);
    try {
      await addDoc(collection(db, "cultos_extras"), {
        data: novoExtra.data,
        turno: novoExtra.turno,
        nome: novoExtra.nome,
        mes: mes || new Date().toISOString().slice(0, 7),
        ministerioId: ministerioSelecionado,
        criadoPor: usuario?.uid || "",
        criadoEm: new Date().toISOString(),
      });
      setNovoExtra({ data: "", turno: "único", nome: "" });
      onMensagem?.("Culto extra adicionado", "sucesso");
    } catch (err) {
      console.error(err);
      onMensagem?.("Erro ao adicionar culto extra", "erro");
    } finally {
      setAdicionandoExtra(false);
    }
  };

  const handleRemoverExtra = async (firestoreId) => {
    try {
      await deleteDoc(doc(db, "cultos_extras", firestoreId));
      onMensagem?.("Culto extra removido", "sucesso");
    } catch (err) {
      console.error(err);
      onMensagem?.("Erro ao remover culto extra", "erro");
    }
  };

  const s = {
    label: {
      fontSize: "11px", fontWeight: 600, color: t.textMuted,
      textTransform: "uppercase", letterSpacing: "0.6px",
      display: "block", marginBottom: "6px"
    },
    select: {
      width: "100%", padding: "9px 12px", borderRadius: "6px",
      border: `1px solid ${t.border}`, background: t.bg,
      color: t.text, fontSize: "13px", fontFamily: "inherit",
      outline: "none", cursor: "pointer", appearance: "none",
      transition: "border-color 0.15s, box-shadow 0.15s",
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
      backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
      paddingRight: "28px",
    },
    field: { marginBottom: "18px" },
  };

  const datasHint = (() => {
    if (!funcaoSelecionada || funcaoSelecionada === "TODOS") return null;
    if (datasParaSelect.length === 0 && datasDisponiveis.length > 0 && todasDatasOcupadasNaFuncao) {
      return { text: "Todas as datas já estão preenchidas para esta função", color: "#d2993a" };
    }
    return null;
  })();

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>

      <div style={{ display: "flex", alignItems: "center", gap: "11px", marginBottom: "20px", paddingBottom: "16px", borderBottom: `1px solid ${t.border}` }}>
        <div style={{
          width: "34px", height: "34px", borderRadius: "9px",
          background: t.accentDim, color: t.accent,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
            <line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/>
          </svg>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: t.text, letterSpacing: "-0.1px", lineHeight: 1.2 }}>
            Adicionar à escala
          </div>
          <div style={{ fontSize: "10.5px", color: t.textMuted, marginTop: "2px" }}>
            Monte a escala do mês
          </div>
        </div>
      </div>

      {/* Ministério — dropdown customizado */}
      {(() => {
        const atual = ministerios.find(m => m.id === ministerioSelecionado);
        const isMeuAtual = ministerioSelecionado === usuario?.ministerioId;
        const optHoverBg = t.surfaceHover || t.accentDim;
        const optSelectedBg = optHoverBg;
        const badgeMeuStyle = {
          fontSize: "9px", fontWeight: 700, color: t.textMuted,
          background: optHoverBg, border: `1px solid ${t.border}`,
          borderRadius: "8px", padding: "1px 6px", letterSpacing: "0.3px", flexShrink: 0,
        };
        const readOnlyLegend = (extraStyle = {}) => (
          <div
            role="status"
            aria-live="polite"
            style={{
              display: "flex", alignItems: "center", gap: "5px",
              color: t.textMuted, fontSize: "10px", fontWeight: 500,
              letterSpacing: "0.15px", lineHeight: 1.2,
              ...extraStyle,
            }}
          >
            <svg
              width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>Somente leitura</span>
          </div>
        );

        return (
          <div style={{ ...s.field, position: "relative" }} ref={minDropRef}>
            <label id="min-drop-label" style={s.label}>Ministério</label>

            {/* Trigger */}
            <button
              type="button"
              aria-labelledby="min-drop-label"
              aria-haspopup="listbox"
              aria-expanded={minDropAberto}
              onClick={() => setMinDropAberto(v => !v)}
              style={{
                width: "100%", padding: "9px 12px",
                borderRadius: minDropAberto ? "6px 6px 0 0" : "6px",
                border: `1px solid ${t.border}`,
                background: t.bg, color: t.text,
                fontSize: "13px", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                cursor: "pointer", transition: "border-color 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span>{atual?.nome}</span>
                {isMeuAtual && <span style={badgeMeuStyle}>meu</span>}
              </div>
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke={t.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transition: "transform 0.2s", transform: minDropAberto ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            {/* Lista suspensa */}
            {minDropAberto && (
              <div
                role="listbox"
                aria-labelledby="min-drop-label"
                style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                  background: t.surface,
                  border: `1px solid ${t.border}`, borderTop: "none",
                  borderRadius: "0 0 6px 6px",
                  overflow: "hidden",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                }}
              >
                {!podeEditar && readOnlyLegend({
                  padding: "7px 12px 6px",
                  borderBottom: `1px solid ${t.border}`,
                })}
                {ministerios.map((m, i) => {
                  const isMeu      = m.id === usuario?.ministerioId;
                  const isSelected = ministerioSelecionado === m.id;
                  const optBg = isSelected ? optSelectedBg : "transparent";
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => { setMinisterioSelecionado(m.id); onConflito?.(null); setMinDropAberto(false); }}
                      style={{
                        width: "100%", padding: "9px 12px",
                        borderBottom: i < ministerios.length - 1 ? `1px solid ${t.border}` : "none",
                        background: optBg,
                        border: "none",
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px",
                        cursor: "pointer", fontFamily: "inherit", transition: "background 0.12s",
                        color: t.text,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = optHoverBg; }}
                      onMouseLeave={e => { e.currentTarget.style.background = optBg; }}
                      onFocus={e => { e.currentTarget.style.background = optHoverBg; }}
                      onBlur={e => { e.currentTarget.style.background = optBg; }}
                    >
                      <span style={{
                        fontSize: "13px",
                        fontWeight: isSelected ? 600 : 400,
                        color: t.text,
                      }}>
                        {m.nome}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                        {isMeu && <span style={badgeMeuStyle}>meu</span>}
                        {isSelected && (
                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke={t.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {!podeEditar && !minDropAberto && readOnlyLegend({ marginTop: "6px", padding: "0 2px" })}
          </div>
        );
      })()}


      {/* ── Função PRIMEIRO (louvor/infantil) ou junto com pessoa (outros) ── */}
      <div style={s.field}>
        <label style={s.label}>Função</label>
        <select
          className="sidebar-select"
          value={funcaoSelecionada}
          onChange={e => { setFuncao(e.target.value); onConflito?.(null); }}
          style={{ ...s.select, opacity: !podeEditar ? 0.5 : 1 }}
          disabled={!podeEditar}
        >
          <option value="">Selecione...</option>
          {funcoesDoMinisterio.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
          {usaFiltro && <option value="TODOS">TODOS (sem filtro)</option>}
        </select>
      </div>

      {/* Data — checkboxes (depende da função) */}
      <div style={s.field}>
        <label style={{ ...s.label, display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
          Data
          {datasIds.length > 0 && (
            <span style={{
              background: t.accent, color: "white",
              borderRadius: "10px", padding: "1px 6px", fontSize: "10px", fontWeight: 700,
            }}>
              {datasIds.length}
            </span>
          )}
        </label>
        {podeEditar && funcaoSelecionada && datasParaSelect.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <button
              type="button"
              onClick={selecionarTodasDatas}
              style={{
                background: "transparent", border: "none", padding: 0,
                fontSize: "11px", fontWeight: 600, color: t.accent,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Todas
            </button>
            <span style={{ color: t.border }}>·</span>
            <button
              type="button"
              onClick={limparDatasSelecionadas}
              style={{
                background: "transparent", border: "none", padding: 0,
                fontSize: "11px", fontWeight: 600, color: t.textMuted,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Nenhuma
            </button>
          </div>
        )}
        {datasHint && (
          <div style={{ marginBottom: "6px", display: "flex", alignItems: "center", gap: "5px" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 9V14M12 17.5V18M12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z"
                stroke={datasHint.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: "11px", color: datasHint.color, fontWeight: 500 }}>
              {datasHint.text}
            </span>
          </div>
        )}
        <div style={{
          borderRadius: "6px", border: `1px solid ${t.border}`,
          overflow: "hidden",
          opacity: !podeEditar || !funcaoSelecionada ? 0.5 : 1,
        }}>
          {!funcaoSelecionada ? (
            <div style={{ padding: "10px 12px", fontSize: "13px", color: t.textMuted }}>
              Selecione a função primeiro...
            </div>
          ) : datasParaLista.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: "13px", color: t.textMuted }}>
              Nenhuma data disponível
            </div>
          ) : (
            datasParaLista.map((d, i) => {
              const checked = datasIds.includes(d.id);
              return (
                <div
                  key={d.id}
                  onClick={() => toggleData(d.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "7px 10px", cursor: podeEditar ? "pointer" : "default",
                    background: checked ? t.accentDim : "transparent",
                    borderBottom: i < datasParaLista.length - 1 ? `1px solid ${t.border}` : "none",
                    transition: "background 0.1s",
                  }}
                >
                  <span style={{
                    width: "14px", height: "14px", borderRadius: "3px", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: `2px solid ${checked ? t.accent : t.border}`,
                    background: checked ? t.accent : "transparent",
                    transition: "all 0.15s",
                  }}>
                    {checked && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                        <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  <span style={{
                    fontSize: "13px",
                    color: checked ? t.text : t.textMuted,
                    fontWeight: checked ? 500 : 400,
                  }}>
                    {formatarData(d.data, d.turno, d.descricao)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Obreiro — checkboxes filtrados pela data e função */}
      <div style={s.field}>
        <label style={s.label}>
          OBREIRO(A)
          {funcaoSelecionada && datasIds.length > 0 && (
            <span style={{
              marginLeft: "6px", fontSize: "9px", fontWeight: 600,
              color: t.accent, background: t.accentDim,
              borderRadius: "8px", padding: "1px 6px",
              textTransform: "uppercase", letterSpacing: "0.3px",
            }}>
              {qtdDisponiveisObreiros} disponíveis
            </span>
          )}
        </label>
        <div style={{
          borderRadius: "6px", border: `1px solid ${t.border}`,
          overflow: "hidden",
          opacity: !podeEditar || datasIds.length === 0 ? 0.5 : 1,
        }}>
          {datasIds.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: "13px", color: t.textMuted }}>
              Selecione ao menos uma data
            </div>
          ) : obreirosLista.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: "13px", color: t.textMuted }}>
              Nenhum obreiro disponível para {datasIds.length === 1 ? "esta data" : "estas datas"} e função
            </div>
          ) : (
            obreirosLista.map((nome, i) => {
              const checked = pessoasMarcadas.includes(nome);
              const rotulo = nome === "Disponível" ? "✦ DISPONÍVEL" : nomeParaExibicao(nome);
              return (
                <div
                  key={nome}
                  onClick={() => toggleObreiro(nome)}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "7px 10px", cursor: podeEditar ? "pointer" : "default",
                    background: checked ? t.accentDim : "transparent",
                    borderBottom: i < obreirosLista.length - 1 ? `1px solid ${t.border}` : "none",
                    transition: "background 0.1s",
                  }}
                >
                  <span style={{
                    width: "14px", height: "14px", borderRadius: "3px", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: `2px solid ${checked ? t.accent : t.border}`,
                    background: checked ? t.accent : "transparent",
                    transition: "all 0.15s",
                  }}>
                    {checked && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                        <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  <span style={{
                    fontSize: "13px",
                    color: checked ? t.text : t.textMuted,
                    fontWeight: checked ? 500 : 400,
                  }}>
                    {rotulo}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Botão confirmar */}
      <button
        onClick={handleConfirmarEscala}
        disabled={salvando || !podeEditar}
        style={{
          width: "100%", padding: "12px", borderRadius: "6px",
          border: `1px solid ${t.border}`,
          background: "transparent",
          color: salvando || !podeEditar ? t.textDim : t.textMuted,
          fontSize: "14px", fontWeight: 600,
          cursor: salvando || !podeEditar ? "not-allowed" : "pointer",
          fontFamily: "inherit", letterSpacing: "-0.2px",
          transition: "all 0.15s", marginBottom: "8px",
          opacity: !podeEditar ? 0.5 : 1,
        }}
        onMouseEnter={e => {
          if (!salvando && podeEditar) {
            e.currentTarget.style.background = "rgba(52,211,153,0.12)";
            e.currentTarget.style.borderColor = "rgba(52,211,153,0.55)";
            e.currentTarget.style.color = "#34d399";
          }
        }}
        onMouseLeave={e => {
          if (!salvando && podeEditar) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = t.border;
            e.currentTarget.style.color = t.textMuted;
          }
        }}
      >
        {salvando
          ? "Salvando..."
          : (() => {
              const total = datasIds.length * pessoasMarcadas.length;
              return total > 1 ? `Confirmar ${total} escalas` : "Confirmar escala";
            })()}
      </button>

      {/* Botão limpar */}
      <button
        onClick={() => {
          setPessoasMarcadas([]);
          setFuncao("");
          setDatasIds([]);
          setDatasConfirmadas([]);
          onConflito?.(null);
        }}
        disabled={!podeEditar}
        style={{
          width: "100%", padding: "10px", borderRadius: "6px",
          border: `1px solid ${t.border}`,
          background: "transparent",
          color: !podeEditar ? t.textDim : t.textMuted,
          fontSize: "14px", fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => {
          if (podeEditar) {
            e.currentTarget.style.background = "rgba(248,113,113,0.12)";
            e.currentTarget.style.borderColor = "rgba(248,113,113,0.5)";
            e.currentTarget.style.color = "#f87171";
          }
        }}
        onMouseLeave={e => {
          if (podeEditar) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = t.border;
            e.currentTarget.style.color = t.textMuted;
          }
        }}
      >
        Limpar seleção
      </button>

      {/* ─── Cultos Extras ─────────────────────────────────────────────── */}
      {podeEditar && (
        <div style={{ marginTop: "22px", paddingTop: "18px", borderTop: `1px solid ${t.border}` }}>

          {/* Header acordeão */}
          <button
            onClick={() => setExtrasAberta(v => !v)}
            style={{
              width: "100%", display: "flex", alignItems: "center",
              justifyContent: "space-between",
              background: "none", border: "none", padding: "0",
              cursor: "pointer", fontFamily: "inherit",
              marginBottom: extrasAberta ? "12px" : "0",
            }}
          >
            <span style={{
              fontSize: "11px", fontWeight: 600, color: t.textMuted,
              textTransform: "uppercase", letterSpacing: "0.6px",
              display: "flex", alignItems: "center", gap: "7px",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
                  stroke={t.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 14h.01M8 14h.01M16 14h.01M12 18h.01M8 18h.01M16 18h.01"
                  stroke={t.textMuted} strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              Cultos Extras
              {extrasDoMes.length > 0 && (
                <span style={{
                  background: t.accent, color: "white",
                  borderRadius: "10px", padding: "1px 6px",
                  fontSize: "10px", fontWeight: 700,
                }}>
                  {extrasDoMes.length}
                </span>
              )}
            </span>
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke={t.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: "transform 0.2s", transform: extrasAberta ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
            >
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>

          {/* Conteúdo colapsável */}
          <div style={{ display: extrasAberta ? "block" : "none" }}>

            {/* Formulário de adição */}
            <div style={{ marginBottom: "10px" }}>
              <select
                value={novoExtra.nome}
                onChange={e => setNovoExtra(prev => ({ ...prev, nome: e.target.value }))}
                style={{
                  width: "100%", padding: "8px 10px", borderRadius: "6px",
                  border: `1px solid ${novoExtra.nome ? t.accent : t.border}`,
                  background: t.bg, color: novoExtra.nome ? t.text : t.textMuted,
                  fontSize: "13px", fontFamily: "inherit", outline: "none",
                  cursor: "pointer", marginBottom: "6px",
                  transition: "border-color 0.15s",
                }}
              >
                <option value="">Tipo de culto...</option>
                {TIPOS_EXTRA.map(tipo => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
              <input
                type="date"
                min={mesMinMax.min}
                max={mesMinMax.max}
                value={novoExtra.data}
                onChange={e => setNovoExtra(prev => ({ ...prev, data: e.target.value }))}
                style={{
                  width: "100%", padding: "8px 10px", borderRadius: "6px",
                  border: `1px solid ${novoExtra.data ? t.accent : t.border}`,
                  background: t.bg, color: t.text, fontSize: "13px",
                  fontFamily: "inherit", outline: "none",
                  marginBottom: "6px", transition: "border-color 0.15s",
                  colorScheme: "dark",
                }}
              />
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={handleAdicionarExtra}
                  disabled={!novoExtra.data || adicionandoExtra}
                  style={{
                    padding: "8px 14px", borderRadius: "6px", cursor: "pointer",
                    background: !novoExtra.data || adicionandoExtra ? t.borderLight : t.accent,
                    border: "none",
                    color: !novoExtra.data || adicionandoExtra ? t.textDim : "white",
                    fontSize: "13px", fontWeight: 600, fontFamily: "inherit",
                    transition: "all 0.15s", flexShrink: 0,
                  }}
                  onMouseEnter={e => {
                    if (novoExtra.data && !adicionandoExtra)
                      e.currentTarget.style.background = "#4f52d9";
                  }}
                  onMouseLeave={e => {
                    if (novoExtra.data && !adicionandoExtra)
                      e.currentTarget.style.background = t.accent;
                  }}
                >
                  {adicionandoExtra ? "..." : "+ Add"}
                </button>
              </div>
            </div>

            {/* Lista de extras existentes */}
            {extrasDoMes.length === 0 ? (
              <p style={{
                fontSize: "12px", color: t.textMuted, textAlign: "center",
                padding: "10px 0", fontStyle: "italic",
              }}>
                Nenhum culto extra neste mês
              </p>
            ) : (
              <div style={{
                borderRadius: "6px", border: `1px solid ${t.border}`,
                overflow: "hidden",
              }}>
                {extrasDoMes.map((e, i) => (
                  <div
                    key={e.id}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "7px 10px",
                      borderBottom: i < extrasDoMes.length - 1 ? `1px solid ${t.border}` : "none",
                      background: "transparent",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "7px", minWidth: 0 }}>
                      <span style={{
                        width: "5px", height: "5px", borderRadius: "50%",
                        background: t.accent, flexShrink: 0,
                      }} />
                      <div style={{ minWidth: 0 }}>
                        {e.descricao && (
                          <div style={{
                            fontSize: "11px", fontWeight: 700, color: t.accent,
                            textTransform: "uppercase", letterSpacing: "0.3px",
                            lineHeight: 1.3,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {e.descricao}
                          </div>
                        )}
                        <div style={{ fontSize: "11px", color: t.textMuted, fontWeight: 400, lineHeight: 1.4 }}>
                          {formatarData(e.data, e.turno)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoverExtra(e.firestoreId)}
                      title="Remover culto extra"
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: t.textMuted, padding: "2px 5px", borderRadius: "4px",
                        fontSize: "14px", lineHeight: 1, fontFamily: "inherit",
                        transition: "color 0.15s, background 0.15s",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = t.danger;
                        e.currentTarget.style.background = t.dangerDim;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = t.textMuted;
                        e.currentTarget.style.background = "none";
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modo TODOS: portal em document.body — fixed centralizado na viewport (sidebar usa filter/transform) */}
      {modalEscolhaFuncao.aberto && createPortal(
        <div
          role="presentation"
          onClick={() => { if (!salvando) setModalEscolhaFuncao({ aberto: false, opcoes: [] }); }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "max(16px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) max(16px, env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px))",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-escolha-funcao"
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "400px",
              maxHeight: "min(90vh, 560px)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              background: "rgba(14,14,27,0.98)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: `1px solid ${t.accentBorder}`,
              borderRadius: "12px",
              padding: "22px",
              boxShadow: "0 16px 48px rgba(0,0,0,0.45)",
            }}
          >
            <p
              id="titulo-escolha-funcao"
              style={{ fontSize: "15px", fontWeight: 600, color: t.text, marginBottom: "8px", lineHeight: 1.35 }}
            >
              Em qual função quer escalar?
            </p>
            <p style={{ fontSize: "12px", color: t.textMuted, marginBottom: "16px", lineHeight: 1.45, flexShrink: 0 }}>
              Você está no modo sem filtro. Escolha a função para aplicar na data selecionada.
            </p>
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              marginBottom: "14px",
              overflowY: "auto",
              flex: "1 1 auto",
              minHeight: 0,
              WebkitOverflowScrolling: "touch",
            }}>
              {modalEscolhaFuncao.opcoes.map(fn => (
                <button
                  key={fn}
                  type="button"
                  disabled={salvando}
                  onClick={async () => {
                    setModalEscolhaFuncao({ aberto: false, opcoes: [] });
                    if (!(await confirmarLimiteInfantilSeNecessario(fn))) return;
                    await confirmarEscalaComFuncao(fn);
                  }}
                  style={{
                    width: "100%", textAlign: "left",
                    padding: "11px 14px", borderRadius: "8px",
                    border: `1px solid ${t.border}`,
                    background: t.bg,
                    color: t.text,
                    fontSize: "13px", fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: salvando ? "not-allowed" : "pointer",
                    opacity: salvando ? 0.55 : 1,
                    transition: "border-color 0.15s, background 0.15s",
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => {
                    if (!salvando) {
                      e.currentTarget.style.borderColor = t.accent;
                      e.currentTarget.style.background = t.accentDim;
                    }
                  }}
                  onMouseLeave={e => {
                    if (!salvando) {
                      e.currentTarget.style.borderColor = t.border;
                      e.currentTarget.style.background = t.bg;
                    }
                  }}
                >
                  {fn}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={salvando}
              onClick={() => setModalEscolhaFuncao({ aberto: false, opcoes: [] })}
              style={{
                width: "100%", padding: "9px",
                borderRadius: "8px",
                border: `1px solid ${t.border}`,
                background: "transparent",
                color: t.textMuted,
                fontSize: "12px", fontWeight: 600, fontFamily: "inherit",
                cursor: salvando ? "not-allowed" : "pointer",
                flexShrink: 0,
              }}
            >
              Cancelar
            </button>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
