import { useEffect, useRef } from "react";

/** Hash routes for in-app navigation (shareable URLs). */
export const HASH_SECTIONS = {
  LOGIN: "login",
  PLANILHA: "planilha",
  OUTROS_MINISTERIOS: "outros-ministerios",
  RELATORIO: "relatorio",
  RELATORIO_GERAL: "relatorio-geral",
};

const DASHBOARD_SECTIONS = new Set([
  HASH_SECTIONS.PLANILHA,
  HASH_SECTIONS.OUTROS_MINISTERIOS,
  HASH_SECTIONS.RELATORIO,
]);

/** @returns {string|null} */
export function parseAppHash(hash = typeof window !== "undefined" ? window.location.hash : "") {
  const raw = hash.replace(/^#/, "").toLowerCase();
  if (!raw) return null;
  if (raw === "home") return HASH_SECTIONS.PLANILHA;
  if (Object.values(HASH_SECTIONS).includes(raw)) return raw;
  return null;
}

export function getDefaultHashForUser(master) {
  return master ? HASH_SECTIONS.RELATORIO_GERAL : HASH_SECTIONS.PLANILHA;
}

export function hasExplicitHash(hash = typeof window !== "undefined" ? window.location.hash : "") {
  return hash.replace(/^#/, "").length > 0;
}

/**
 * Hash na URL tem prioridade sobre o estado em memória (links em nova aba).
 * @param {"escala"|"relatorio"|null} view
 * @param {boolean} master
 * @returns {"escala"|"relatorio"}
 */
export function resolveActiveView(view, master) {
  const hash = parseAppHash();
  if (hash === HASH_SECTIONS.RELATORIO_GERAL && master) return "relatorio";
  if (hash && isDashboardHash(hash)) return "escala";
  if (view === "relatorio" || view === "escala") return view;
  return master ? "relatorio" : "escala";
}

export function isDashboardHash(section) {
  return DASHBOARD_SECTIONS.has(section);
}

/**
 * @param {string} section
 * @param {{ replace?: boolean }} [opts]
 */
export function setAppHash(section, { replace = false } = {}) {
  if (typeof window === "undefined") return;
  const next = section ? `#${section}` : "";
  if (window.location.hash === next) return;
  if (replace) {
    const url = `${window.location.pathname}${window.location.search}${next}`;
    window.history.replaceState(null, "", url);
    return;
  }
  window.location.hash = section || "";
}

export function dashboardSectionFromFlags(verRelatorio, verOutrosMinisterios) {
  if (verRelatorio) return HASH_SECTIONS.RELATORIO;
  if (verOutrosMinisterios) return HASH_SECTIONS.OUTROS_MINISTERIOS;
  return HASH_SECTIONS.PLANILHA;
}

export function dashboardFlagsFromSection(section) {
  return {
    verRelatorio: section === HASH_SECTIONS.RELATORIO,
    verOutrosMinisterios: section === HASH_SECTIONS.OUTROS_MINISTERIOS,
  };
}

/**
 * Keeps Dashboard sub-views in sync with `window.location.hash`.
 */
export function useDashboardHashSync(verRelatorio, verOutrosMinisterios, setVerRelatorio, setVerOutrosMinisterios) {
  const skipPushRef = useRef(false);
  const ignoreFirstStatePushRef = useRef(true);
  const flagsRef = useRef({ verRelatorio, verOutrosMinisterios });
  flagsRef.current = { verRelatorio, verOutrosMinisterios };

  useEffect(() => {
    const applyFromHash = () => {
      const section = parseAppHash();
      if (!section || !isDashboardHash(section)) return;
      const flags = dashboardFlagsFromSection(section);
      const current = flagsRef.current;
      if (flags.verRelatorio === current.verRelatorio && flags.verOutrosMinisterios === current.verOutrosMinisterios) {
        return;
      }
      skipPushRef.current = true;
      setVerRelatorio(flags.verRelatorio);
      setVerOutrosMinisterios(flags.verOutrosMinisterios);
    };

    applyFromHash();
    window.addEventListener("hashchange", applyFromHash);
    return () => window.removeEventListener("hashchange", applyFromHash);
  }, [setVerRelatorio, setVerOutrosMinisterios]);

  useEffect(() => {
    if (ignoreFirstStatePushRef.current) {
      ignoreFirstStatePushRef.current = false;
      return;
    }
    if (skipPushRef.current) {
      skipPushRef.current = false;
      return;
    }
    const section = dashboardSectionFromFlags(verRelatorio, verOutrosMinisterios);
    if (parseAppHash() !== section) setAppHash(section);
  }, [verRelatorio, verOutrosMinisterios]);
}
