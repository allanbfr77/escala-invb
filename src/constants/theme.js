/** RGB do dourado principal (#d4af37), para rgba(...) consistentes */
export const ACCENT_RGB = "212, 175, 55";

/** Retorna rgba do accent com opacidade entre 0 e 1 */
export function accentAlpha(opacity) {
  return `rgba(${ACCENT_RGB},${opacity})`;
}

export const theme = {
  bg: "#070708",
  surface: "#111113",
  /** Painéis com blur sobre o fundo */
  surfaceTranslucent: "rgba(17,17,19,0.72)",
  surfaceHover: "#1a1712",
  border: "#2a241c",
  borderLight: "#3d3428",
  accent: "#d4af37",
  accentMuted: "#c9a961",
  accentBright: "#f0dc82",
  accentDeep: "#8b6914",
  accentGradientEnd: "#a67c00",
  /** Texto sobre fundo dourado (contraste) */
  accentOnAccent: "#141210",
  accentDim: accentAlpha(0.14),
  accentGlow: accentAlpha(0.08),
  accentBorder: accentAlpha(0.18),
  accentZebra: accentAlpha(0.045),
  accentHoverBg: accentAlpha(0.09),
  accentSelectedBg: accentAlpha(0.22),
  accentShadowStrong: accentAlpha(0.4),
  accentFocusRing: accentAlpha(0.22),
  /** Células "disponível" na grade (roxo suave no tema escuro) */
  slotAvailable: "#c5b4e8",
  text: "#f2eee6",
  textMuted: "#9e988c",
  textDim: "#4d483e",
  danger: "#e57373",
  dangerDim: "rgba(229,115,115,0.12)",
  success: "#81c784",
  successDim: "rgba(129,199,132,0.12)",
};

/** RGB do dourado do tema light (mais escuro para contraste) */
const ACCENT_LIGHT_RGB = "184, 134, 11";

function accentLightAlpha(opacity) {
  return `rgba(${ACCENT_LIGHT_RGB},${opacity})`;
}

export const themeLight = {
  bg: "#f5f2ec",
  surface: "#ffffff",
  /** Painéis com blur sobre o fundo */
  surfaceTranslucent: "rgba(255,255,255,0.80)",
  surfaceHover: "#fdf8ee",
  border: "#e5dcc8",
  borderLight: "#d6c9a8",
  accent: "#b8860b",
  accentMuted: "#c9a040",
  accentBright: "#d4af37",
  accentDeep: "#7a5c00",
  accentGradientEnd: "#9a6f00",
  /** Texto sobre fundo dourado (contraste) */
  accentOnAccent: "#ffffff",
  accentDim: accentLightAlpha(0.12),
  accentGlow: accentLightAlpha(0.07),
  accentBorder: accentLightAlpha(0.20),
  accentZebra: accentLightAlpha(0.04),
  accentHoverBg: accentLightAlpha(0.08),
  accentSelectedBg: accentLightAlpha(0.18),
  accentShadowStrong: accentLightAlpha(0.30),
  accentFocusRing: accentLightAlpha(0.22),
  /** Células "disponível" na grade (roxo mais escuro para contraste no fundo claro) */
  slotAvailable: "#7c5cbf",
  text: "#1a1610",
  textMuted: "#6b6358",
  textDim: "#b0a898",
  danger: "#c0392b",
  dangerDim: "rgba(192,57,43,0.10)",
  success: "#2e7d32",
  successDim: "rgba(46,125,50,0.10)",
};