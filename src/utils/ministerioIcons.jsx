import { Baby, Handshake, Music, MonitorPlay } from "lucide-react";

export const ICONES_MINISTERIO = {
  infantil: { Icon: Baby, cor: "#FFFFFF" },
  recepcao: { Icon: Handshake, cor: "#FFFFFF" },
  louvor: { Icon: Music, cor: "#FFFFFF" },
  comunicacao: { Icon: MonitorPlay, cor: "#FFFFFF" },
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
