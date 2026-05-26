function getVisualTurno(turno) {
  if (turno === "manhã") {
    return {
      color: "var(--accent)",
      dot: "var(--accent)",
      label: "M",
    };
  }

  if (turno === "noite") {
    return {
      color: "#3b82f6",
      dot: "#3b82f6",
      label: "N",
    };
  }

  return null;
}

export default function TurnoLabelInline({
  label,
  turno,
  title,
  gap = "4px",
  dotSize = 7,
  badgeFontSize = "10px",
}) {
  const visual = getVisualTurno(turno);

  if (!visual) {
    return <span title={title}>{label}</span>;
  }

  return (
    <span
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap,
        whiteSpace: "nowrap",
        minWidth: 0,
        maxWidth: "100%",
      }}
    >
      <span
        style={{
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          color: visual.color,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: badgeFontSize,
          fontWeight: 700,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        <span
          aria-hidden
          style={{
            width: `${dotSize}px`,
            height: `${dotSize}px`,
            borderRadius: "50%",
            background: visual.dot,
            flexShrink: 0,
          }}
        />
        {visual.label}
      </span>
    </span>
  );
}
