import { useEffect, useMemo, useState } from "react";
import { chamadaEbdPorMes, pessoasEbd } from "../data/ebd";
import { domingosDoMes } from "../utils/ebdChamada";
import {
  buscarChamadaEbdNaPlanilha,
  configPlanilhaEbd,
  gravarCacheChamadaEbd,
  lerCacheChamadaEbd,
} from "../utils/ebdSheets";

function fallbackLocal(mes) {
  const local = chamadaEbdPorMes[mes];
  return {
    domingos: local?.domingos ?? domingosDoMes(mes),
    presencas: local?.presencas ?? {},
    nomes: local ? Object.keys(local.presencas) : pessoasEbd,
    fonte: "local",
    atualizadoEm: null,
  };
}

/**
 * Carrega a chamada EBD via Apps Script e guarda no navegador (localStorage).
 * Não usa Firestore.
 */
export function useChamadaEbd(mes) {
  const { webAppUrl, habilitado } = useMemo(() => configPlanilhaEbd(), []);
  const cacheInicial = useMemo(
    () => (habilitado ? lerCacheChamadaEbd(webAppUrl, mes) : null),
    [habilitado, webAppUrl, mes]
  );

  const [dados, setDados] = useState(() => cacheInicial || fallbackLocal(mes));
  const [loading, setLoading] = useState(() => habilitado && !cacheInicial);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const cache = habilitado ? lerCacheChamadaEbd(webAppUrl, mes) : null;
    setDados(cache || fallbackLocal(mes));
    setErro("");

    if (!habilitado || !mes) {
      setLoading(false);
      return undefined;
    }

    const ac = new AbortController();
    setLoading(!cache);

    buscarChamadaEbdNaPlanilha(mes, { signal: ac.signal })
      .then((resultado) => {
        gravarCacheChamadaEbd(webAppUrl, mes, resultado);
        setDados(resultado);
        setErro("");
      })
      .catch((err) => {
        if (ac.signal.aborted) return;
        setErro(err?.message || "Falha ao ler a planilha");
        if (!cache) setDados(fallbackLocal(mes));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [mes, habilitado, webAppUrl]);

  return { ...dados, loading, erro, planilhaHabilitada: habilitado };
}
