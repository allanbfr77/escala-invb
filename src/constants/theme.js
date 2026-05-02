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
  /** Células “disponível” na grade (roxo suave no tema escuro) */
  slotAvailable: "#c5b4e8",
  text: "#f2eee6",
  textMuted: "#9e988c",
  textDim: "#4d483e",
  danger: "#e57373",
  dangerDim: "rgba(229,115,115,0.12)",
  success: "#81c784",
  successDim: "rgba(129,199,132,0.12)",
};
