import { nomeEbdParaSistema, normalizarStatusEbd, domingosDoMes } from "./ebdChamada";

const CACHE_PREFIX = "escala-igreja:ebd-apps-script:";

export function configPlanilhaEbd() {
  const webAppUrl = String(import.meta.env.VITE_EBD_APPS_SCRIPT_URL || "").trim().replace(/\/+$/, "");
  return { webAppUrl, habilitado: Boolean(webAppUrl) };
}

function chaveCache(webAppUrl, mes) {
  return `${CACHE_PREFIX}${webAppUrl}:${mes}`;
}

export function lerCacheChamadaEbd(webAppUrl, mes) {
  if (typeof window === "undefined" || !webAppUrl || !mes) return null;
  try {
    const bruto = window.localStorage.getItem(chaveCache(webAppUrl, mes));
    if (!bruto) return null;
    const parsed = JSON.parse(bruto);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function gravarCacheChamadaEbd(webAppUrl, mes, payload) {
  if (typeof window === "undefined" || !webAppUrl || !mes) return;
  try {
    window.localStorage.setItem(
      chaveCache(webAppUrl, mes),
      JSON.stringify({
        ...payload,
        atualizadoEm: payload.atualizadoEm || new Date().toISOString(),
      })
    );
  } catch {
    /* quota / modo privado */
  }
}

async function lerJson(res) {
  const texto = await res.text();
  try {
    return JSON.parse(texto);
  } catch {
    throw new Error("Resposta inválida do Apps Script");
  }
}

/**
 * GET é simple request (sem preflight). Usar só query string.
 */
async function getAcao(webAppUrl, action, params, signal) {
  const qs = new URLSearchParams({ action, ...params });
  const res = await fetch(`${webAppUrl}?${qs.toString()}`, { method: "GET", signal });
  const json = await lerJson(res);
  if (!res.ok || json.ok === false) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json.data;
}

/**
 * POST com text/plain + JSON no corpo — simple request, evita OPTIONS.
 * Apps Script não responde preflight; não use application/json.
 */
export async function postAcaoEbd(action, payload, signal) {
  const { webAppUrl, habilitado } = configPlanilhaEbd();
  if (!habilitado) throw new Error("Apps Script da EBD não configurado");
  const res = await fetch(webAppUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...payload }),
    signal,
  });
  const json = await lerJson(res);
  if (!res.ok || json.ok === false) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json.data;
}

export function adaptarGetMonth(data, mes) {
  const dates = [...(data?.dates || [])]
    .map((d) => String(d || "").trim())
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d.startsWith(mes))
    .sort();
  const domingos = dates.length ? dates : domingosDoMes(mes);
  const grid = data?.grid || {};
  const nomes = [];
  const presencas = {};

  for (const nomePlanilha of data?.students || []) {
    const sistema = nomeEbdParaSistema(nomePlanilha);
    if (!sistema) continue;
    if (!nomes.includes(sistema)) nomes.push(sistema);
    const rec = grid[nomePlanilha] || {};
    presencas[sistema] = domingos.map((dataIso) => normalizarStatusEbd(rec[dataIso]));
  }

  return { domingos, presencas, nomes };
}

/**
 * Lê a chamada do mês via Apps Script (ação getMonth).
 * Cópia fica só no navegador — não grava no Firestore.
 */
export async function buscarChamadaEbdNaPlanilha(mes, { signal } = {}) {
  const { webAppUrl, habilitado } = configPlanilhaEbd();
  if (!habilitado) throw new Error("Apps Script da EBD não configurado");
  if (!/^\d{4}-\d{2}$/.test(mes)) throw new Error("Mês inválido");

  const data = await getAcao(webAppUrl, "getMonth", { month: mes }, signal);
  return {
    ...adaptarGetMonth(data, mes),
    fonte: "apps-script",
    atualizadoEm: new Date().toISOString(),
  };
}
