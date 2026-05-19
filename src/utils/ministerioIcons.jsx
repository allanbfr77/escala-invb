import { Baby, Handshake, Music, MonitorPlay } from "lucide-react";

export const ICONES_MINISTERIO = {
  infantil: { Icon: Baby, cor: "#d4af37" },
  recepcao: { Icon: Handshake, cor: "#d4af37" },
  louvor: { Icon: Music, cor: "#4ade80" },
  comunicacao: { Icon: MonitorPlay, cor: "#60a5fa" },
};

export function IconeMinisterio({ ministerioId, size = 28, strokeWidth = 2, style, ...rest }) {
  const cfg = ICONES_MINISTERIO[ministerioId];
  if (!cfg) return null;
  const { Icon, cor } = cfg;
  return (
    <Icon
      size={size}
      color={cor}
      strokeWidth={strokeWidth}
      style={{ flexShrink: 0, ...style }}
      aria-hidden
      {...rest}
    />
  );
}
