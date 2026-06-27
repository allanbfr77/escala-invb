// ===== src/pages/Dashboard.jsx =====
import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import { EscalaProvider, useEscalas } from "../context/EscalaContext";
import SidebarFiltros from "../components/SidebarFiltros";
import { db } from "../firebase";
import { collection, query, where, getDocs, deleteDoc, updateDoc } from "firebase/firestore";
import html2canvas from "html2canvas";

import QuickActionBar from "../components/QuickActionBar";
import RelatorioMinisterio from "../components/RelatorioMinisterio";
import SkeletonGrid from "../components/SkeletonGrid";
import ConfirmModal from "../components/ConfirmModal";
import CrossMinistryInfo from "../components/CrossMinistryInfo";
import IndisponibilidadeModal from "../components/IndisponibilidadeModal";
import PlanilhaMinisterio from "../components/PlanilhaMinisterio";
import { ministerioTemConfigPlanilhaFaixas } from "../utils/planilhaMinisterioConfig";
import { funcoesPorMinisterio } from "../data/funcoes";
import { pessoasPorMinisterio } from "../data/pessoas";
import { podeEditarMinisterio } from "../utils/permissions";
import { formatarData } from "../utils/dateHelper";
import { buildPlanilhaFaixasTableHTML } from "../utils/planilhaFaixasExport";
import { nomeParaExibicao, normalizarNomePessoa } from "../utils/nomeExibicao";
import { estaIndisponivelTodoMesFromSet } from "../utils/indisponibilidadeHelpers";
import { useMediaQuery, TABLET_MIN_QUERY } from "../hooks/useMediaQuery";
import { useTheme } from "../context/ThemeContext";
import { pedirConfirmacao as pedirConfirmacaoAsync, cancelarConfirmacao } from "../utils/confirmacaoAsync";
import {
  HASH_SECTIONS,
  parseAppHash,
  setAppHash,
  isDashboardHash,
  dashboardFlagsFromSection,
  useDashboardHashSync,
} from "../utils/hashNavigation";

import { AlertTriangle } from "lucide-react";

// ─── Helpers de controle de mês ──────────────────────────────────────────────

/** Piso absoluto do sistema */
const MES_ABSOLUTO = "2026-05";

/** Mês mínimo navegável: max(MES_ABSOLUTO, mês civil atual − 1) */
function getMesMinimo() {
  const hoje = new Date();
  const umMesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const candidato = umMesAtras.toISOString().slice(0, 7);
  return candidato < MES_ABSOLUTO ? MES_ABSOLUTO : candidato;
}

/** Mês máximo navegável: Dezembro do ano corrente */
function getMesMaximo() {
  return `${new Date().getFullYear()}-12`;
}

/**
 * Mês exibido por padrão:
 *   - Dia >= 20 → mês seguinte (foco no planejamento)
 *   - Dia  < 20 → mês atual
 * Sempre limitado entre mesMinimo e mesMaximo.
 */
function getMesInicial() {
  const hoje = new Date();
  const base = hoje.getDate() >= 20
    ? new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)
    : hoje;
  const candidato = base.toISOString().slice(0, 7);
  const min = getMesMinimo();
  const max = getMesMaximo();
  if (candidato < min) return min;
  if (candidato > max) return max;
  return candidato;
}

function getExportTurnoVisual(turno, accentColor) {
  if (turno === "manhã") {
    return {
      label: "M",
      color: accentColor,
      dot: accentColor,
    };
  }

  if (turno === "noite") {
    return {
      label: "N",
      color: "#3b82f6",
      dot: "#3b82f6",
    };
  }

  return null;
}

function renderTurnoInlineExportHTML(label, turno, accentColor, options = {}) {
  const visual = getExportTurnoVisual(turno, accentColor);
  if (!visual) return label;

  const gap = options.gap ?? "4px";
  const dotSize = options.dotSize ?? 7;
  const fontSize = options.fontSize ?? "10px";

  return `
    <span style="display:inline-flex;align-items:center;gap:${gap};white-space:nowrap;max-width:100%;">
      <span>${label}</span>
      <span style="display:inline-flex;align-items:center;gap:4px;color:${visual.color};font-family:'JetBrains Mono',monospace;font-size:${fontSize};font-weight:700;line-height:1;flex-shrink:0;">
        <span style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:${visual.dot};display:inline-block;flex-shrink:0;"></span>
        ${visual.label}
      </span>
    </span>
  `;
}

function formatarDataExport(dataObj, accentColor) {
  const dataLabel = formatarData(dataObj.data, dataObj.turno, dataObj.descricao);
  const dataBase = dataLabel.replace(/\s+\((MANHÃ|NOITE)\)$/, "");
  return renderTurnoInlineExportHTML(dataBase, dataObj.turno, accentColor, {
    gap: "4px",
    dotSize: 7,
    fontSize: "10px",
  });
}

const EXPORT_PLANILHA_WIDTH = 900;
const EXPORT_PLANILHA_HEIGHT = 1200;

function canvasPlanilhaFixo(sourceCanvas, bgColor) {
  const out = document.createElement("canvas");
  out.width = EXPORT_PLANILHA_WIDTH;
  out.height = EXPORT_PLANILHA_HEIGHT;
  const ctx = out.getContext("2d");
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, EXPORT_PLANILHA_WIDTH, EXPORT_PLANILHA_HEIGHT);

  const scale = Math.min(
    EXPORT_PLANILHA_WIDTH / sourceCanvas.width,
    EXPORT_PLANILHA_HEIGHT / sourceCanvas.height
  );
  const w = sourceCanvas.width * scale;
  const h = sourceCanvas.height * scale;
  ctx.drawImage(
    sourceCanvas,
    (EXPORT_PLANILHA_WIDTH - w) / 2,
    0,
    w,
    h
  );
  return out;
}

function formatarNomeTexto(nome) {
  if (!nome) return "—";
  if (nome.toLowerCase() === "disponível") return "Disponível";

  const canon = normalizarNomePessoa(nome);
  if (canon === "LUCIANA F.") return "Luciana F.";

  return canon
    .split(" ")
    .filter(Boolean)
    .map((parte) => (
      parte.charAt(0).toLocaleUpperCase("pt-BR") +
      parte.slice(1).toLocaleLowerCase("pt-BR")
    ))
    .join(" ");
}

function getTituloSecaoTexto(dataObj) {
  if (dataObj.tipo === "quarta") {
    return "📅 QUARTAS-FEIRAS";
  }

  if (dataObj.tipo === "domingo" && dataObj.turno === "manhã") {
    return "🌞 DOMINGO – MANHÃ";
  }

  if (dataObj.tipo === "domingo" && dataObj.turno === "noite") {
    return "🌙 DOMINGO – NOITE";
  }

  const descricao = (dataObj.descricao || "CULTO EXTRA").toUpperCase();
  if (dataObj.turno === "manhã") return `🌞 ${descricao} – MANHÃ`;
  if (dataObj.turno === "noite") return `🌙 ${descricao} – NOITE`;
  return `📌 ${descricao}`;
}

const EXTERNAL_DETECTION_STORAGE_KEY = "external-detection-by-ministerio";

