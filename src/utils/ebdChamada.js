import { pessoasPorMinisterio } from "../data/pessoas";
import { pessoasEbd } from "../data/ebd";
import { pessoaNomeFirestore } from "./nomeExibicao";

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
export function alunosEbdDoMinisterio(ministerioId) {
  const doMinisterio = pessoasPorMinisterio[ministerioId] || [];
  const ebdSet = new Set(pessoasEbd.map((nome) => pessoaNomeFirestore(nome)));
  return doMinisterio.filter((nome) => ebdSet.has(pessoaNomeFirestore(nome)));
}

/** Registros de presença da pessoa no mês, alinhados aos domingos. */
export function registrosEbdDaPessoa(presencas, nome, qtdDomingos) {
  const vazio = Array.from({ length: qtdDomingos }, () => null);
  if (!presencas) return vazio;
  if (Array.isArray(presencas[nome])) return presencas[nome];
  const chave = pessoaNomeFirestore(nome);
  const entrada = Object.entries(presencas).find(([k]) => pessoaNomeFirestore(k) === chave);
  return entrada ? entrada[1] : vazio;
}
