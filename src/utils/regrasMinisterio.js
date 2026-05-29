/** Ministério que permite mesma pessoa em 2+ funções no dia e escala cruzada com outros ministérios */
export const MINISTERIO_ESCALA_FLEXIVEL = "comunicacao";

export function ministerioPermiteEscalaFlexivel(ministerioId) {
  return ministerioId === MINISTERIO_ESCALA_FLEXIVEL;
}
