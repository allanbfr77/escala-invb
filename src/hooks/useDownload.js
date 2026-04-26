import { useState } from "react";
import html2canvas from "html2canvas";
import { funcoesPorMinisterio } from "../data/funcoes";
import { formatarData } from "../utils/dateHelper";
// Ministry names with \u escapes to avoid encoding issues in plain .js files
const NOMES_MIN = {
  comunicacao: "MINIST\u00C9RIO DE COMUNICA\u00C7\u00D5ES",
  louvor:      "MINIST\u00C9RIO DE LOUVOR",
  recepcao:    "MINIST\u00C9RIO DE INTRODU\u00C7\u00C3O",
  infantil:    "MINIST\u00C9RIO INFANTIL",
};

const LT = {
  bg:        "#F8FAFC",
  surface:   "#FFFFFF",
  border:    "#E2E8F0",
  text:      "#0F172A",
  textMuted: "#64748B",
  textDim:   "#CBD5E1",
  accent:    "#6366F1",
  accentBg:  "rgba(99,102,241,0.08)",
  zebra:     "rgba(99,102,241,0.04)",
};

export function useDownload({ ministerioSelecionado, mes, escalas, datas, mostrarMensagem }) {
  const [baixando, setBaixando] = useState(false);

  const handleDownload = async (layout) => {
    setBaixando(true);
    try {
      const mesFormatado = new Date(mes + "-15")
        .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
        .replace(" de ", " ")
        .toUpperCase();

      const funcoes = funcoesPorMinisterio[ministerioSelecionado] || [];
      const isMobile = layout !== undefined ? layout === "mobile" : window.innerWidth <= 768;

      const headerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;
          margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid ${LT.border};">
          <div>
            <div style="font-size:9px;font-weight:600;color:${LT.textMuted};
              text-transform:uppercase;letter-spacing:0.7px;margin-bottom:3px;
              font-family:'Outfit',sans-serif;">Escala INVB</div>
            <div style="font-size:15px;font-weight:700;color:${LT.text};
              letter-spacing:-0.2px;font-family:'Outfit',sans-serif;">
              ${NOMES_MIN[ministerioSelecionado]}
            </div>
          </div>
          <div style="font-size:11px;color:${LT.textMuted};font-weight:500;
            font-family:'Outfit',sans-serif;">${mesFormatado}</div>
        </div>
      `;

      const wrapper = document.createElement("div");
      wrapper.style.fontFamily = "'Outfit', sans-serif";
      wrapper.style.background = LT.bg;
      wrapper.style.display    = "inline-block";

      if (isMobile) {
        const cols = 3;
        wrapper.style.padding = "16px";
        wrapper.style.width   = "900px";

        let cardsHTML = `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:8px;">`;

        datas.forEach(dataObj => {
          const turnoKey  = dataObj.turno ?? "único";
          const dataLabel = formatarData(dataObj.data, dataObj.turno, dataObj.descricao);

          let rowsHTML = "";
          funcoes.forEach(f => {
            const pessoa      = escalas[`${dataObj.data}-${turnoKey}-${f}`];
            const isDisponivel = pessoa === "disponível";
            rowsHTML += `
              <div style="display:flex;justify-content:space-between;align-items:baseline;
                gap:4px;padding:2px 0;border-bottom:1px solid ${LT.border};">
                <span style="font-size:8px;color:${LT.textMuted};font-weight:500;
                  text-transform:uppercase;letter-spacing:0.2px;
                  font-family:'Outfit',sans-serif;flex:1;white-space:nowrap;
                  overflow:hidden;text-overflow:ellipsis;">${f}</span>
                <span style="font-size:9px;font-weight:${pessoa ? 600 : 400};
                  color:${isDisponivel ? "#a78bfa" : pessoa ? LT.text : LT.textDim};
                  font-family:'Outfit',sans-serif;white-space:nowrap;">
                  ${pessoa ? pessoa.toUpperCase() : "—"}
                </span>
              </div>
            `;
          });

          cardsHTML += `
            <div style="background:${LT.surface};border:1px solid ${LT.border};
              border-radius:8px;overflow:hidden;">
              <div style="background:${LT.accentBg};border-bottom:1px solid ${LT.border};
                padding:6px 10px;font-size:9px;font-weight:700;color:${LT.accent};
                font-family:'Outfit',sans-serif;text-transform:uppercase;letter-spacing:0.3px;">
                ${dataLabel}
              </div>
              <div style="padding:6px 10px;display:flex;flex-direction:column;gap:0px;">
                ${rowsHTML}
              </div>
            </div>
          `;
        });

        cardsHTML += "</div>";
        wrapper.innerHTML = headerHTML + cardsHTML;

      } else {
        const thStyle = `padding:9px 14px;text-align:left;font-weight:600;
          color:${LT.textMuted};font-size:10px;text-transform:uppercase;
          letter-spacing:0.8px;white-space:nowrap;font-family:'Outfit',sans-serif;`;

        let theadHTML = `<tr style="border-bottom:1px solid ${LT.border};">
          <th style="${thStyle}border-right:1px solid ${LT.border};">Data</th>`;
        funcoes.forEach(f => {
          theadHTML += `<th style="${thStyle}">${f}</th>`;
        });
        theadHTML += "</tr>";

        let tbodyHTML = "";
        datas.forEach((dataObj, idx) => {
          const turnoKey = dataObj.turno ?? "único";
          const rowBg    = idx % 2 === 0 ? LT.surface : LT.zebra;
          tbodyHTML += `<tr style="background:${rowBg};">
            <td style="padding:9px 14px;font-weight:500;color:${LT.textMuted};
              font-size:11px;font-family:'Outfit',sans-serif;white-space:nowrap;
              border-right:1px solid ${LT.border};">
              ${formatarData(dataObj.data, dataObj.turno, dataObj.descricao)}
            </td>`;
          funcoes.forEach(f => {
            const pessoa      = escalas[`${dataObj.data}-${turnoKey}-${f}`];
            const isDisponivel = pessoa === "disponível";
            tbodyHTML += `<td style="padding:6px 14px;white-space:nowrap;">
              <span style="font-size:12px;font-weight:${pessoa ? 500 : 400};
                color:${isDisponivel ? "#a78bfa" : pessoa ? LT.text : LT.textDim};
                font-family:'Outfit',sans-serif;">
                ${pessoa ? pessoa.toUpperCase() : "—"}
              </span>
            </td>`;
          });
          tbodyHTML += "</tr>";
        });

        const tableHTML = `
          <div style="border-radius:10px;border:1px solid ${LT.border};
            background:${LT.surface};overflow:hidden;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead>${theadHTML}</thead>
              <tbody>${tbodyHTML}</tbody>
            </table>
          </div>
        `;
        wrapper.style.padding  = "20px 24px 24px";
        wrapper.innerHTML = headerHTML + tableHTML;
      }

      wrapper.style.position = "fixed";
      wrapper.style.top      = "-99999px";
      wrapper.style.left     = "-99999px";
      wrapper.style.zIndex   = "-1";
      document.body.appendChild(wrapper);

      const canvas = await html2canvas(wrapper, {
        backgroundColor: LT.bg,
        scale: 2,
        useCORS: true,
        logging: false,
        width:  wrapper.scrollWidth,
        height: wrapper.scrollHeight,
        windowWidth:  wrapper.scrollWidth,
        windowHeight: wrapper.scrollHeight,
        scrollX: 0,
        scrollY: 0,
      });

      document.body.removeChild(wrapper);

      const link = document.createElement("a");
      link.download = `escala-${ministerioSelecionado}-${mes}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

    } catch (err) {
      console.error(err);
      mostrarMensagem("Erro ao gerar imagem", "erro");
    } finally {
      setBaixando(false);
    }
  };

  return { handleDownload, baixando };
}
