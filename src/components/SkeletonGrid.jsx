// ===== src/components/SkeletonGrid.jsx =====
export default function SkeletonGrid({ colunas = 3 }) {
  const skeletonBase = {
    background: "var(--border)",
    borderRadius: "4px",
    display: "inline-block",
  };

  return (
    <div style={{
      borderRadius: "10px",
      border: "1px solid var(--border)",
      background: "var(--bg)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      overflow: "hidden",
    }}>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr>
            {/* Date header cell */}
            <th style={{
              width: "160px",
              padding: "10px 14px",
              background: "var(--border)",
              borderBottom: "1px solid var(--border)",
              textAlign: "left",
            }}>
              <div className="skeleton-pulse" style={{ ...skeletonBase, height: "12px", width: "60px" }} />
            </th>
            {/* Column header cells */}
            {Array.from({ length: colunas }).map((_, colIdx) => (
              <th key={colIdx} style={{
                padding: "10px 14px",
                background: "var(--border)",
                borderBottom: "1px solid var(--border)",
                borderLeft: "1px solid var(--border)",
                textAlign: "left",
              }}>
                <div className="skeleton-pulse" style={{ ...skeletonBase, height: "12px", width: `${40 + (colIdx * 17) % 40}px` }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, rowIdx) => (
            <tr key={rowIdx} style={{ background: rowIdx % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.05)" }}>
              {/* Date cell */}
              <td style={{
                width: "160px",
                padding: "10px 14px",
                borderBottom: "1px solid var(--border)",
                borderRight: "1px solid var(--border)",
              }}>
                <div className="skeleton-pulse" style={{ ...skeletonBase, height: "11px", width: "120px" }} />
              </td>
              {/* Data cells */}
              {Array.from({ length: colunas }).map((_, colIdx) => (
                <td key={colIdx} style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid var(--border)",
                  borderLeft: "1px solid var(--border)",
                }}>
                  {(rowIdx + colIdx) % 3 === 0 && (
                    <div className="skeleton-pulse" style={{
                      ...skeletonBase,
                      height: "22px",
                      width: "70px",
                      borderRadius: "20px",
                    }} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
