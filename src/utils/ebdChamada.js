import { pessoasPorMinisterio } from "../data/pessoas";

/** Nomes da planilha EBD → grafia do sistema. */
const EBD_NOME_ALIASES = {
  "anna beatriz": "A. BEATRIZ",
  "a. beatriz": "A. BEATRIZ",
  "cris medeiros": "CRIS",
  "dalila (lia)": "LIA",
  "dalila": "LIA",
  "luciana fernandes": "LUCIANA F.",
  "luciana f.": "LUCIANA F.",
  "marcio santos": "MARCIO",
  "pra. daniela neves": "DANIELA",
  "pra daniela neves": "DANIELA",
  "daniela neves": "DANIELA",
  "raphaela neves": "RAPHAELA",
  "vanessa honorato": "VANESSA H.",
  "vanessa h.": "VANESSA H.",
  "vanessa rocha": "VANESSA R.",
  "vanessa r.": "VANESSA R.",
  "welington": "WELLINGTON",
};

function chaveNome(nome) {
  return String(nome || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

const PESSOAS_SISTEMA = [...new Set(Object.values(pessoasPorMinisterio).flat())];
const POR_CHAVE_SISTEMA = new Map(PESSOAS_SISTEMA.map((n) => [chaveNome(n), n]));

/**
 * Converte o nome da planilha para o nome do sistema.
 * Retorna null se a pessoa não existir em nenhum ministério.
 */
export function nomeEbdParaSistema(nomePlanilha) {
  const chave = chaveNome(nomePlanilha);
  if (!chave || chave === "aluno" || chave === "nome" || chave === "obreiro") return null;
  const alias = EBD_NOME_ALIASES[chave];
  if (alias) return POR_CHAVE_SISTEMA.get(chaveNome(alias)) ?? alias;
  return POR_CHAVE_SISTEMA.get(chave) ?? null;
}

const STATUS_VALIDOS = new Set(["P", "A", "J", "F", "FH"]);

export function normalizarStatusEbd(valor) {
  const bruto = String(valor || "").trim().toUpperCase();
  if (!bruto || bruto === "—" || bruto === "-" || bruto === "–") return null;
  if (STATUS_VALIDOS.has(bruto)) return bruto;
  const chave = chaveNome(bruto);
  if (chave === "presente" || chave === "p") return "P";
  if (chave === "atrasado" || chave === "a") return "A";
  if (chave === "justificado" || chave === "j") return "J";
  if (chave === "falta" || chave === "f") return "F";
  if (chave === "falta no horario" || chave === "fh") return "FH";
  return null;
}

/** Status de presença na chamada EBD. */
export const STATUS_EBD = {
  P: { label: "Presente", cor: "#22c55e" },
  A: { label: "Atrasado", cor: "#f59e0b" },
  J: { label: "Justificado", cor: "#3b82f6" },
  F: { label: "Falta", cor: "#ef4444" },
  FH: { label: "Falta no Horário", cor: "#a855f7" },
};

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** @param {string} mes YYYY-MM */
export function rotuloMesEbd(mes) {
  const [ano, mm] = mes.split("-");
  const idx = Number(mm) - 1;
  return `${MESES_PT[idx] ?? mm} ${ano}`;
}

/** @param {string} dataISO YYYY-MM-DD */
export function rotuloDomingoCurto(dataISO) {
  const [, , dia] = dataISO.split("-");
  return `Dom ${dia}`;
}

/** Domingos de um mês civil (YYYY-MM). */
export function domingosDoMes(mes) {
  const [ano, mm] = mes.split("-").map(Number);
  const ultimoDia = new Date(ano, mm, 0).getDate();
  const domingos = [];
  for (let d = 1; d <= ultimoDia; d++) {
    const dt = new Date(ano, mm - 1, d);
    if (dt.getDay() === 0) {
      domingos.push(`${ano}-${String(mm).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
  }
  return domingos;
}

/** Percentual de presença (P + A contam como presente). */
export function calcularPresencaPct(registros) {
  const comDado = registros.filter(Boolean);
  if (!comDado.length) return null;
  const presentes = comDado.filter((s) => s === "P" || s === "A").length;
  return Math.round((presentes / comDado.length) * 100);
}

/** Obreiros do ministério que também estão na chamada EBD. */
export function alunosEbdDoMinisterio(ministerioId, nomesEbd = []) {
  const doMinisterio = pessoasPorMinisterio[ministerioId] || [];
  const ebdSet = new Set(nomesEbd.map((nome) => chaveNome(nome)));
  return doMinisterio.filter((nome) => ebdSet.has(chaveNome(nome)));
}

/** Registros de presença da pessoa no mês, alinhados aos domingos. */
export function registrosEbdDaPessoa(presencas, nome, qtdDomingos) {
  const vazio = Array.from({ length: qtdDomingos }, () => null);
  if (!presencas) return vazio;
  if (Array.isArray(presencas[nome])) {
    const arr = presencas[nome].slice(0, qtdDomingos);
    while (arr.length < qtdDomingos) arr.push(null);
    return arr;
  }
  const chave = chaveNome(nome);
  const entrada = Object.entries(presencas).find(([k]) => chaveNome(k) === chave);
  return entrada ? entrada[1] : vazio;
}
