// ===== src/components/BotaoInserirEscala.jsx =====
import { useState } from "react";
import ModalInserirEscala from "./ModalInserirEscala";

export default function BotaoInserirEscala({
  dataObj,
  funcao,
  ministerioSelecionado,
  usuario,
  onSuccess,
  disabled
}) {
  const [modalAberto, setModalAberto] = useState(false);

  if (disabled) return null;

  return (
    <>
      <button
        onClick={() => setModalAberto(true)}
        style={{
          background: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "20px",
          padding: "6px 12px",
          fontSize: "12px",
          cursor: "pointer",
          marginTop: "4px",
          width: "100%"
        }}
      >
        + Escalar
      </button>

      <ModalInserirEscala
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        dataObj={dataObj}
        funcao={funcao}
        ministerioSelecionado={ministerioSelecionado}
        usuario={usuario}
        onSuccess={onSuccess}
      />
    </>
  );
}