import { Baby, Handshake, Music, MonitorPlay } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const ICONES_MINISTERIO = {
  infantil: { Icon: Baby },
  recepcao: { Icon: Handshake },
  louvor: { Icon: Music },
  comunicacao: { Icon: MonitorPlay },
};

export function IconeMinisterio({ ministerioId, size = 28, strokeWidth = 2, style, ...rest }) {
  const { isDark } = useTheme();
  const cfg = ICONES_MINISTERIO[ministerioId];
  if (!cfg) return null;
  const { Icon } = cfg;
  const cor = isDark ? "#FFFFFF" : "#0f172a";
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
