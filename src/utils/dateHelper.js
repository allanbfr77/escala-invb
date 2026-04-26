// ===== src/utils/dateHelper.js =====

export function gerarDatasEscala(anoMes) {
  if (!anoMes) return [];
  
  const [ano, mes] = anoMes.split("-").map(Number);
  const primeiroDia = new Date(ano, mes - 1, 1);
  const ultimoDia = new Date(ano, mes, 0);

  const resultados = [];

  for (let d = new Date(primeiroDia); d <= ultimoDia; d.setDate(d.getDate() + 1)) {
    const diaSemana = d.getDay(); // 0 = domingo, 3 = quarta
    const dataStr = d.toISOString().split("T")[0];

    if (diaSemana === 3) {
      // Quartas-feiras
      resultados.push({
        id: `${dataStr}-quarta`,
        data: dataStr,
        tipo: "quarta",
        turno: "único"
      });
    }

    if (diaSemana === 0) {
      // Domingos: gera manhã e noite separados
      resultados.push({
        id: `${dataStr}-domingo-manha`,
        data: dataStr,
        tipo: "domingo",
        turno: "manhã"
      });
      resultados.push({
        id: `${dataStr}-domingo-noite`,
        data: dataStr,
        tipo: "domingo",
        turno: "noite"
      });
    }
  }

  return resultados;
}

export function formatarData(dataStr, turno, descricao) {
  const [ano, mes, dia] = dataStr.split("-");
  const data = new Date(ano, mes - 1, dia);
  const diaSemana = data.toLocaleDateString("pt-BR", { weekday: "long" })
    .toUpperCase()
    .replace("-FEIRA", "-FEIRA"); // mantém hífen em quarta-feira, sexta-feira etc.
  const diaMes = `${dia}/${mes}`;

  if (descricao) return `${diaSemana}, ${diaMes} (${descricao.toUpperCase()})`;
  if (turno === "manhã") return `${diaSemana}, ${diaMes} (MANHÃ)`;
  if (turno === "noite") return `${diaSemana}, ${diaMes} (NOITE)`;
  return `${diaSemana}, ${diaMes}`;
}