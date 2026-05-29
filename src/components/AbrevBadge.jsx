import { getTomAbrev } from "../utils/gridAbreviacoes";

/**
 * Badge visual para siglas de designação na planilha (T, P, S, B, M, etc.).
 * Cores via CSS (--abrev-badge-*) para suporte a tema claro e escuro.
 */
export default function AbrevBadge({ ministerioId, abrev, variant = "cell" }) {
  if (!abrev) return null;

  const tom = getTomAbrev(ministerioId, abrev);
  const className = [
    "abrev-badge",
    tom ? `abrev-badge--${tom}` : "abrev-badge--neutral",
    variant === "legend" ? "abrev-badge--legend" : "abrev-badge--cell",
  ]
    .filter(Boolean)
    .join(" ");

  return <span className={className}>{abrev}</span>;
}
