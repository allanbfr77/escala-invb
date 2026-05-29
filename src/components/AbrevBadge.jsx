import { getTomAbrev } from "../utils/gridAbreviacoes";

/**
 * Badge visual para siglas de designação na planilha (T, P, S, B, M, etc.).
 * Cores via CSS (--abrev-badge-*) para suporte a tema claro e escuro.
 */
export default function AbrevBadge({ ministerioId, abrev, variant = "cell" }) {
  const sigla = abrev != null ? String(abrev).trim().toUpperCase() : "";
  if (!sigla || !ministerioId) return null;

  const tom = getTomAbrev(ministerioId, sigla);
  const className = [
    "abrev-badge",
    tom ? `abrev-badge--${tom}` : "abrev-badge--neutral",
    variant === "legend" ? "abrev-badge--legend" : "abrev-badge--cell",
  ]
    .filter(Boolean)
    .join(" ");

  return <span className={className}>{sigla}</span>;
}
