// ===== src/components/BotaoVoltar.jsx =====
import { ArrowLeft } from "lucide-react";

/**
 * Botão de voltar padrão do projeto:
 * círculo com seta + rótulo "VOLTAR" abaixo.
 */
export default function BotaoVoltar({
  onClick,
  label = "VOLTAR",
  title = "Voltar",
  disabled = false,
  className = "",
}) {
  return (
    <button
      type="button"
      className={`btn-voltar${className ? ` ${className}` : ""}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      <span className="btn-voltar-circulo" aria-hidden>
        <ArrowLeft size={18} />
      </span>
      <span className="btn-voltar-label">{label}</span>
    </button>
  );
}
