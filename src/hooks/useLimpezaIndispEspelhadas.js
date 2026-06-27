import { useEffect, useRef } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { getIntervaloMes } from "../utils/relatorioUnificado";
import { chaveEscalaCruzada } from "../utils/escalasCruzadas";
import { turnoSalvoEscala } from "../utils/escalaDisponibilidade";
import { removerIndisponibilidadeEspelhada } from "../utils/indisponibilidadeSync";

function montarMapaEscalas(docs) {
  const map = new Map();

  for (const docSnap of docs || []) {
    const d = docSnap.data();
    if (!d?.pessoaNome || !d?.data || !d?.ministerioId) continue;

    const turno = turnoSalvoEscala({ turno: d.turno });
    const key = chaveEscalaCruzada(d.pessoaNome, d.data, turno);
    map.set(key, {
      pessoaNome: d.pessoaNome,
      data: d.data,
      turno,
      ministerioId: d.ministerioId,
    });
  }

  return map;
}

/**
 * Quando uma escala é removida, limpa indisponibilidades espelhadas
 * nos outros ministérios da mesma pessoa (restos do botão "Detectar").
 */
export function useLimpezaIndispEspelhadas(mes, enabled = true) {
  const mapaAnteriorRef = useRef(new Map());
  const limpandoRef = useRef(false);

  useEffect(() => {
    if (!enabled || !mes) {
      mapaAnteriorRef.current = new Map();
      return undefined;
    }

    const { inicio, fim } = getIntervaloMes(mes);
    const q = query(
      collection(db, "escalas"),
      where("data", ">=", inicio),
      where("data", "<=", fim)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const mapaAtual = montarMapaEscalas(snap.docs);
      const mapaAnterior = mapaAnteriorRef.current;

      if (mapaAnterior.size > 0 && !limpandoRef.current) {
        const removidas = [];

        for (const [key, entrada] of mapaAnterior) {
          if (!mapaAtual.has(key)) removidas.push(entrada);
        }

        if (removidas.length > 0) {
          limpandoRef.current = true;
          try {
            await Promise.all(
              removidas.map((entrada) =>
                removerIndisponibilidadeEspelhada({
                  pessoaNome: entrada.pessoaNome,
                  data: entrada.data,
                  turno: entrada.turno,
                  ministerioOrigem: entrada.ministerioId,
                })
              )
            );
          } catch (err) {
            console.error("Erro ao limpar indisponibilidades espelhadas:", err);
          } finally {
            limpandoRef.current = false;
          }
        }
      }

      mapaAnteriorRef.current = mapaAtual;
    });

    return unsub;
  }, [mes, enabled]);
}
