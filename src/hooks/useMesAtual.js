import { useEffect, useState } from "react";
import { getMesAtual } from "../utils/mesHelpers";

/** Mês civil atual (YYYY-MM), atualizado quando o calendário muda de mês. */
export function useMesAtual() {
  const [mes, setMes] = useState(getMesAtual);

  useEffect(() => {
    const sync = () => {
      const atual = getMesAtual();
      setMes((prev) => (prev === atual ? prev : atual));
    };

    const id = setInterval(sync, 60_000);
    document.addEventListener("visibilitychange", sync);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return mes;
}