function loadExternalDetectionFromStorage() {
  try {
    const stored = localStorage.getItem(EXTERNAL_DETECTION_STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function DashboardContent({ ministerioSelecionado, setMinisterioSelecionado, mes, setMes, mesMinimo, mesMaximo, onOpenRelatorio }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const alpha = (opacity) => isDark ? `rgba(255,255,255,${opacity})` : `rgba(0,0,0,${opacity})`;
  const theme = {
    bg: "var(--bg)",
    surface: "var(--surface)",
    surfaceTranslucent: "var(--surface-translucent)",
    surfaceHover: "var(--surface-hover)",
    border: "var(--border)",
    borderLight: "var(--border-light)",
    accent: "var(--accent)",
    accentMuted: "var(--accent-muted)",
    accentBright: "var(--accent-bright)",
    accentDeep: "var(--accent-deep)",
    accentGradientEnd: "var(--accent-gradient-end)",
    accentOnAccent: "var(--accent-on-accent)",
    accentDim: "var(--accent-dim)",
    accentGlow: "var(--accent-glow)",
    accentBorder: "var(--accent-border)",
    accentZebra: "var(--accent-zebra)",
    accentHoverBg: "var(--accent-hover-bg)",
    accentSelectedBg: "var(--accent-selected-bg)",
    accentShadowStrong: "var(--accent-shadow-strong)",
    accentFocusRing: "var(--accent-focus-ring)",
    slotAvailable: "var(--slot-available)",
    text: "var(--text)",
    textMuted: "var(--text-muted)",
    textDim: "var(--text-dim)",
    danger: "var(--danger)",
    dangerDim: "var(--danger-dim)",
    success: "var(--success)",
    successDim: "var(--success-dim)",
  };
  const { escalas, datas, loading, error, retry } = useEscalas();
  // ── refreshKey dispara re-fetch no Sidebar quando uma escala é removida
  const [refreshKey, setRefreshKey] = useState(0);
  // ── indispRefreshKey dispara re-fetch das indisponibilidades quando o modal fecha
  const [indispRefreshKey, setIndispRefreshKey] = useState(0);
  // ── detecção externa ativa por ministério (independente entre ministérios)
  const [externalDetectionByMinisterio, setExternalDetectionByMinisterio] = useState(loadExternalDetectionFromStorage);
  const isExternalDetectionEnabled = !!externalDetectionByMinisterio[ministerioSelecionado];

  useEffect(() => {
    localStorage.setItem(EXTERNAL_DETECTION_STORAGE_KEY, JSON.stringify(externalDetectionByMinisterio));
  }, [externalDetectionByMinisterio]);

  const initialDashboardFlags = (() => {
    const section = parseAppHash();
    return isDashboardHash(section)
      ? dashboardFlagsFromSection(section)
      : { verRelatorio: false, verOutrosMinisterios: false };
  })();

  const [verRelatorio, setVerRelatorio] = useState(initialDashboardFlags.verRelatorio);
  const [verOutrosMinisterios, setVerOutrosMinisterios] = useState(initialDashboardFlags.verOutrosMinisterios);
  useDashboardHashSync(verRelatorio, verOutrosMinisterios, setVerRelatorio, setVerOutrosMinisterios);
  const [limpando, setLimpando] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [showAcoesMenu, setShowAcoesMenu] = useState(false);
  const acoesMenuRef = useRef(null);
  const [filtroNome, setFiltroNome] = useState("");
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [conflito, setConflito] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ aberto: false, titulo: "", descricao: "", confirmLabel: "Confirmar", perigoso: false, onConfirmar: null });
  const pedirConfirmacao = useCallback(
    (opts) => pedirConfirmacaoAsync(setConfirmModal, opts),
    []
  );
  const isTabletUp = useMediaQuery(TABLET_MIN_QUERY);
  const [verIndisponibilidade, setVerIndisponibilidade] = useState(false);
  const [textoExportacao, setTextoExportacao] = useState({ aberto: false, conteudo: "" });
  const mainRef = useRef(null);

  const mostrarMensagem = (texto, tipo = "sucesso") => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 3000);
  };

  // Fecha o menu de 3 pontinhos (ações destrutivas) ao clicar fora
  useEffect(() => {
    if (!showAcoesMenu) return;
    const handler = (e) => {
      if (acoesMenuRef.current && !acoesMenuRef.current.contains(e.target)) {
        setShowAcoesMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAcoesMenu]);

  useEffect(() => {
    if (!conflito) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [conflito]);

  useEffect(() => {
    if (!textoExportacao.aberto) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [textoExportacao.aberto]);

  const podeEditar = podeEditarMinisterio(user, ministerioSelecionado);

  const podeRetroceder = mes > mesMinimo;
  const podeAvancar    = mes < mesMaximo;

  const handleMesAnterior = () => {
    if (!podeRetroceder) return;
    const [ano, m] = mes.split("-").map(Number);
    setMes(new Date(ano, m - 2, 1).toISOString().slice(0, 7));
  };

  const handleMesProximo = () => {
    if (!podeAvancar) return;
    const [ano, m] = mes.split("-").map(Number);
    setMes(new Date(ano, m, 1).toISOString().slice(0, 7));
  };

  const buildTextoExport = useCallback(() => {
    const nomeMes = new Date(`${mes}-15`)
      .toLocaleDateString("pt-BR", { month: "long" })
      .toUpperCase();
    const funcoes = funcoesPorMinisterio[ministerioSelecionado] || [];
    const nomesPorLower = new Map(
      (pessoasPorMinisterio[ministerioSelecionado] || []).map((nome) => [
        nome.toLowerCase(),
        formatarNomeTexto(nome),
      ])
    );
    nomesPorLower.set("disponível", "Disponível");

    const secoes = [];
    const secoesMap = new Map();

    datas.forEach((dataObj) => {
      const titulo = getTituloSecaoTexto(dataObj);
      if (!secoesMap.has(titulo)) {
        const secao = { titulo, linhas: [] };
        secoesMap.set(titulo, secao);
        secoes.push(secao);
      }

      const turnoKey = dataObj.turno ?? "único";
      const nomes = funcoes.map((funcao) => {
        const pessoa = escalas[`${dataObj.data}-${turnoKey}-${funcao}`];
        if (!pessoa) return "—";
        return nomesPorLower.get(pessoa.toLowerCase()) || formatarNomeTexto(pessoa);
      });

      const ddmm = `${dataObj.data.slice(8, 10)}/${dataObj.data.slice(5, 7)}`;
      secoesMap.get(titulo).linhas.push(`${ddmm}- ${nomes.join("/ ")}`);
    });

    return [
      `ESCALA DE ${nomeMes}`,
      "",
      ...secoes.flatMap((secao, idx) => (
        idx === secoes.length - 1
          ? [secao.titulo, ...secao.linhas]
          : [secao.titulo, ...secao.linhas, ""]
      )),
    ].join("\n");
  }, [datas, escalas, mes, ministerioSelecionado]);

  const copiarTextoExportacao = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(textoExportacao.conteudo);
      mostrarMensagem("Texto copiado", "sucesso");
    } catch (err) {
      console.error(err);
      mostrarMensagem("Não foi possível copiar o texto", "erro");
    }
  }, [textoExportacao.conteudo]);

  const handleDownload = useCallback(async (layout) => {
    if (layout === "text") {
      setTextoExportacao({ aberto: true, conteudo: buildTextoExport() });
      return;
    }

    const isPlanilha = layout === "planilha";
    const isCard = layout === "card" || layout === "mobile";

    if (isPlanilha && !ministerioTemConfigPlanilhaFaixas(ministerioSelecionado)) {
      mostrarMensagem("Exportação de planilha indisponível nesta visualização", "erro");
      return;
    }

    setBaixando(true);
    try {
      const mesFormatado = new Date(mes + "-15")
        .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
        .replace(" de ", " ")
        .toUpperCase();

      const funcoes = funcoesPorMinisterio[ministerioSelecionado] || [];

      // ── Paleta light ──────────────────────────────────────────────────────
      const LT = {
        bg:        "#F8FAFC",
        surface:   "#FFFFFF",
        border:    "#CBD5E1",
        text:      "#0F172A",
        textMuted: "#64748B",
        textDim:   "#CBD5E1",
        accent:    "#b8942e",
        accentBg:  "rgba(184,148,46,0.08)",
        zebra:     "rgba(184,148,46,0.04)",
        slotDisponivel: "#9d8fc9",
        cellEmpty: "#F1F5F9",
      };

      // ── Header HTML (igual nos dois layouts) ─────────────────────────────
      const headerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;
          margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid ${LT.border};">
          <div>
            <div style="font-size:9px;font-weight:600;color:${LT.textMuted};
              text-transform:uppercase;letter-spacing:0.7px;margin-bottom:3px;
              font-family:'Outfit',sans-serif;">Escala INVB</div>
            <div style="font-size:15px;font-weight:700;color:${LT.text};
              letter-spacing:-0.2px;font-family:'Outfit',sans-serif;">
              ${ministerioConfig[ministerioSelecionado].nome}
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

      let downloadSuffix = "";

      if (isPlanilha) {
        downloadSuffix = "-planilha";
        const planilhaHeaderHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;
            margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid ${LT.border};">
            <div>
              <div style="font-size:16px;font-weight:600;color:${LT.textMuted};
                text-transform:uppercase;letter-spacing:0.7px;margin-bottom:3px;
                font-family:'Outfit',sans-serif;">Escala INVB</div>
              <div style="font-size:28px;font-weight:700;color:${LT.text};
                letter-spacing:-0.2px;font-family:'Outfit',sans-serif;line-height:1.15;">
                ${ministerioConfig[ministerioSelecionado].nome}
              </div>
            </div>
            <div style="font-size:20px;color:${LT.textMuted};font-weight:500;
              font-family:'Outfit',sans-serif;text-align:right;">${mesFormatado}</div>
          </div>
        `;
        const tableHTML = buildPlanilhaFaixasTableHTML({
          ministerioId: ministerioSelecionado,
          datas,
          funcoes,
          escalas,
          LT,
        });
        wrapper.style.padding = "20px 14px 18px";
        wrapper.style.width = `${EXPORT_PLANILHA_WIDTH}px`;
        wrapper.style.minWidth = `${EXPORT_PLANILHA_WIDTH}px`;
        wrapper.style.maxWidth = `${EXPORT_PLANILHA_WIDTH}px`;
        wrapper.style.boxSizing = "border-box";
        wrapper.innerHTML = planilhaHeaderHTML + tableHTML;
      } else if (isCard) {
        downloadSuffix = "-card";
        const cols = 3;
        wrapper.style.padding = "16px";
        wrapper.style.width = "900px";

        let cardsHTML = `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:8px;">`;

        datas.forEach((dataObj) => {
          const turnoKey = dataObj.turno ?? "único";
          const dataLabel = formatarDataExport(dataObj, LT.accent);

          let rowsHTML = "";
          funcoes.forEach((f) => {
            const pessoa = escalas[`${dataObj.data}-${turnoKey}-${f}`];
            const isDisponivel = pessoa === "disponível";
            rowsHTML += `
              <div style="display:flex;justify-content:space-between;align-items:baseline;
                gap:4px;padding:2px 0;border-bottom:1px solid ${LT.border};">
                <span style="font-size:8px;color:${LT.textMuted};font-weight:500;
                  text-transform:uppercase;letter-spacing:0.2px;
                  font-family:'Outfit',sans-serif;flex:1;white-space:nowrap;
                  overflow:hidden;text-overflow:ellipsis;">${f}</span>
                <span style="font-size:9px;font-weight:${pessoa ? 600 : 400};
                  color:${isDisponivel ? LT.slotDisponivel : pessoa ? LT.text : LT.textDim};
                  font-family:'Outfit',sans-serif;white-space:nowrap;">
                  ${pessoa ? nomeParaExibicao(pessoa) : "—"}
                </span>
              </div>
            `;
          });

          cardsHTML += `
            <div style="background:${LT.surface};border:1px solid ${LT.border};
              border-radius:8px;overflow:hidden;">
              <div style="background:#F1F5F9;border-bottom:1px solid ${LT.border};
                padding:6px 10px;font-size:9px;font-weight:700;color:${LT.textMuted};
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
        downloadSuffix = "-tabela";
        // ── Tabela web ─────────────────────────────────────────────────────
        const thStyle = `padding:10px 20px;text-align:left;font-weight:600;
          color:${LT.textMuted};font-size:10px;text-transform:uppercase;
          letter-spacing:0.8px;white-space:nowrap;font-family:'Outfit',sans-serif;`;
        const cellDivider = `border-right:1px solid ${LT.border};`;

        let theadHTML = `<tr style="border-bottom:1px solid ${LT.border};">
          <th style="${thStyle}min-width:184px;${cellDivider}">Data</th>`;
        funcoes.forEach(f => {
          theadHTML += `<th style="${thStyle}min-width:156px;${cellDivider}">${f}</th>`;
        });
        theadHTML += "</tr>";

        let tbodyHTML = "";
        datas.forEach((dataObj, idx) => {
          const turnoKey = dataObj.turno ?? "único";
          const rowBg = idx % 2 === 0 ? LT.surface : LT.zebra;
          tbodyHTML += `<tr style="background:${rowBg};">
            <td style="padding:10px 20px;font-weight:500;color:${LT.textMuted};
              font-size:11px;font-family:'Outfit',sans-serif;white-space:nowrap;
              ${cellDivider}">
              ${formatarDataExport(dataObj, LT.accent)}
            </td>`;
          funcoes.forEach(f => {
            const pessoa = escalas[`${dataObj.data}-${turnoKey}-${f}`];
            const isDisponivel = pessoa === "disponível";
            tbodyHTML += `<td style="padding:8px 20px;white-space:nowrap;${cellDivider}">
              <span style="font-size:12px;font-weight:${pessoa ? 500 : 400};
                color:${isDisponivel ? LT.slotDisponivel : pessoa ? LT.text : LT.textDim};
                font-family:'Outfit',sans-serif;">
                ${pessoa ? nomeParaExibicao(pessoa) : "—"}
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

      // ── html2canvas ───────────────────────────────────────────────────────
      wrapper.style.position = "fixed";
      wrapper.style.top      = "-99999px";
      wrapper.style.left     = "-99999px";
      wrapper.style.zIndex   = "-1";
      document.body.appendChild(wrapper);

      const exportWidth = wrapper.scrollWidth;
      const exportHeight = wrapper.scrollHeight;

      const canvas = await html2canvas(wrapper, {
        backgroundColor: LT.bg,
        scale: isPlanilha ? 1 : 2,
        useCORS: true,
        logging: false,
        width: exportWidth,
        height: exportHeight,
        windowWidth: isPlanilha ? EXPORT_PLANILHA_WIDTH : exportWidth,
        windowHeight: exportHeight,
        scrollX: 0,
        scrollY: 0,
      });

      document.body.removeChild(wrapper);

      const exportCanvas = isPlanilha
        ? canvasPlanilhaFixo(canvas, LT.bg)
        : canvas;

      const link = document.createElement("a");
      link.download = `escala${downloadSuffix}-${ministerioSelecionado}-${mes}.png`;
      link.href = exportCanvas.toDataURL("image/png");
      link.click();

    } catch (err) {
      console.error(err);
      mostrarMensagem("Erro ao gerar imagem", "erro");
    } finally {
      setBaixando(false);
    }
  }, [buildTextoExport, datas, escalas, mes, ministerioSelecionado]);

  const ministerioConfig = {
    comunicacao: {
      nome: "MINISTÉRIO DE COMUNICAÇÕES",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4l16 8-16 8V4z"/><path d="M12 12h8"/>
        </svg>
      ),
    },
    louvor: {
      nome: "MINISTÉRIO DE LOUVOR",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
        </svg>
      ),
    },
    recepcao: {
      nome: "MINISTÉRIO DE INTRODUÇÃO",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
    infantil: {
      nome: "MINISTÉRIO INFANTIL",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2z"/>
          <path d="M8 22v-4a4 4 0 0 1 8 0v4"/>
          <path d="M6 11c-2 1-3 3-3 5v1h18v-1c0-2-1-4-3-5"/>
        </svg>
      ),
    },
  };

  // ── usa ConfirmModal em vez de window.confirm
  const handleLimparTudo = () => {
    setConfirmModal({
      aberto: true,
      titulo: "Limpar escala do mês",
      descricao: `Isso vai apagar toda a escala de ${ministerioConfig[ministerioSelecionado].nome} neste mês. Essa ação não pode ser desfeita.`,
      confirmLabel: "Limpar tudo",
      perigoso: true,
      onConfirmar: async () => {
        setConfirmModal(prev => ({ ...prev, aberto: false }));
        setLimpando(true);
        try {
          const [ano, mesNum] = mes.split("-");
          const inicio = `${ano}-${mesNum}-01`;
          const fim = `${ano}-${mesNum}-${new Date(ano, mesNum, 0).getDate()}`;
          const q = query(
            collection(db, "escalas"),
            where("ministerioId", "==", ministerioSelecionado),
            where("data", ">=", inicio),
            where("data", "<=", fim)
          );
          const snap = await getDocs(q);
          for (const doc of snap.docs) await deleteDoc(doc.ref);
          setRefreshKey(k => k + 1);
          mostrarMensagem("Escala do mês apagada", "sucesso");
        } catch (err) {
          mostrarMensagem("Erro ao limpar escala", "erro");
        } finally {
          setLimpando(false);
        }
      },
    });
  };

  // ── Organizar grade de Recepcao ──────────────────────────────────────────
  const handleOrganizarRecepcao = useCallback(() => {
    setConfirmModal({
      aberto: true,
      titulo: "Organizar grade de Introdução",
      descricao: "Os slots serão reorganizados para que cada pessoa ocupe sempre a mesma coluna ao longo do mês. Nenhuma pessoa é removida da escala.",
      confirmLabel: "Confirmar",
      perigoso: false,
      onConfirmar: async () => {
        setConfirmModal(prev => ({ ...prev, aberto: false }));

        const funcoes = ["INTRODUTOR(A) 1", "INTRODUTOR(A) 2", "INTRODUTOR(A) 3"];
        const changes = [];

        // ── 1. Contar ocorrências pessoa × coluna ────────────────────────
        const countMatrix = {};
        for (const dataObj of datas) {
          const turnoKey = dataObj.turno ?? "único";
          for (const f of funcoes) {
            const pessoa = escalas[`${dataObj.data}-${turnoKey}-${f}`];
            if (pessoa && pessoa !== "disponível") {
              if (!countMatrix[pessoa]) countMatrix[pessoa] = {};
              countMatrix[pessoa][f] = (countMatrix[pessoa][f] || 0) + 1;
            }
          }
        }

        const pessoas = Object.keys(countMatrix);
        if (pessoas.length === 0) {
          mostrarMensagem("Grade já está organizada", "sucesso");
          return;
        }

        // ── 2. Atribuir coluna preferida (greedy) ────────────────────────
        const candidatos = [];
        for (const pessoa of pessoas) {
          for (const f of funcoes) {
            candidatos.push({ pessoa, funcao: f, count: countMatrix[pessoa][f] || 0 });
          }
        }
        candidatos.sort((a, b) => b.count - a.count);

        const preferred = {};
        const assignedPessoas = new Set();
        const usedFuncoes    = new Set();

        for (const { pessoa, funcao } of candidatos) {
          if (!assignedPessoas.has(pessoa) && !usedFuncoes.has(funcao)) {
            preferred[pessoa] = funcao;
            assignedPessoas.add(pessoa);
            usedFuncoes.add(funcao);
          }
        }
        // Sobras sem coluna preferida → colunas ainda livres
        const remainingFuncoes = funcoes.filter(f => !usedFuncoes.has(f));
        let ri = 0;
        for (const pessoa of pessoas) {
          if (!preferred[pessoa]) preferred[pessoa] = remainingFuncoes[ri++];
        }

        // ── 3. Para cada data, reposicionar ─────────────────────────────
        for (const dataObj of datas) {
          const turnoKey = dataObj.turno ?? "único";

          const currentAssignments = {};
          const disponiveisSlots   = new Set();
          for (const f of funcoes) {
            const pessoa = escalas[`${dataObj.data}-${turnoKey}-${f}`];
            if (pessoa === "disponível") disponiveisSlots.add(f);
            else if (pessoa)             currentAssignments[f] = pessoa;
          }

          const pessoasHoje = Object.values(currentAssignments);
          if (pessoasHoje.length === 0) continue;

          const availableSlots = funcoes.filter(f => !disponiveisSlots.has(f));

          const newAssignment = {};
          const takenSlots    = new Set();

          const sorted = [...pessoasHoje].sort((a, b) =>
            funcoes.indexOf(preferred[a] || funcoes[2]) -
            funcoes.indexOf(preferred[b] || funcoes[2])
          );
          for (const pessoa of sorted) {
            const pref = preferred[pessoa];
            if (pref && availableSlots.includes(pref) && !takenSlots.has(pref)) {
              newAssignment[pessoa] = pref;
              takenSlots.add(pref);
            }
          }
          const freeSlots = availableSlots.filter(f => !takenSlots.has(f));
          let si = 0;
          for (const pessoa of sorted) {
            if (!newAssignment[pessoa]) newAssignment[pessoa] = freeSlots[si++];
          }

          for (const [funcaoAntiga, pessoa] of Object.entries(currentAssignments)) {
            const funcaoNova = newAssignment[pessoa];
            if (funcaoNova && funcaoAntiga !== funcaoNova) {
              changes.push({ data: dataObj.data, turno: turnoKey, funcaoAntiga, funcaoNova });
            }
          }
        }

        if (changes.length === 0) {
          mostrarMensagem("Grade já está organizada", "sucesso");
          return;
        }

        // ── 4. Aplicar no Firestore ──────────────────────────────────────
        try {
          const [ano, mesNum] = mes.split("-");
          const inicio = `${ano}-${mesNum}-01`;
          const fim    = `${ano}-${mesNum}-${new Date(ano, mesNum, 0).getDate()}`;

          const snap = await getDocs(query(
            collection(db, "escalas"),
            where("ministerioId", "==", "recepcao"),
            where("data", ">=", inicio),
            where("data", "<=", fim)
          ));

          const docMap = {};
          snap.docs.forEach(d => {
            const dd = d.data();
            const tk = dd.turno ?? "único";
            docMap[`${dd.data}-${tk}-${dd.funcao}`] = d.ref;
          });

          for (const { data, turno, funcaoAntiga, funcaoNova } of changes) {
            const ref = docMap[`${data}-${turno}-${funcaoAntiga}`];
            if (ref) await updateDoc(ref, { funcao: funcaoNova });
          }

          setRefreshKey(k => k + 1);
          mostrarMensagem(`Grade organizada — ${changes.length} ajuste${changes.length !== 1 ? "s" : ""}`, "sucesso");
        } catch (err) {
          console.error(err);
          mostrarMensagem("Erro ao organizar grade", "erro");
        }
      },
    });
  }, [escalas, datas, mes]);

  // ── Organizar grade de Louvor ─────────────────────────────────────────────
  const handleOrganizarLouvor = useCallback(() => {
    setConfirmModal({
      aberto: true,
      titulo: "Organizar grade de Louvor",
      descricao: "Os BVocais e Músicos serão reorganizados para que cada pessoa ocupe sempre a mesma coluna ao longo do mês. Nenhuma pessoa é removida da escala.",
      confirmLabel: "Confirmar",
      perigoso: false,
      onConfirmar: async () => {
        setConfirmModal(prev => ({ ...prev, aberto: false }));

        const grupos = [
          ["BVOCAL 1", "BVOCAL 2", "BVOCAL 3", "BVOCAL 4"],
          ["MÚSICO 1", "MÚSICO 2", "MÚSICO 3", "MÚSICO 4"],
        ];

        const changes = []; // { data, turno, funcaoAntiga, funcaoNova }

        for (const funcoes of grupos) {
          // ── 1. Contar ocorrências pessoa × coluna ────────────────────────
          const countMatrix = {}; // pessoa → { funcao → count }
          for (const dataObj of datas) {
            const turnoKey = dataObj.turno ?? "único";
            for (const f of funcoes) {
              const pessoa = escalas[`${dataObj.data}-${turnoKey}-${f}`];
              if (pessoa && pessoa !== "disponível") {
                if (!countMatrix[pessoa]) countMatrix[pessoa] = {};
                countMatrix[pessoa][f] = (countMatrix[pessoa][f] || 0) + 1;
              }
            }
          }

          const pessoas = Object.keys(countMatrix);
          if (pessoas.length === 0) continue;

          // ── 2. Atribuir coluna preferida (greedy) ────────────────────────
          const candidatos = [];
          for (const pessoa of pessoas) {
            for (const f of funcoes) {
              candidatos.push({ pessoa, funcao: f, count: countMatrix[pessoa][f] || 0 });
            }
          }
          candidatos.sort((a, b) => b.count - a.count);

          const preferred = {};
          const assignedPessoas = new Set();
          const usedFuncoes   = new Set();

          for (const { pessoa, funcao } of candidatos) {
            if (!assignedPessoas.has(pessoa) && !usedFuncoes.has(funcao)) {
              preferred[pessoa] = funcao;
              assignedPessoas.add(pessoa);
              usedFuncoes.add(funcao);
            }
          }
          // Sobras sem coluna preferida → colunas ainda livres
          const remainingFuncoes = funcoes.filter(f => !usedFuncoes.has(f));
          let ri = 0;
          for (const pessoa of pessoas) {
            if (!preferred[pessoa]) preferred[pessoa] = remainingFuncoes[ri++];
          }

          // ── 3. Para cada data, reposicionar ─────────────────────────────
          for (const dataObj of datas) {
            const turnoKey = dataObj.turno ?? "único";

            // Slots com pessoas reais (ignora "disponível")
            const currentAssignments = {}; // funcao → pessoa
            const disponiveisSlots   = new Set();
            for (const f of funcoes) {
              const pessoa = escalas[`${dataObj.data}-${turnoKey}-${f}`];
              if (pessoa === "disponível") disponiveisSlots.add(f);
              else if (pessoa)             currentAssignments[f] = pessoa;
            }

            const pessoasHoje = Object.values(currentAssignments);
            if (pessoasHoje.length === 0) continue;

            // Slots disponíveis para pessoas reais (exclui slots de "disponível")
            const availableSlots = funcoes.filter(f => !disponiveisSlots.has(f));

            // Primeira passagem: quem tem coluna preferida disponível
            const newAssignment = {}; // pessoa → funcaoNova
            const takenSlots    = new Set();

            const sorted = [...pessoasHoje].sort((a, b) =>
              funcoes.indexOf(preferred[a] || funcoes[3]) -
              funcoes.indexOf(preferred[b] || funcoes[3])
            );
            for (const pessoa of sorted) {
              const pref = preferred[pessoa];
              if (pref && availableSlots.includes(pref) && !takenSlots.has(pref)) {
                newAssignment[pessoa] = pref;
                takenSlots.add(pref);
              }
            }
            // Segunda passagem: sobras
            const freeSlots = availableSlots.filter(f => !takenSlots.has(f));
            let si = 0;
            for (const pessoa of sorted) {
              if (!newAssignment[pessoa]) newAssignment[pessoa] = freeSlots[si++];
            }

            // Gerar mudanças
            for (const [funcaoAntiga, pessoa] of Object.entries(currentAssignments)) {
              const funcaoNova = newAssignment[pessoa];
              if (funcaoNova && funcaoAntiga !== funcaoNova) {
                changes.push({ data: dataObj.data, turno: turnoKey, funcaoAntiga, funcaoNova });
              }
            }
          }
        }

        if (changes.length === 0) {
          mostrarMensagem("Grade já está organizada", "sucesso");
          return;
        }

        // ── 4. Aplicar no Firestore ──────────────────────────────────────
        try {
          const [ano, mesNum] = mes.split("-");
          const inicio = `${ano}-${mesNum}-01`;
          const fim    = `${ano}-${mesNum}-${new Date(ano, mesNum, 0).getDate()}`;

          const snap = await getDocs(query(
            collection(db, "escalas"),
            where("ministerioId", "==", "louvor"),
            where("data", ">=", inicio),
            where("data", "<=", fim)
          ));

          // Mapa: "${data}-${turno}-${funcao}" → docRef
          const docMap = {};
          snap.docs.forEach(d => {
            const dd = d.data();
            const t  = dd.turno ?? "único";
            docMap[`${dd.data}-${t}-${dd.funcao}`] = d.ref;
          });

          for (const { data, turno, funcaoAntiga, funcaoNova } of changes) {
            const ref = docMap[`${data}-${turno}-${funcaoAntiga}`];
            if (ref) await updateDoc(ref, { funcao: funcaoNova });
          }

          setRefreshKey(k => k + 1);
          mostrarMensagem(`Grade organizada — ${changes.length} ajuste${changes.length !== 1 ? "s" : ""}`, "sucesso");
        } catch (err) {
          console.error(err);
          mostrarMensagem("Erro ao organizar grade", "erro");
        }
      },
    });
  }, [escalas, datas, mes]);

  // Reset relatório e filtro ao trocar de ministério ou mês
  const handleSetMinisterio = (v) => {
    setMinisterioSelecionado(v);
    setVerRelatorio(false);
    setVerOutrosMinisterios(false);
    setAppHash(HASH_SECTIONS.PLANILHA, { replace: true });
  };

  const prevMesRef = useRef(mes);
  useEffect(() => {
    if (prevMesRef.current === mes) return;
    prevMesRef.current = mes;
    setVerRelatorio(false);
    setVerOutrosMinisterios(false);
    setAppHash(HASH_SECTIONS.PLANILHA, { replace: true });
  }, [mes]);

  const voltarParaPlanilha = useCallback(() => {
    setAppHash(HASH_SECTIONS.PLANILHA);
  }, []);

  const handleHashNavClick = useCallback((e, action) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;
    e.preventDefault();
    action();
  }, []);

  const toggleRelatorio = useCallback(() => {
    setAppHash(verRelatorio ? HASH_SECTIONS.PLANILHA : HASH_SECTIONS.RELATORIO);
  }, [verRelatorio]);

  const toggleOutrosMinisterios = useCallback(() => {
    setAppHash(verOutrosMinisterios ? HASH_SECTIONS.PLANILHA : HASH_SECTIONS.OUTROS_MINISTERIOS);
  }, [verOutrosMinisterios]);

  const naPlanilha = !verRelatorio && !verOutrosMinisterios;
  const podeOrganizar = ministerioSelecionado === "louvor" || ministerioSelecionado === "recepcao";
  const handleOrganizar = useCallback(() => {
    if (ministerioSelecionado === "louvor") handleOrganizarLouvor();
    else if (ministerioSelecionado === "recepcao") handleOrganizarRecepcao();
  }, [ministerioSelecionado, handleOrganizarLouvor, handleOrganizarRecepcao]);

  const planilhaMinisterioProps = useMemo(
    () => ({
      escalas,
      datas,
      mes,
      loading,
      usuario: user,
      podeEditar,
      onMensagem: mostrarMensagem,
      onConflito: setConflito,
      indispRefreshKey,
      pedirConfirmacao,
      filtroNome,
    }),
    [escalas, datas, mes, loading, user, podeEditar, indispRefreshKey, pedirConfirmacao, filtroNome]
  );

  const opcoesExportacao = useMemo(() => {
    const planilha = {
      layout: "planilha",
      label: "Modelo 1 (Planilha)",
      desc: "faixas por culto",
    };
    const tabela = {
      layout: "tabela",
      label: "Modelo 2 (Tabela)",
      desc: "linhas e colunas",
    };

    if (ministerioSelecionado === "louvor") return [planilha];
    return [planilha, tabela];
  }, [ministerioSelecionado]);

  const current = ministerioConfig[ministerioSelecionado];
  const showMinistryHeaderBlock = !isTabletUp;

  return (
    <div className="dashboard-root" style={{ minHeight: "100vh", background: theme.bg, color: theme.text, fontFamily: "'Outfit', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${theme.bg}; font-family: 'Outfit', sans-serif; }

        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

        /* Select focus */
        .sidebar-select:focus {
          border-color: ${theme.accent} !important;
          box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.12);
        }

        /* Skeleton loading */
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.7; }
        }
        .skeleton-pulse { animation: skeleton-pulse 1.6s ease-in-out infinite; }

        /* Hover nas linhas da grid */
        .grid-row:hover { background: var(--row-hover) !important; cursor: default; }

        /* Botão expandir/recolher slots vazios — apenas mobile */
        .btn-expandir-td { display: none !important; }
        /* Placeholder "Nenhum membro escalado" — apenas mobile */
        .sem-escala-placeholder { display: none !important; }

        /* Sticky header da grid */
        .grid-thead th {
          position: sticky;
          top: 0;
          z-index: 2;
          background: ${theme.surface};
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        /* 1366px landscape: título do ministério não sobrepõe a barra de ações */
        @media (max-width: 1024px) {
          .page-header { flex-wrap: wrap; align-items: flex-start !important; row-gap: 10px !important; }
        }

        /* Mobile (<768px): título no topo */
        @media (max-width: 767px) {
          .main-pad { padding-top: 12px !important; }
          .page-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
            border-bottom: none !important;
          }
          .page-header-top { order: 1; width: 100%; }
          .page-header-ministry { flex: 1; min-width: 0; }
          .page-header-alert-slot { display: none !important; }
        }
        @media (min-width: 768px) {
          .page-header--with-ministry {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
            margin-bottom: 14px !important;
            padding-bottom: 12px !important;
            border-bottom: 1px solid var(--border) !important;
          }
          .page-header--with-ministry .page-header-alert-slot { display: none !important; }
        }

        .page-header-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
        }
        .page-header-voltar {
          flex-shrink: 0;
          display: flex;
          justify-content: flex-end;
        }

        /* Tablet + mobile: cards em vez de tabela */
        @media (max-width: 900px) {
          .desktop-sidebar { display: none !important; }
          .header-title { display: none !important; }
          .header-sep { display: none !important; }
          .header-email { display: none !important; }
          .header-pad { padding: 0 14px !important; }
          .main-pad { padding: 14px 10px !important; }
          .page-header { flex-wrap: wrap; gap: 8px !important; }
          .btn-label { display: none; }
          .mes-nav span { min-width: 70px !important; font-size: 11px !important; }

          .grid-table { width: 100% !important; }
          .grid-thead { display: none; }
          .grid-table tbody { display: flex; flex-direction: column; gap: 8px; padding: 8px; }
          .grid-row {
            display: grid !important;
            grid-template-columns: 1fr;
            border: 1px solid ${theme.border} !important;
            border-bottom: 1px solid ${theme.border} !important;
            border-radius: 8px;
            overflow: hidden;
            background: ${theme.surface} !important;
          }
          /* Todas as células: mesma altura base (42px) → vazia = preenchida */
          .grid-row td {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            padding: 0 12px !important;
            height: 42px !important;
            min-height: 42px !important;
            max-height: 42px !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            border-bottom: 1px solid ${theme.border};
            white-space: normal !important;
          }
          .grid-date-cell {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            padding: 8px 12px !important;
            overflow: visible !important;
          }
          /* Linhas de função vazias: ocultas por padrão */
          .grid-row td.slot-vazio { display: none !important; }
          /* Visíveis quando o card está expandido */
          .grid-row.expandido td.slot-vazio { display: flex !important; }
          /* Botão expandir/recolher */
          .btn-expandir-card {
            display: flex !important;
            align-items: center;
            justify-content: center;
            gap: 5px;
            width: 100%;
            padding: 7px 12px;
            background: none;
            border: none;
            border-top: 1px solid ${theme.border};
            color: ${theme.textMuted};
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            font-family: 'Outfit', sans-serif;
            cursor: pointer;
          }
          .btn-expandir-card:hover { color: ${theme.accent}; background: rgba(0, 0, 0, 0.05); }
          .grid-row td:last-child { border-bottom: none; }
          .grid-row td::before {
            content: attr(data-label);
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.7px;
            color: ${theme.textMuted};
            font-family: 'Outfit', sans-serif;
            min-width: 90px;
            flex-shrink: 0;
          }
          .grid-date-cell { border-right: none !important; background: var(--date-cell-bg); }
          .grid-row { height: auto !important; }

          /* Placeholder para datas sem nenhum membro escalado */
          .grid-row td.sem-escala-placeholder {
            display: flex !important;
            align-items: center;
            justify-content: center;
            height: 36px !important;
            min-height: 0 !important;
            max-height: none !important;
            padding: 0 12px !important;
            border-bottom: none !important;
            overflow: visible !important;
          }
          .grid-row td.sem-escala-placeholder::before { display: none !important; }
          /* Ocultar placeholder quando o card está expandido */
          .grid-row.expandido td.sem-escala-placeholder { display: none !important; }

          /* Célula do botão expandir: especificidade (0,2,1) supera .grid-row td (0,1,1) */
          .grid-row td.btn-expandir-td {
            display: block !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            border-bottom: none !important;
          }
          .grid-row td.btn-expandir-td::before { display: none !important; }

          /* Cores das funções nos labels mobile (data-label) */
          .grid-row td[data-label="PROJEÇÃO"]::before,
          .grid-row td[data-label="MINISTRANTE"]::before,
          .grid-row td[data-label="INTRODUTOR(A) 1"]::before,
          .grid-row td[data-label="BERÇÁRIO"]::before { color: #60a5fa !important; }

          .grid-row td[data-label="MESA DE SOM"]::before,
          .grid-row td[data-label="BVOCAL 1"]::before,
          .grid-row td[data-label="BVOCAL 2"]::before,
          .grid-row td[data-label="BVOCAL 3"]::before,
          .grid-row td[data-label="BVOCAL 4"]::before,
          .grid-row td[data-label="INTRODUTOR(A) 2"]::before,
          .grid-row td[data-label="MATERNAL"]::before { color: #34d399 !important; }

          .grid-row td[data-label="TRANSMISSÃO"]::before,
          .grid-row td[data-label="MÚSICO 1"]::before,
          .grid-row td[data-label="MÚSICO 2"]::before,
          .grid-row td[data-label="MÚSICO 3"]::before,
          .grid-row td[data-label="MÚSICO 4"]::before,
          .grid-row td[data-label="INTRODUTOR(A) 3"]::before,
          .grid-row td[data-label="JUNIORES"]::before { color: #f59e0b !important; }

          /* Botão remover — sempre visível e com área de toque maior no mobile */
          .chip-remove-btn {
            opacity: 1 !important;
            pointer-events: auto !important;
            width: 32px !important;
            height: 32px !important;
            font-size: 13px !important;
            justify-content: center !important;
            color: ${theme.danger} !important;
            border-radius: 6px !important;
            margin-left: 2px !important;
          }

          /* Louvor mobile: table-layout/colgroup do desktop não pode limitar largura das células */
          .grid-louvor-wrap .grid-table {
            table-layout: auto !important;
            width: 100% !important;
          }
          .grid-louvor-wrap colgroup {
            display: none !important;
          }
          .grid-louvor-wrap .grid-row {
            width: 100% !important;
          }
          /* Louvor mobile ─────────────────────────────────────────────────── */

          /* TODAS as células de função: altura idêntica (42px), flex, overflow clipped */
          .grid-louvor-wrap .grid-row td:not(.grid-date-cell) {
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 8px !important;
            padding: 0 12px !important;
            height: 42px !important;
            min-height: 42px !important;
            max-height: 42px !important;
            overflow: hidden !important;
            width: 100% !important;
            max-width: 100% !important;
            align-self: start !important;
            justify-self: stretch !important;
          }

          /* Célula de data: altura livre, padding normal */
          .grid-louvor-wrap .grid-row td.grid-date-cell {
            box-sizing: border-box !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            padding: 8px 12px !important;
            overflow: visible !important;
          }

          /* Rótulo da função: sempre uma linha, sem truncar */
          .grid-louvor-wrap .grid-row td::before {
            flex: 0 0 auto !important;
            align-self: center !important;
            white-space: nowrap !important;
            overflow: visible !important;
            text-overflow: clip !important;
            min-width: 0 !important;
            line-height: 1 !important;
            padding: 0 !important;
          }

          /* Chip (nome + botão ✕): ocupa o espaço restante, alinhado à direita */
          .grid-louvor-wrap .grid-louvor-chip {
            flex: 1 1 0% !important;
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            justify-content: flex-end !important;
            align-items: center !important;
            gap: 6px !important;
            min-width: 0 !important;
            overflow: hidden !important;
            align-self: center !important;
            height: 100% !important;
            padding: 0 !important;
          }

          /* Nome da pessoa: trunca com ellipsis se longo */
          .grid-louvor-wrap .grid-louvor-chip > span {
            flex: 1 1 0% !important;
            min-width: 0 !important;
            text-align: right !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            line-height: 1.2 !important;
          }

          /* Traço das linhas vazias: exatamente como o nome, sem altura extra */
          .grid-louvor-wrap .grid-row td .grid-louvor-empty-slot {
            flex: 0 0 auto !important;
            display: block !important;
            line-height: 1 !important;
            margin: 0 !important;
            padding: 0 !important;
            align-self: center !important;
          }

          /* Slots vazios: ocultos por padrão no Louvor (especificidade >= regra de altura) */
          .grid-louvor-wrap .grid-row td.slot-vazio { display: none !important; }
          .grid-louvor-wrap .grid-row.expandido td.slot-vazio { display: flex !important; }
          /* Placeholder "Nenhum membro escalado" no Louvor — depois das regras de altura */
          .grid-louvor-wrap .grid-row td.sem-escala-placeholder {
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            height: 36px !important;
            min-height: 0 !important;
            max-height: none !important;
          }
          .grid-louvor-wrap .grid-row.expandido td.sem-escala-placeholder { display: none !important; }
          /* Botão expandir no Louvor: restaura display block (altura/flex do td não interfere) */
          .grid-louvor-wrap .grid-row td.btn-expandir-td {
            display: block !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          /* Data (linha topo): texto à direita, pode quebrar */
          .grid-louvor-wrap .grid-date-cell .grid-louvor-date-text {
            flex: 1 1 auto !important;
            text-align: right !important;
            white-space: normal !important;
            word-break: break-word !important;
            line-height: 1.3 !important;
            overflow: visible !important;
          }

          /* Botão ✕: área de toque mínima 40px, sem inflar a linha (encaixado nos 42px) */
          .grid-louvor-wrap .chip-remove-btn {
            box-sizing: border-box !important;
            flex-shrink: 0 !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 40px !important;
            height: 40px !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }

        /* Membros em outros ministérios: grade responsiva, cards no tamanho do conteúdo */
        .cross-ministry-grid {
          display: grid;
          gap: 14px;
          align-items: stretch;
          padding-top: 4px;
          grid-template-columns: minmax(0, 1fr);
        }
        @media (min-width: 480px) {
          .cross-ministry-grid {
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          }
        }
        @media (min-width: 1100px) {
          .cross-ministry-grid {
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          }
        }
        /* Altura fixa: cards uniformes na grade; conteúdo excedente rola dentro */
        .cross-ministry-card {
          height: 280px;
          max-height: 280px;
        }
        .cross-ministry-scroll {
          flex: 1 1 auto;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: thin;
          scrollbar-color: var(--text-muted) transparent;
          padding-right: 2px;
        }
        .cross-ministry-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .cross-ministry-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .cross-ministry-scroll::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 999px;
        }
        .cross-ministry-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--text-muted);
        }

        /* Mobile estreito (320px–639px): largura total e padding lateral equilibrado */
        @media (max-width: 639px) {
          .dashboard-root,
          .dashboard-body,
          .main-pad {
            width: 100%;
            max-width: 100%;
            min-width: 0;
            box-sizing: border-box;
          }
          .dashboard-root {
            overflow-x: hidden;
          }
          .header-pad {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }
          .main-pad {
            padding: 12px !important;
            overflow-x: hidden !important;
          }
          .page-header {
            width: 100%;
            max-width: 100%;
            min-width: 0;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
            border-bottom: none !important;
          }
          .page-header-top {
            order: 1;
            width: 100%;
          }
          .page-header-ministry {
            flex: 1;
            min-width: 0;
          }
          .page-header-alert-slot {
            display: none !important;
          }
          .header-pad {
            flex-wrap: wrap !important;
            height: auto !important;
            min-height: 48px;
            align-content: center;
            row-gap: 8px !important;
            column-gap: 6px !important;
            padding-top: 8px !important;
            padding-bottom: 8px !important;
          }
          .header-pad__start,
          .header-pad__end {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 6px;
            min-width: 0;
          }
          .header-pad__start {
            flex: 1 1 auto;
            max-width: 100%;
          }
          .header-pad__end {
            flex: 1 1 100%;
            justify-content: flex-end;
            gap: 6px;
          }
          .header-pad .mes-nav {
            flex-shrink: 0;
          }
          .header-pad .mes-nav span {
            min-width: 72px !important;
            font-size: 11px !important;
          }
          .header-pad__end .header-btn {
            flex-shrink: 0;
            padding: 4px 8px !important;
            font-size: 11px !important;
          }
          .header-btn-relatorio {
            white-space: nowrap;
          }
          /* Header reestruturado: neutraliza larguras fixas no mobile */
          .header-pad__start {
            width: auto !important;
            flex: 1 1 auto !important;
            justify-content: flex-start !important;
            padding: 0 !important;
          }
          .header-pad__end {
            padding: 0 !important;
            position: static !important;
          }
          .header-ministerio-titulo {
            display: none !important;
          }
          .escala-grid-host {
            width: 100%;
            max-width: 100%;
            min-width: 0;
          }
          .main-pad .escala-grid-host > div:has(> .grid-table),
          .main-pad .grid-louvor-wrap {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            overflow-x: hidden !important;
            box-sizing: border-box !important;
          }
          .grid-table {
            display: block !important;
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            table-layout: fixed !important;
          }
          .grid-table tbody {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            box-sizing: border-box !important;
          }
          .grid-row {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }
        }

        @media (max-width: 399px) {
          .header-pad__start {
            flex: 1 1 100%;
            justify-content: space-between;
          }
          .header-pad__end {
            justify-content: space-between;
          }
          .header-pad .mes-nav span {
            min-width: 64px !important;
          }
          .header-pad__end .header-btn-relatorio {
            padding: 4px 6px !important;
            font-size: 10px !important;
          }
        }
      `}</style>

      {/* Drawer overlay */}
      {drawerAberto && (
        <div
          onClick={() => setDrawerAberto(false)}
          style={{
            display: "block", position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* Drawer mobile */}
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 201,
        width: "300px",
        background: "var(--surface-translucent)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderRight: "1px solid var(--border)",
        padding: "20px 16px", overflowY: "auto",
        transform: drawerAberto ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s ease",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.6px" }}>
            Escala
          </span>
          <button onClick={() => setDrawerAberto(false)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textMuted, padding: "4px", display: "flex" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <SidebarFiltros
          usuario={user}
          ministerioSelecionado={ministerioSelecionado}
          setMinisterioSelecionado={(v) => { handleSetMinisterio(v); setDrawerAberto(false); }}
          datasDisponiveis={datas}
          theme={theme}
          onConfirmar={() => setDrawerAberto(false)}
          onMensagem={mostrarMensagem}
          onConflito={setConflito}
          refreshKey={refreshKey}
          indispRefreshKey={indispRefreshKey}
          mes={mes}
          escalas={escalas}
          pedirConfirmacao={pedirConfirmacao}
        />
      </div>

      {/* FAB mobile */}
      <button
        onClick={() => setDrawerAberto(true)}
        style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 150,
          width: "52px", height: "52px", borderRadius: "50%",
          background: theme.accent, border: "none", cursor: "pointer",
          boxShadow: `0 4px 20px ${alpha(0.4)}`,
          display: "none", alignItems: "center", justifyContent: "center",
        }}
        className="fab-mobile"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={theme.accentOnAccent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      <style>{`
        .fab-mobile { display: none !important; }
        @media (max-width: 900px) { .fab-mobile { display: flex !important; } }
        /* Tablet (768–900px): FAB e botão olho da seção cross-ministry coexistem */
        @media (min-width: 768px) and (max-width: 900px) {
          .fab-mobile {
            bottom: 28px !important;
            right: 28px !important;
          }
          .cross-ministry-desktop-only {
            padding-bottom: 80px;
            box-sizing: border-box;
          }
        }
      `}</style>

      {/* Navbar */}
      <header className="header-pad" style={{
        borderBottom: `1px solid ${theme.border}`, background: theme.surface,
        padding: "0", height: "68px", display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100,
      }}>
        {/* Bloco esquerdo: largura da sidebar, seletor de mês centralizado */}
        <div className="header-pad__start" style={{ width: "268px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 14px" }}>
          {/* Navegação de mês */}
          <div className="mes-nav" style={{ display: "flex", alignItems: "center", gap: "2px", background: theme.bg, borderRadius: "9px", padding: "4px 5px", border: `1px solid ${theme.border}` }}>
            <button
              onClick={handleMesAnterior}
              disabled={!podeRetroceder}
              title={!podeRetroceder ? "Mês mais antigo disponível" : undefined}
              style={{ background: "transparent", border: "none", cursor: podeRetroceder ? "pointer" : "not-allowed", color: podeRetroceder ? theme.textMuted : theme.textDim, padding: "4px 11px", borderRadius: "6px", fontSize: "17px", lineHeight: 1, fontFamily: "'Outfit', sans-serif", opacity: podeRetroceder ? 1 : 0.35, transition: "all 0.15s" }}
              onMouseEnter={e => { if (podeRetroceder) { e.currentTarget.style.color = theme.text; e.currentTarget.style.background = theme.surface; } }}
              onMouseLeave={e => { if (podeRetroceder) { e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.background = "transparent"; } }}
            >‹</button>
            <span style={{ color: theme.text, fontSize: "14px", fontFamily: "'JetBrains Mono', monospace", minWidth: "100px", textAlign: "center", fontWeight: 600, letterSpacing: "0.5px" }}>
              {new Date(mes + "-15").toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "").toUpperCase()}
            </span>
            <button
              onClick={handleMesProximo}
              disabled={!podeAvancar}
              title={!podeAvancar ? "Dezembro é o último mês disponível" : undefined}
              style={{ background: podeAvancar ? theme.accentDim : "transparent", border: "none", cursor: podeAvancar ? "pointer" : "not-allowed", color: podeAvancar ? theme.accent : theme.textDim, padding: "4px 11px", borderRadius: "6px", fontSize: "17px", lineHeight: 1, fontFamily: "'Outfit', sans-serif", opacity: podeAvancar ? 1 : 0.35, transition: "all 0.15s" }}
              onMouseEnter={e => { if (podeAvancar) { e.currentTarget.style.background = theme.accent; e.currentTarget.style.color = theme.accentOnAccent; } }}
              onMouseLeave={e => { if (podeAvancar) { e.currentTarget.style.background = theme.accentDim; e.currentTarget.style.color = theme.accent; } }}
            >›</button>
          </div>
        </div>

        {/* Bloco direito: ocupa a área da planilha; nome do ministério centralizado, ações à direita */}
        <div className="header-pad__end" style={{ flex: 1, minWidth: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px", padding: "0 24px" }}>
          <h1 className="header-ministerio-titulo" style={{
              position: "absolute", left: "50%", top: "50%",
              transform: "translate(-50%, -50%)",
              margin: 0, pointerEvents: "none", whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: "10px",
              fontFamily: "'Outfit', sans-serif",
              fontSize: "clamp(18px, 1.9vw, 24px)",
              fontWeight: 700, letterSpacing: "-0.3px",
              color: theme.text, lineHeight: 1.1,
            }}>
            {verRelatorio ? "RELATÓRIO" : verOutrosMinisterios ? "OUTROS MINISTÉRIOS" : current.nome}
            {!verRelatorio && !verOutrosMinisterios && !podeEditar && (
              <span style={{
                fontSize: "10px", fontWeight: 700, letterSpacing: "0.3px",
                padding: "2px 8px", borderRadius: "20px",
                background: "rgba(248,113,113,0.1)", color: "#f87171",
                border: "1px solid rgba(248,113,113,0.3)",
                whiteSpace: "nowrap", lineHeight: 1.4,
              }}>
                LEITURA
              </span>
            )}
          </h1>
          {onOpenRelatorio && (
            <a
              href={`#${HASH_SECTIONS.RELATORIO_GERAL}`}
              className="header-btn header-btn-relatorio"
              onClick={(e) => handleHashNavClick(e, onOpenRelatorio)}
              title="Relatório geral de todos os ministérios"
              style={{
                padding: "4px 12px", background: theme.accentDim,
                border: `1px solid var(--accent-border)`, borderRadius: "5px",
                color: theme.accent, fontSize: "12px", fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                textDecoration: "none",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = theme.accent; e.currentTarget.style.color = theme.accentOnAccent; }}
              onMouseLeave={e => { e.currentTarget.style.background = theme.accentDim; e.currentTarget.style.color = theme.accent; }}
            >
              Relatório Geral
            </a>
          )}
          <span className="header-email" style={{ fontSize: "12px", color: theme.textMuted }}>Olá, {user?.email}</span>
          <button className="header-btn header-btn-sair" onClick={logout} style={{ padding: "4px 12px", background: "transparent", border: `1px solid ${theme.border}`, borderRadius: "5px", color: theme.textMuted, fontSize: "12px", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = theme.danger; e.currentTarget.style.color = theme.danger; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}
          >Sair</button>
        </div>
      </header>

      {/* Layout */}
      <div className="dashboard-body" style={{ display: "flex", minHeight: "calc(100vh - 60px)", minWidth: 0, width: "100%", maxWidth: "100%" }}>

        {/* Sidebar desktop */}
        <aside className="desktop-sidebar" style={{
          width: "268px", minWidth: "268px",
          borderRight: "1px solid var(--border)",
          background: "var(--surface)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          padding: "18px 14px", overflowY: "auto",
          position: "sticky", top: "68px", height: "calc(100vh - 68px)",
          alignSelf: "flex-start",
        }}>
          <SidebarFiltros
            usuario={user}
            ministerioSelecionado={ministerioSelecionado}
            setMinisterioSelecionado={handleSetMinisterio}
            datasDisponiveis={datas}
            theme={theme}
            onMensagem={mostrarMensagem}
            onConflito={setConflito}
            refreshKey={refreshKey}
            indispRefreshKey={indispRefreshKey}
            mes={mes}
            escalas={escalas}
            pedirConfirmacao={pedirConfirmacao}
          />
        </aside>

        {/* Main */}
        <main ref={mainRef} className="main-pad" style={{ flex: 1, padding: "0 24px", overflowX: "clip", minWidth: 0, width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>

          {/* Cabeçalho da página + ações (mobile: ícones abaixo do título) */}
          <div className="page-header-block">
          <div className={`page-header${showMinistryHeaderBlock ? " page-header--with-ministry" : ""}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px", gap: "10px" }}>
            {showMinistryHeaderBlock && (
            <div className="page-header-top">
              <div className="page-header-ministry" style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
              <div className="page-header-ministry-icon" style={{
                color: theme.accent, flexShrink: 0, opacity: 0.85,
                background: theme.accentDim, borderRadius: "8px",
                padding: "6px", display: "flex", alignItems: "center", justifyContent: "center",
              }}>{current.icon}</div>
              <div style={{ minWidth: 0 }}>
                <div className="page-header-ministry-title-row" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h2 className="page-header-ministry-title" style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "-0.1px", color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0 }}>
                    {current.nome}
                  </h2>
                  {!podeEditar && (
                    <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "20px", background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, letterSpacing: "0.3px" }}>
                      LEITURA
                    </span>
                  )}
                </div>
                <p className="page-header-ministry-subtitle" style={{ fontSize: "11px", color: theme.textMuted, marginTop: "2px" }}>
                  {datas.length} datas · {Object.keys(escalas).length} escalas
                </p>
              </div>
            </div>
            </div>
            )}

            {/* Espaçador central do cabeçalho (mantém o layout estável) */}
            <div className="page-header-alert-slot" style={{ flex: 1, padding: "0 16px" }} />
          </div>

          {showMinistryHeaderBlock && <hr className="page-header-block-divider page-header-block-divider--title" aria-hidden />}

          <QuickActionBar
            filtroNome={filtroNome}
            onFiltroChange={(e) => setFiltroNome(e.target.value)}
            onClearFiltro={() => setFiltroNome("")}
            naPlanilha={naPlanilha}
            verRelatorio={verRelatorio}
            verOutrosMinisterios={verOutrosMinisterios}
            verIndisponibilidade={verIndisponibilidade}
            onToggleIndisponibilidade={() => setVerIndisponibilidade((v) => !v)}
            onVoltarPlanilha={voltarParaPlanilha}
            onToggleRelatorio={toggleRelatorio}
            onToggleOutrosMinisterios={toggleOutrosMinisterios}
            onHashNavClick={handleHashNavClick}
            onExportarModelo={handleDownload}
            opcoesExportacao={opcoesExportacao}
            baixando={baixando}
            onTexto={() => handleDownload("text")}
            onToggleTheme={toggleTheme}
            isDark={isDark}
            onOrganizar={handleOrganizar}
            podeOrganizar={podeOrganizar}
            podeEditar={podeEditar}
            limpando={limpando}
            onLimparMes={handleLimparTudo}
            showAcoesMenu={showAcoesMenu}
            setShowAcoesMenu={setShowAcoesMenu}
            acoesMenuRef={acoesMenuRef}
          />

          <hr className="page-header-block-divider page-header-block-divider--actions" aria-hidden />
          </div>

          {/* Estado de erro */}
          {error && (
            <div style={{
              padding: "20px 24px", borderRadius: "10px", marginBottom: "16px",
              background: theme.dangerDim, border: `1px solid ${theme.danger}33`,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 9V14M12 17.5V18M12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12C21 16.97 16.97 21 12 21Z"
                    stroke={theme.danger} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontSize: "13px", color: theme.danger, fontWeight: 500 }}>{error}</span>
              </div>
              <button
                onClick={retry}
                style={{
                  padding: "5px 14px", borderRadius: "5px", cursor: "pointer",
                  background: "transparent", border: `1px solid ${theme.danger}66`,
                  color: theme.danger, fontSize: "12px", fontFamily: "inherit", fontWeight: 600,
                  transition: "all 0.15s", flexShrink: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = theme.dangerDim; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                Tentar novamente
              </button>
            </div>
          )}

          {/* Grid ou Relatório */}
          {loading && !verRelatorio && !verOutrosMinisterios && Object.keys(escalas).length === 0 ? (
            <SkeletonGrid
              theme={theme}
              colunas={
                ministerioSelecionado === "comunicacao" ? 5 :
                ministerioSelecionado === "louvor"      ? 4 :
                ministerioSelecionado === "recepcao"    ? 3 : 3
              }
            />
          ) : !verRelatorio && !verOutrosMinisterios && !loading && !error && datas.length === 0 ? (
            <div style={{
              padding: "48px 24px", textAlign: "center",
              borderRadius: "10px", border: `1px solid ${theme.border}`,
              background: "var(--surface)",
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }}>
                <rect x="3" y="4" width="18" height="18" rx="2" stroke={theme.textMuted} strokeWidth="1.5"/>
                <line x1="16" y1="2" x2="16" y2="6" stroke={theme.textMuted} strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="8" y1="2" x2="8" y2="6" stroke={theme.textMuted} strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="3" y1="10" x2="21" y2="10" stroke={theme.textMuted} strokeWidth="1.5"/>
              </svg>
              <p style={{ fontSize: "13px", color: theme.textMuted, fontFamily: "'Outfit', sans-serif" }}>
                Nenhuma data disponível para este mês
              </p>
            </div>
          ) : ministerioTemConfigPlanilhaFaixas(ministerioSelecionado) ? (
            <div className="escala-stack">
              {verRelatorio ? (
                <RelatorioMinisterio
                  escalas={escalas}
                  datas={datas}
                  funcoes={funcoesPorMinisterio[ministerioSelecionado] || []}
                  ministerioId={ministerioSelecionado}
                  theme={theme}
                  onVoltar={(isTabletUp && !podeEditar) ? voltarParaPlanilha : undefined}
                />
              ) : verOutrosMinisterios ? (
                <CrossMinistryInfo
                  ministerioId={ministerioSelecionado}
                  mes={mes}
                  theme={theme}
                  onVoltar={(isTabletUp && !podeEditar) ? voltarParaPlanilha : undefined}
                />
              ) : (
              <div className="planilha-layout__main">
                {/* Confirmação — apenas o texto, no canto inferior direito (ao lado de "Salvando...") */}
                {mensagem.texto && (
                  <div
                    role="status"
                    aria-live="polite"
                    style={{
                      position: "fixed",
                      bottom: "16px",
                      right: "16px",
                      zIndex: 9999,
                      fontSize: "13px",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      color: mensagem.tipo === "sucesso" ? theme.success : theme.danger,
                      pointerEvents: "none",
                      animation: "msg-fade 0.2s ease",
                    }}
                  >
                    {mensagem.texto}
                  </div>
                )}
                <PlanilhaMinisterio
                  ministerioId={ministerioSelecionado}
                  {...planilhaMinisterioProps}
                />
              </div>
              )}
            </div>
          ) : verRelatorio ? (
            <RelatorioMinisterio
              escalas={escalas}
              datas={datas}
              funcoes={funcoesPorMinisterio[ministerioSelecionado] || []}
              ministerioId={ministerioSelecionado}
              theme={theme}
              onVoltar={(isTabletUp && !podeEditar) ? voltarParaPlanilha : undefined}
            />
          ) : verOutrosMinisterios ? (
            <CrossMinistryInfo
              ministerioId={ministerioSelecionado}
              mes={mes}
              theme={theme}
              onVoltar={(isTabletUp && !podeEditar) ? voltarParaPlanilha : undefined}
            />
          ) : (
            <div style={{
              padding: "48px 24px", textAlign: "center",
              borderRadius: "10px", border: `1px solid ${theme.border}`,
              background: "var(--surface)",
            }}>
              <p style={{ fontSize: "13px", color: theme.textMuted, fontFamily: "'Outfit', sans-serif" }}>
                Planilha indisponível para este ministério
              </p>
            </div>
          )}
        </main>
      </div>

      <IndisponibilidadeModal
        aberto={verIndisponibilidade}
        onFechar={() => { setVerIndisponibilidade(false); setIndispRefreshKey(k => k + 1); }}
        onDetectarOutrosMinisterios={() => {
          setExternalDetectionByMinisterio((prev) => ({
            ...prev,
            [ministerioSelecionado]: true,
          }));
        }}
        ministerioId={ministerioSelecionado}
        datasDisponiveis={datas}
        mes={mes}
        theme={theme}
      />

      <ConfirmModal
        aberto={confirmModal.aberto}
        titulo={confirmModal.titulo}
        descricao={confirmModal.descricao}
        confirmLabel={confirmModal.confirmLabel}
        onConfirmar={confirmModal.onConfirmar}
        onCancelar={() => cancelarConfirmacao(setConfirmModal, confirmModal)}
        perigoso={confirmModal.perigoso}
        theme={theme}
      />

      {textoExportacao.aberto && (
        <div
          role="presentation"
          onClick={() => setTextoExportacao({ aberto: false, conteudo: "" })}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100000,
            background: "rgba(0,0,0,0.68)",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="texto-exportacao-titulo"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "720px",
              background: theme.bg,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: "12px",
              padding: "20px",
              boxShadow: "0 20px 56px rgba(0,0,0,0.4)",
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "14px" }}>
              <div>
                <div
                  id="texto-exportacao-titulo"
                  style={{ fontSize: "15px", fontWeight: 700, color: theme.text }}
                >
                  Exportação em texto
                </div>
                <div style={{ fontSize: "12px", color: theme.textMuted, marginTop: "3px" }}>
                  Copie e compartilhe no formato de mensagem
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTextoExportacao({ aberto: false, conteudo: "" })}
                style={{
                  background: "transparent",
                  border: "none",
                  color: theme.textMuted,
                  cursor: "pointer",
                  fontSize: "20px",
                  lineHeight: 1,
                  padding: "0 2px",
                }}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <textarea
              readOnly
              value={textoExportacao.conteudo}
              style={{
                width: "100%",
                minHeight: "360px",
                resize: "vertical",
                borderRadius: "10px",
                border: `1px solid ${theme.border}`,
                background: theme.surface,
                color: theme.text,
                padding: "14px",
                fontSize: "13px",
                lineHeight: 1.6,
                fontFamily: "'JetBrains Mono', monospace",
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px" }}>
              <button
                type="button"
                onClick={() => setTextoExportacao({ aberto: false, conteudo: "" })}
                style={{
                  padding: "9px 16px",
                  borderRadius: "8px",
                  border: `1px solid ${theme.border}`,
                  background: "transparent",
                  color: theme.text,
                  cursor: "pointer",
                  fontSize: "13px",
                  fontFamily: "inherit",
                  fontWeight: 600,
                }}
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={copiarTextoExportacao}
                style={{
                  padding: "9px 16px",
                  borderRadius: "8px",
                  border: `1px solid ${theme.border}`,
                  background: theme.text,
                  color: theme.bg,
                  cursor: "pointer",
                  fontSize: "13px",
                  fontFamily: "inherit",
                  fontWeight: 600,
                }}
              >
                Copiar
              </button>
            </div>
          </div>
        </div>
      )}

      {conflito && createPortal(
        <div
          role="presentation"
          onClick={() => setConflito(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100000,
            background: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "max(16px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) max(16px, env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px))",
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="conflito-escala-msg"
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "440px",
              maxHeight: "min(90vh, 520px)",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              background: "var(--bg)",
              border: `1px solid rgba(248,113,113,0.45)`,
              borderRadius: "12px",
              padding: "clamp(16px, 4vw, 24px)",
              boxShadow: "0 20px 56px rgba(0,0,0,0.55)",
              fontFamily: "'Outfit', sans-serif",
              boxSizing: "border-box",
            }}
          >
            <p
              id="conflito-escala-msg"
              style={{
                fontSize: "clamp(13px, 3.8vw, 15px)",
                fontWeight: 600,
                color: theme.text,
                lineHeight: 1.5,
                margin: 0,
                marginBottom: "20px",
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              }}
            >
              <AlertTriangle size={16} color={theme.danger} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} /> <strong>{nomeParaExibicao(conflito.pessoa)}</strong> já está escalado(a) no MINISTÉRIO{" "}
<strong>{conflito.ministerio}</strong> na função <strong>{conflito.funcao}</strong> no{" "}
<strong>{conflito.data}</strong>
            </p>
            <button
              type="button"
              onClick={() => setConflito(null)}
              style={{
                width: "100%",
                padding: "11px 16px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "14px",
                fontFamily: "'Outfit', sans-serif",
                background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentGradientEnd})`,
                color: theme.accentOnAccent,
              }}
            >
              Entendi
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default function Dashboard({
  mes: mesProp,
  setMes: setMesProp,
  mesMinimo: mesMinimoProp,
  mesMaximo: mesMaximoProp,
  onOpenRelatorio,
}) {
  const { user } = useAuth();
  const [mesInternal, setMesInternal] = useState(getMesInicial);
  const [ministerioSelecionado, setMinisterioSelecionado] = useState(user?.ministerioId || "comunicacao");

  const mes = mesProp ?? mesInternal;
  const setMes = setMesProp ?? setMesInternal;
  const mesMinimoComputed = useMemo(() => getMesMinimo(), []);
  const mesMaximoComputed = useMemo(() => getMesMaximo(), []);
  const mesMinimo = mesMinimoProp ?? mesMinimoComputed;
  const mesMaximo = mesMaximoProp ?? mesMaximoComputed;

  return (
    <EscalaProvider ministerioId={ministerioSelecionado} mes={mes}>
      <DashboardContent
        ministerioSelecionado={ministerioSelecionado}
        setMinisterioSelecionado={setMinisterioSelecionado}
        mes={mes}
        setMes={setMes}
        mesMinimo={mesMinimo}
        mesMaximo={mesMaximo}
        onOpenRelatorio={onOpenRelatorio}
      />
    </EscalaProvider>
  );
}
