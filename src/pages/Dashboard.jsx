// ===== src/pages/Dashboard.jsx =====
import { useState, useRef, useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { EscalaProvider, useEscalas } from "../context/EscalaContext";
import SidebarFiltros from "../components/SidebarFiltros";
import { db } from "../firebase";
import { collection, query, where, getDocs, deleteDoc, updateDoc } from "firebase/firestore";
import html2canvas from "html2canvas";

import GridComunicacao from "../components/GridComunicacao";
import GridInfantil from "../components/GridInfantil";
import GridLouvor from "../components/GridLouvor";
import GridRecepcao from "../components/GridRecepcao";
import RelatorioMinisterio from "../components/RelatorioMinisterio";
import SkeletonGrid from "../components/SkeletonGrid";
import ConfirmModal from "../components/ConfirmModal";
import CrossMinistryInfo from "../components/CrossMinistryInfo";
import IndisponibilidadeModal from "../components/IndisponibilidadeModal";
import { funcoesPorMinisterio } from "../data/funcoes";
import { podeEditarMinisterio } from "../utils/permissions";
import { formatarData } from "../utils/dateHelper";

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

// ─────────────────────────────────────────────────────────────────────────────

const theme = {
  bg: "#0F1117",
  surface: "#161922",
  surfaceHover: "#1c2030",
  border: "#232838",
  borderLight: "#2e3650",
  accent: "#6366F1",
  accentDim: "rgba(99,102,241,0.12)",
  accentGlow: "rgba(99,102,241,0.08)",
  text: "#e2e8f0",
  textMuted: "#94A3B8",
  textDim: "#3a4258",
  danger: "#fb7185",
  dangerDim: "rgba(251,113,133,0.08)",
  success: "#34d399",
  successDim: "rgba(52,211,153,0.08)",
};

function DashboardContent({ ministerioSelecionado, setMinisterioSelecionado, mes, setMes, mesMinimo, mesMaximo }) {
  const { user, logout } = useAuth();
  const { escalas, datas, loading, error, retry } = useEscalas();
  // ── refreshKey dispara re-fetch no Sidebar quando uma escala é removida
  const [refreshKey, setRefreshKey] = useState(0);
  // ── indispRefreshKey dispara re-fetch das indisponibilidades quando o modal fecha
  const [indispRefreshKey, setIndispRefreshKey] = useState(0);
  const [verRelatorio, setVerRelatorio] = useState(false);
  const [limpando, setLimpando] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef(null);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [conflito, setConflito] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ aberto: false, titulo: "", descricao: "", confirmLabel: "Confirmar", perigoso: false, onConfirmar: null });
  const [filtroNome, setFiltroNome] = useState("");
  const [verIndisponibilidade, setVerIndisponibilidade] = useState(false);
  const gridRef = useRef(null);
  const mainRef = useRef(null);

  const mostrarMensagem = (texto, tipo = "sucesso") => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 3000);
  };

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

  const handleDownload = async (layout) => {
    setBaixando(true);
    try {
      const mesFormatado = new Date(mes + "-15")
        .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
        .replace(" de ", " ")
        .toUpperCase();

      const funcoes = funcoesPorMinisterio[ministerioSelecionado] || [];
      const isMobile = layout ? layout === "mobile" : window.innerWidth <= 768;

      // ── Paleta light ──────────────────────────────────────────────────────
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

      if (isMobile) {
        // ── MOBILE: cards lado a lado (3 colunas) ─────────────────────────
        const cols = 3;
        wrapper.style.padding = "16px";
        wrapper.style.width   = "900px";

        let cardsHTML = `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:8px;">`;

        datas.forEach(dataObj => {
          const turnoKey = dataObj.turno ?? "único";
          const dataLabel = formatarData(dataObj.data, dataObj.turno, dataObj.descricao);

          let rowsHTML = "";
          funcoes.forEach(f => {
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
        // ── DESKTOP: tabela light ──────────────────────────────────────────
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
          const rowBg = idx % 2 === 0 ? LT.surface : LT.zebra;
          tbodyHTML += `<tr style="background:${rowBg};">
            <td style="padding:9px 14px;font-weight:500;color:${LT.textMuted};
              font-size:11px;font-family:'Outfit',sans-serif;white-space:nowrap;
              border-right:1px solid ${LT.border};">
              ${formatarData(dataObj.data, dataObj.turno, dataObj.descricao)}
            </td>`;
          funcoes.forEach(f => {
            const pessoa = escalas[`${dataObj.data}-${turnoKey}-${f}`];
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

      // ── html2canvas ───────────────────────────────────────────────────────
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

  // ── incrementa refreshKey após remover para o Sidebar re-buscar
  const handleRemover = useCallback(async (dataStr, turno, funcao) => {
    try {
      const q = query(
        collection(db, "escalas"),
        where("ministerioId", "==", ministerioSelecionado),
        where("data", "==", dataStr),
        where("turno", "==", turno),
        where("funcao", "==", funcao)
      );
      const snap = await getDocs(q);
      for (const doc of snap.docs) await deleteDoc(doc.ref);
      setRefreshKey(k => k + 1);
    } catch (err) {
      mostrarMensagem("Erro ao remover escala", "erro");
    }
  }, [ministerioSelecionado]);

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
  const handleSetMinisterio = (v) => { setMinisterioSelecionado(v); setVerRelatorio(false); setFiltroNome(""); };

  const gridProps = useMemo(
    () => ({ escalas, datas, loading, onRemover: handleRemover, podeEditar, filtroNome }),
    [escalas, datas, loading, handleRemover, podeEditar, filtroNome]
  );
  const current = ministerioConfig[ministerioSelecionado];

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text, fontFamily: "'Outfit', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${theme.bg}; font-family: 'Outfit', sans-serif; }

        /* Glow de fundo para o glassmorphism ter profundidade */
        body::before {
          content: '';
          position: fixed;
          top: -30%;
          right: -20%;
          width: 700px;
          height: 700px;
          background: radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 65%);
          pointer-events: none;
          z-index: 0;
        }
        body::after {
          content: '';
          position: fixed;
          bottom: -20%;
          left: -10%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 65%);
          pointer-events: none;
          z-index: 0;
        }

        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${theme.borderLight}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${theme.textDim}; }

        /* Select focus */
        .sidebar-select:focus {
          border-color: ${theme.accent} !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }

        /* Skeleton loading */
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.7; }
        }
        .skeleton-pulse { animation: skeleton-pulse 1.6s ease-in-out infinite; }

        /* Hover nas linhas da grid */
        .grid-row:hover { background: rgba(255,255,255,0.08) !important; cursor: default; }

        /* Sticky header da grid */
        .grid-thead th {
          position: sticky;
          top: 0;
          z-index: 2;
          background: ${theme.surface};
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        /* Mobile: cards em vez de tabela */
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .header-title { display: none !important; }
          .header-sep { display: none !important; }
          .header-email { display: none !important; }
          .header-pad { padding: 0 14px !important; }
          .main-pad { padding: 14px 10px !important; }
          .page-header { flex-wrap: wrap; gap: 8px !important; }
          .page-header-actions { width: 100%; justify-content: flex-end; }
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
          .grid-row td {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px !important;
            border-bottom: 1px solid ${theme.border};
            white-space: normal !important;
          }
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
          .grid-date-cell { border-right: none !important; background: rgba(99,102,241,0.04); }
          .grid-row { height: auto !important; }

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
        background: "rgba(22,25,34,0.9)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderRight: `1px solid rgba(99,102,241,0.12)`,
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
        {/* ── ALTERADO: refreshKey passado para o Sidebar mobile */}
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
        />
      </div>

      {/* FAB mobile */}
      <button
        onClick={() => setDrawerAberto(true)}
        style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 150,
          width: "52px", height: "52px", borderRadius: "50%",
          background: theme.accent, border: "none", cursor: "pointer",
          boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
          display: "none", alignItems: "center", justifyContent: "center",
        }}
        className="fab-mobile"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      <style>{`
        .fab-mobile { display: none !important; }
        @media (max-width: 768px) { .fab-mobile { display: flex !important; } }
      `}</style>

      {/* Navbar */}
      <header className="header-pad" style={{
        borderBottom: `1px solid ${theme.border}`, background: theme.surface,
        padding: "0 24px", height: "48px", display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "26px", height: "26px", borderRadius: "7px", background: `linear-gradient(135deg, ${theme.accent}, #818cf8)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <span className="header-title" style={{ fontWeight: 600, fontSize: "13px", letterSpacing: "-0.2px", color: theme.text }}>
            Escala INVB
          </span>
          <span className="header-sep" style={{ color: theme.border, fontSize: "16px" }}>|</span>

          {/* Navegação de mês */}
          <div className="mes-nav" style={{ display: "flex", alignItems: "center", gap: "1px", background: theme.bg, borderRadius: "7px", padding: "2px 3px", border: `1px solid ${theme.border}` }}>
            <button
              onClick={handleMesAnterior}
              disabled={!podeRetroceder}
              title={!podeRetroceder ? "Mês mais antigo disponível" : undefined}
              style={{ background: "transparent", border: "none", cursor: podeRetroceder ? "pointer" : "not-allowed", color: podeRetroceder ? theme.textMuted : theme.textDim, padding: "2px 8px", borderRadius: "5px", fontSize: "13px", lineHeight: 1, fontFamily: "'Outfit', sans-serif", opacity: podeRetroceder ? 1 : 0.35, transition: "all 0.15s" }}
              onMouseEnter={e => { if (podeRetroceder) { e.currentTarget.style.color = theme.text; e.currentTarget.style.background = theme.surface; } }}
              onMouseLeave={e => { if (podeRetroceder) { e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.background = "transparent"; } }}
            >‹</button>
            <span style={{ color: theme.text, fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", minWidth: "86px", textAlign: "center", fontWeight: 500, letterSpacing: "0.5px" }}>
              {new Date(mes + "-15").toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "").toUpperCase()}
            </span>
            <button
              onClick={handleMesProximo}
              disabled={!podeAvancar}
              title={!podeAvancar ? "Dezembro é o último mês disponível" : undefined}
              style={{ background: podeAvancar ? theme.accentDim : "transparent", border: "none", cursor: podeAvancar ? "pointer" : "not-allowed", color: podeAvancar ? theme.accent : theme.textDim, padding: "2px 8px", borderRadius: "5px", fontSize: "13px", lineHeight: 1, fontFamily: "'Outfit', sans-serif", opacity: podeAvancar ? 1 : 0.35, transition: "all 0.15s" }}
              onMouseEnter={e => { if (podeAvancar) { e.currentTarget.style.background = theme.accent; e.currentTarget.style.color = "white"; } }}
              onMouseLeave={e => { if (podeAvancar) { e.currentTarget.style.background = theme.accentDim; e.currentTarget.style.color = theme.accent; } }}
            >›</button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="header-email" style={{ fontSize: "12px", color: theme.textMuted }}>Olá, {user?.email}</span>
          <button onClick={logout} style={{ padding: "4px 12px", background: "transparent", border: `1px solid ${theme.border}`, borderRadius: "5px", color: theme.textMuted, fontSize: "12px", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = theme.danger; e.currentTarget.style.color = theme.danger; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}
          >Sair</button>
        </div>
      </header>

      {/* Layout */}
      <div style={{ display: "flex", minHeight: "calc(100vh - 56px)" }}>

        {/* Sidebar desktop */}
        <aside className="desktop-sidebar" style={{
          width: "268px", minWidth: "268px",
          borderRight: `1px solid rgba(99,102,241,0.1)`,
          background: "rgba(22,25,34,0.8)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          padding: "18px 14px", overflowY: "auto",
          position: "sticky", top: "48px", height: "calc(100vh - 48px)",
        }}>
          {/* ── ALTERADO: refreshKey passado para o Sidebar desktop */}
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
          />
        </aside>

        {/* Main */}
        <main ref={mainRef} className="main-pad" style={{ flex: 1, padding: "20px 24px", overflowX: "hidden", minWidth: 0 }}>

          {/* Page header */}
          <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
              <div style={{
                color: theme.accent, flexShrink: 0, opacity: 0.85,
                background: theme.accentDim, borderRadius: "8px",
                padding: "6px", display: "flex", alignItems: "center", justifyContent: "center",
              }}>{current.icon}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h2 style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "-0.1px", color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0 }}>
                    {current.nome}
                  </h2>
                  {!podeEditar && (
                    <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "20px", background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, letterSpacing: "0.3px" }}>
                      LEITURA
                    </span>
                  )}
                </div>
                <p style={{ fontSize: "11px", color: theme.textMuted, marginTop: "2px" }}>
                  {datas.length} datas · {Object.keys(escalas).length} escalas
                </p>
              </div>
            </div>

            {/* Alertas centralizados */}
            <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "0 16px" }}>
              {mensagem.texto && (
                <div style={{
                  padding: "7px 14px", borderRadius: "6px", fontSize: "13px", display: "flex", alignItems: "center", gap: "7px",
                  background: mensagem.tipo === "sucesso" ? theme.successDim : theme.dangerDim,
                  color: mensagem.tipo === "sucesso" ? theme.success : theme.danger,
                  border: `1px solid ${mensagem.tipo === "sucesso" ? theme.success : theme.danger}33`,
                }}>
                  {mensagem.tipo === "sucesso" ? "✓" : "✕"} {mensagem.texto}
                </div>
              )}
              {conflito && (
                <div style={{
                  padding: "7px 14px", borderRadius: "6px", fontSize: "12px", display: "flex", alignItems: "center", gap: "10px",
                  background: theme.dangerDim, border: `1px solid ${theme.danger}44`, color: theme.danger,
                }}>
                  <span>⚠ <strong>{conflito.pessoa.toUpperCase()}</strong> já está em <strong>{conflito.ministerio}</strong> como <strong>{conflito.funcao}</strong> em {conflito.data}</span>
                  <button onClick={() => setConflito(null)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.danger, fontSize: "16px", padding: 0, lineHeight: 1, flexShrink: 0 }}>✕</button>
                </div>
              )}
            </div>

            <div className="page-header-actions" style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>

              {/* Filtro por nome — apenas no modo edição e fora do relatório */}
              {podeEditar && !verRelatorio && <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                  style={{ position: "absolute", left: "8px", pointerEvents: "none", zIndex: 1 }}>
                  <circle cx="11" cy="11" r="8" stroke={theme.textMuted} strokeWidth="2"/>
                  <path d="M21 21l-4.35-4.35" stroke={theme.textMuted} strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <input
                  type="text"
                  placeholder="Filtrar nome..."
                  value={filtroNome}
                  onChange={e => setFiltroNome(e.target.value)}
                  style={{
                    padding: "5px 24px 5px 26px",
                    background: "transparent",
                    border: `1px solid ${filtroNome ? theme.accent : theme.border}`,
                    borderRadius: "5px",
                    color: theme.text,
                    fontSize: "12px",
                    fontFamily: "inherit",
                    outline: "none",
                    width: "130px",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={e => { if (!filtroNome) e.target.style.borderColor = theme.borderLight; }}
                  onBlur={e => { if (!filtroNome) e.target.style.borderColor = theme.border; }}
                />
                {filtroNome && (
                  <button
                    onClick={() => setFiltroNome("")}
                    style={{
                      position: "absolute", right: "6px",
                      background: "none", border: "none", cursor: "pointer",
                      color: theme.textMuted, fontSize: "15px", padding: 0,
                      lineHeight: 1, display: "flex", alignItems: "center",
                    }}
                    title="Limpar filtro"
                  >×</button>
                )}
              </div>}

              <div
                ref={downloadMenuRef}
                style={{ position: "relative", display: "inline-flex" }}
                onBlur={e => { if (!downloadMenuRef.current?.contains(e.relatedTarget)) setShowDownloadMenu(false); }}
              >
                <button
                  onClick={() => { setShowDownloadMenu(v => !v); }}
                  disabled={baixando || !podeEditar}
                  title={!podeEditar ? "Disponível apenas no modo de edição" : "Baixar escala"}
                  style={{
                    padding: "5px 10px", background: "transparent",
                    border: `1px solid ${theme.border}`, borderRadius: "5px",
                    color: !podeEditar ? theme.textDim : theme.textMuted,
                    fontSize: "12px",
                    cursor: (baixando || !podeEditar) ? "not-allowed" : "pointer",
                    fontFamily: "inherit", display: "flex", alignItems: "center", gap: "5px",
                    transition: "all 0.15s", opacity: !podeEditar ? 0.35 : 1,
                  }}
                  onMouseEnter={e => {
                    if (!baixando && podeEditar) {
                      e.currentTarget.style.borderColor = theme.accent;
                      e.currentTarget.style.color = theme.accent;
                      e.currentTarget.style.background = theme.accentGlow;
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = theme.border;
                    e.currentTarget.style.color = !podeEditar ? theme.textDim : theme.textMuted;
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  <span className="btn-label">{baixando ? "Gerando..." : "Baixar escala"}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className="download-chevron"
                    style={{ marginLeft:"2px", transition:"transform 0.15s", transform: showDownloadMenu ? "rotate(180deg)" : "rotate(0deg)" }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {showDownloadMenu && (
                  <div style={{
                    position:"absolute", top:"calc(100% + 4px)", right:0,
                    background: theme.surface, border:`1px solid ${theme.border}`,
                    borderRadius:"7px", boxShadow:"0 8px 24px rgba(0,0,0,0.35)",
                    zIndex:200, minWidth:"170px", overflow:"hidden",
                  }}>
                    <div style={{ padding:"6px 10px 4px", fontSize:"9px", fontWeight:600, color:theme.textDim, textTransform:"uppercase", letterSpacing:"0.6px" }}>
                      Formato de download
                    </div>
                    {[
                      { label:"Tabela (Web)",   icon:"▤", layout:"web",    desc:"linhas e colunas" },
                      { label:"Cards (Mobile)", icon:"⊞", layout:"mobile", desc:"cards por culto"  },
                    ].map(opt => (
                      <button
                        key={opt.layout}
                        onClick={() => { setShowDownloadMenu(false); handleDownload(opt.layout); }}
                        style={{
                          width:"100%", textAlign:"left", background:"none",
                          border:"none", padding:"8px 12px", cursor:"pointer",
                          display:"flex", alignItems:"center", gap:"10px",
                          color:theme.text, fontFamily:"inherit", transition:"background 0.1s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = theme.accentGlow}
                        onMouseLeave={e => e.currentTarget.style.background = "none"}
                      >
                        <span style={{ fontSize:"15px", lineHeight:1, color:theme.accent }}>{opt.icon}</span>
                        <div>
                          <div style={{ fontSize:"12px", fontWeight:600 }}>{opt.label}</div>
                          <div style={{ fontSize:"10px", color:theme.textMuted }}>{opt.desc}</div>
                        </div>
                      </button>
                    ))}
                    <div style={{ height:"4px" }} />
                  </div>
                )}
              </div>

              {podeEditar && (
                <button
                  onClick={() => setVerRelatorio(v => !v)}
                  style={{
                    padding: "5px 10px", fontFamily: "inherit",
                    background: verRelatorio ? "rgba(52,211,153,0.1)" : "transparent",
                    border: `1px solid ${verRelatorio ? "#34d399" : theme.border}`,
                    borderRadius: "5px",
                    color: verRelatorio ? "#34d399" : theme.textMuted,
                    fontSize: "12px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "5px",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => {
                    if (!verRelatorio) {
                      e.currentTarget.style.borderColor = "#34d399";
                      e.currentTarget.style.color = "#34d399";
                      e.currentTarget.style.background = "rgba(52,211,153,0.07)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!verRelatorio) {
                      e.currentTarget.style.borderColor = theme.border;
                      e.currentTarget.style.color = theme.textMuted;
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 20V10M12 20V4M6 20v-6"/>
                  </svg>
                  <span className="btn-label">Relatório</span>
                </button>
              )}

              {podeEditar && (
                <button
                  onClick={() => setVerIndisponibilidade(v => !v)}
                  style={{
                    padding: "5px 10px", fontFamily: "inherit",
                    background: verIndisponibilidade ? "rgba(251,146,60,0.12)" : "transparent",
                    border: `1px solid ${verIndisponibilidade ? "rgba(251,146,60,0.4)" : theme.border}`,
                    borderRadius: "5px",
                    color: verIndisponibilidade ? "#fb923c" : theme.textMuted,
                    fontSize: "12px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "5px",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => {
                    if (!verIndisponibilidade) {
                      e.currentTarget.style.borderColor = "#ef444466";
                      e.currentTarget.style.color = "#ef4444";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!verIndisponibilidade) {
                      e.currentTarget.style.borderColor = theme.border;
                      e.currentTarget.style.color = theme.textMuted;
                    }
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                  </svg>
                  <span className="btn-label">Indisponível</span>
                </button>
              )}

              {podeEditar && ministerioSelecionado === "recepcao" && (
                <button
                  onClick={handleOrganizarRecepcao}
                  title="Organizar introdutores por coluna"
                  style={{
                    padding: "5px 10px", background: "transparent",
                    border: `1px solid ${theme.border}`,
                    borderRadius: "5px", color: theme.textMuted,
                    fontSize: "12px", cursor: "pointer",
                    fontFamily: "inherit", display: "flex", alignItems: "center", gap: "5px",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#a78bfa66"; e.currentTarget.style.color = "#a78bfa"; e.currentTarget.style.background = "rgba(167,139,250,0.07)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.background = "transparent"; }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                  </svg>
                  <span className="btn-label">Organizar</span>
                </button>
              )}

              {podeEditar && ministerioSelecionado === "louvor" && (
                <button
                  onClick={handleOrganizarLouvor}
                  title="Organizar BVocais e Músicos por coluna"
                  style={{
                    padding: "5px 10px", background: "transparent",
                    border: `1px solid ${theme.border}`,
                    borderRadius: "5px", color: theme.textMuted,
                    fontSize: "12px", cursor: "pointer",
                    fontFamily: "inherit", display: "flex", alignItems: "center", gap: "5px",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#a78bfa66"; e.currentTarget.style.color = "#a78bfa"; e.currentTarget.style.background = "rgba(167,139,250,0.07)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.background = "transparent"; }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                  </svg>
                  <span className="btn-label">Organizar</span>
                </button>
              )}

              {podeEditar && (
                <button onClick={handleLimparTudo} disabled={limpando}
                  style={{ padding: "5px 10px", background: "transparent", border: `1px solid ${theme.border}`, borderRadius: "5px", color: theme.textMuted, fontSize: "12px", cursor: limpando ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "5px", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#38bdf866"; e.currentTarget.style.color = "#38bdf8"; e.currentTarget.style.background = "rgba(56,189,248,0.07)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.background = "transparent"; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                  </svg>
                  <span className="btn-label">{limpando ? "Limpando..." : "Limpar mês"}</span>
                </button>
              )}
            </div>
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
          {verRelatorio ? (
            <RelatorioMinisterio
              escalas={escalas}
              datas={datas}
              funcoes={funcoesPorMinisterio[ministerioSelecionado] || []}
              ministerioId={ministerioSelecionado}
              theme={theme}
              onVoltar={() => setVerRelatorio(false)}
            />
          ) : loading && Object.keys(escalas).length === 0 ? (
            <SkeletonGrid
              theme={theme}
              colunas={
                ministerioSelecionado === "comunicacao" ? 5 :
                ministerioSelecionado === "louvor"      ? 4 :
                ministerioSelecionado === "recepcao"    ? 3 : 3
              }
            />
          ) : !loading && !error && datas.length === 0 ? (
            <div style={{
              padding: "48px 24px", textAlign: "center",
              borderRadius: "10px", border: `1px solid ${theme.border}`,
              background: "rgba(15,17,23,0.6)",
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
          ) : (
            <>
              <div ref={gridRef}>
                {ministerioSelecionado === "comunicacao" && <GridComunicacao {...gridProps} theme={theme} />}
                {ministerioSelecionado === "infantil"    && <GridInfantil    {...gridProps} theme={theme} />}
                {ministerioSelecionado === "louvor"      && <GridLouvor      {...gridProps} theme={theme} />}
                {ministerioSelecionado === "recepcao"    && <GridRecepcao    {...gridProps} theme={theme} />}
              </div>
              {podeEditar && (
                <CrossMinistryInfo
                  ministerioId={ministerioSelecionado}
                  mes={mes}
                  theme={theme}
                />
              )}
            </>
          )}
        </main>
      </div>

      <IndisponibilidadeModal
        aberto={verIndisponibilidade}
        onFechar={() => { setVerIndisponibilidade(false); setIndispRefreshKey(k => k + 1); }}
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
        onCancelar={() => setConfirmModal(prev => ({ ...prev, aberto: false }))}
        perigoso={confirmModal.perigoso}
        theme={theme}
      />
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [mes, setMes] = useState(getMesInicial);
  const [ministerioSelecionado, setMinisterioSelecionado] = useState(user?.ministerioId || "comunicacao");

  const mesMinimo = useMemo(() => getMesMinimo(), []);
  const mesMaximo = useMemo(() => getMesMaximo(), []);

  return (
    <EscalaProvider ministerioId={ministerioSelecionado} mes={mes}>
      <DashboardContent
        ministerioSelecionado={ministerioSelecionado}
        setMinisterioSelecionado={setMinisterioSelecionado}
        mes={mes}
        setMes={setMes}
        mesMinimo={mesMinimo}
        mesMaximo={mesMaximo}
      />
    </EscalaProvider>
  );
}