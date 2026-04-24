// ===== src/components/SidebarFiltros.jsx =====
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { funcoesPorMinisterio } from "../data/funcoes";
import { pessoasPorMinisterio } from "../data/pessoas";
import { formatarData } from "../utils/dateHelper";

const ministerios = [
  {
    id: "comunicacao", nome: "COMUNICAÇÕES",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="13" height="10" rx="2"/>
        <polygon points="15,9 21,6 21,18 15,15"/>
        <circle cx="4" cy="9.5" r="0.8" fill="white" stroke="none"/>
      </svg>
    ),
  },
  {
    id: "louvor", nome: "LOUVOR",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </svg>
    ),
  },
  {
    id: "recepcao", nome: "RECEPÇÃO",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    id: "infantil", nome: "INFANTIL",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="2.5"/>
        <path d="M12 7.5L12 14"/>
        <path d="M12 14L9 19"/>
        <path d="M12 14L15 19"/>
        <path d="M12 10L8 12"/>
        <path d="M12 10L16 12"/>
      </svg>
    ),
  },
];


export default function SidebarFiltros({
  usuario, ministerioSelecionado, setMinisterioSelecionado,
  datasDisponiveis, onRefresh, theme, onConfirmar,
  onMensagem, onConflito,
  // Incremente este valor externamente sempre que uma escala for removida
  // da grid para que o sidebar recarregue as datas ocupadas automaticamente.
  refreshKey = 0,
}) {
  const t = theme || {};
  const [salvando, setSalvando]               = useState(false);
  const [pessoaSelecionada, setPessoa]        = useState("");
  const [funcaoSelecionada, setFuncao]        = useState("");
  const [datasIds, setDatasIds]               = useState([]);
  const [datasConfirmadas, setDatasConfirmadas] = useState([]);

  // Datas já ocupadas para a combinação ministério + função (chave: "data|turno|funcao")
  const [datasOcupadas, setDatasOcupadas]     = useState(new Set());
  const [carregandoOcupadas, setCarregandoOcupadas] = useState(false);


  // ─── Limpa estado local quando o ministério muda ──────────────────────────
  useEffect(() => {
    setDatasConfirmadas([]);
    setDatasIds([]);
    setFuncao("");
    setPessoa("");
  }, [ministerioSelecionado]);

  // ─── FIX 1: Limpa datasConfirmadas quando refreshKey muda ─────────────────
  // Isso garante que datas removidas da grid voltam a aparecer no sidebar
  // sem precisar recarregar a página.
  useEffect(() => {
    if (refreshKey === 0) return;
    setDatasConfirmadas([]);
  }, [refreshKey]);

  // ─── FIX 2: Busca ocupadas com chave "data|turno|funcao" ──────────────────
  // Antes a chave era apenas "data|turno", o que fazia a data desaparecer
  // de TODAS as funções quando qualquer uma delas estava ocupada.
  // Agora cada função tem seu próprio banco de datas disponíveis.
  // Também limpa datasConfirmadas ao trocar de função, pois cada função
  // tem seu próprio conjunto de datas confirmadas nesta sessão.
  useEffect(() => {
    setDatasOcupadas(new Set());
    setDatasIds([]);
    setDatasConfirmadas([]);

    if (!funcaoSelecionada || !ministerioSelecionado) return;

    let cancelled = false;
    const buscarOcupadas = async () => {
      setCarregandoOcupadas(true);
      try {
        const snap = await getDocs(
          query(
            collection(db, "escalas"),
            where("ministerioId", "==", ministerioSelecionado),
            where("funcao", "==", funcaoSelecionada)
          )
        );

        if (cancelled) return;

        // Chave inclui a função → cada função tem seu próprio conjunto de ocupadas
        const ocupadas = new Set();
        snap.docs.forEach(doc => {
          const d = doc.data();
          const turno = d.turno ?? "único";
          // FIX: inclui funcao na chave para isolar por função
          ocupadas.add(`${d.data}|${turno}|${d.funcao}`);
        });
        setDatasOcupadas(ocupadas);
      } catch (err) {
        console.error("Erro ao buscar datas ocupadas:", err);
      } finally {
        if (!cancelled) setCarregandoOcupadas(false);
      }
    };

    buscarOcupadas();
    return () => { cancelled = true; };
  }, [ministerioSelecionado, funcaoSelecionada, refreshKey]);

  const pessoasDoMinisterio = pessoasPorMinisterio[ministerioSelecionado] || [];
  const funcoesDoMinisterio = funcoesPorMinisterio[ministerioSelecionado] || [];
  const podeEditar = usuario?.ministerioId === ministerioSelecionado;

  // ─── FIX 3: Filtro usa a chave "data|turno|funcaoSelecionada" ─────────────
  // Antes usava só "data|turno", removendo a data de todas as funções.
  const datasVisiveis = datasDisponiveis.filter(d => {
    // Datas já confirmadas nesta sessão para esta função ficam ocultas
    if (datasConfirmadas.includes(d.id)) return false;

    const turnoKey = d.turno ?? "único";
    // FIX: verifica ocupação apenas para a função atualmente selecionada
    if (datasOcupadas.has(`${d.data}|${turnoKey}|${funcaoSelecionada}`)) return false;

    return true;
  });

  // Desseleciona datas que sumiram da lista visível
  useEffect(() => {
    const visiveisIds = new Set(datasVisiveis.map(d => d.id));
    setDatasIds(prev => prev.filter(id => visiveisIds.has(id)));
  }, [datasOcupadas, datasConfirmadas]);

  const toggleData = (id) => {
    setDatasIds(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
    onConflito?.(null);
  };

  const handleConfirmarEscala = async () => {
    if (!podeEditar)           { onMensagem?.("Você só pode editar seu próprio ministério", "erro"); return; }
    if (!pessoaSelecionada)    { onMensagem?.("Selecione uma pessoa", "erro"); return; }
    if (!funcaoSelecionada)    { onMensagem?.("Selecione uma função", "erro"); return; }
    if (datasIds.length === 0) { onMensagem?.("Selecione ao menos uma data", "erro"); return; }

    setSalvando(true);
    onConflito?.(null);

    const datasObj = datasIds
      .map(id => datasDisponiveis.find(d => d.id === id))
      .filter(Boolean);

    let erros = 0;
    let conflito = null;
    const idsSalvos = [];

    for (const dataObj of datasObj) {
      const turnoSalvo = dataObj.turno === "único" ? "único" : dataObj.turno;

      try {
        // Verifica conflito com outro ministério para a mesma pessoa/data/turno
        const qConflito = query(
          collection(db, "escalas"),
          where("pessoaNome", "==", pessoaSelecionada.toLowerCase()),
          where("data", "==", dataObj.data),
          where("turno", "==", turnoSalvo)
        );
        const conflitoSnap = await getDocs(qConflito);
        const conflitoOutro = conflitoSnap.docs.find(d => d.data().ministerioId !== ministerioSelecionado);

        if (conflitoOutro) {
          const dd = conflitoOutro.data();
          const nomes = { comunicacao: "COMUNICAÇÕES", louvor: "LOUVOR", recepcao: "RECEPÇÃO", infantil: "INFANTIL" };
          if (!conflito) {
            conflito = {
              pessoa: pessoaSelecionada,
              data: formatarData(dataObj.data, dataObj.turno),
              ministerio: nomes[dd.ministerioId],
              funcao: dd.funcao,
            };
          }
          erros++;
          continue;
        }

        // Remove escala anterior para o mesmo ministério + função + data + turno
        const qExistente = query(
          collection(db, "escalas"),
          where("ministerioId", "==", ministerioSelecionado),
          where("data", "==", dataObj.data),
          where("funcao", "==", funcaoSelecionada),
          where("turno", "==", turnoSalvo)
        );
        const existenteSnap = await getDocs(qExistente);
        for (const doc of existenteSnap.docs) await deleteDoc(doc.ref);

        await addDoc(collection(db, "escalas"), {
          pessoaNome: pessoaSelecionada.toLowerCase(),
          funcao: funcaoSelecionada,
          ministerioId: ministerioSelecionado,
          data: dataObj.data,
          turno: turnoSalvo,
          horaInicio: dataObj.tipo === "domingo" && dataObj.turno === "manhã" ? "08:00" :
                      dataObj.tipo === "domingo" && dataObj.turno === "noite" ? "18:00" : "19:00",
          horaFim: dataObj.tipo === "domingo" && dataObj.turno === "manhã" ? "12:00" : "22:00",
          criadoPor: usuario.uid,
          criadoPorEmail: usuario.email,
          criadoEm: new Date().toISOString()
        });

        idsSalvos.push(dataObj.id);

        // Atualiza datasOcupadas localmente com chave que inclui a função
        setDatasOcupadas(prev => new Set([...prev, `${dataObj.data}|${turnoSalvo}|${funcaoSelecionada}`]));

      } catch (error) {
        console.error(error);
        erros++;
      }
    }

    const salvos = datasObj.length - erros;
    if (conflito) onConflito?.(conflito);

    if (salvos > 0) {
      setDatasConfirmadas(prev => [...prev, ...idsSalvos]);

      const plural = salvos === 1 ? "data" : "datas";
      onMensagem?.(
        `${pessoaSelecionada.toUpperCase()} escalado como ${funcaoSelecionada} em ${salvos} ${plural}`,
        erros > 0 ? "aviso" : "sucesso"
      );
      setDatasIds([]);
      if (onRefresh) onRefresh();
      if (!erros) setTimeout(() => { if (onConfirmar) onConfirmar(); }, 1200);
    } else {
      onMensagem?.("Nenhuma data foi salva (verifique conflitos)", "erro");
    }

    setSalvando(false);
  };

  const s = {
    label: {
      fontSize: "11px", fontWeight: 600, color: t.textMuted,
      textTransform: "uppercase", letterSpacing: "0.6px",
      display: "block", marginBottom: "6px"
    },
    select: {
      width: "100%", padding: "10px 12px", borderRadius: "6px",
      border: `1px solid ${t.border}`, background: t.bg,
      color: t.text, fontSize: "14px", fontFamily: "inherit",
      outline: "none", cursor: "pointer", appearance: "none",
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237d8590' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
      backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
      paddingRight: "28px",
    },
    field: { marginBottom: "18px" },
  };

  const datasHint = (() => {
    if (!funcaoSelecionada) return null;
    if (carregandoOcupadas) return { text: "Verificando disponibilidade...", color: t.textMuted };
    if (datasVisiveis.length === 0 && datasDisponiveis.length > 0) {
      return {
        text: "Todas as datas já estão preenchidas para esta função",
        color: "#d2993a",
      };
    }
    return null;
  })();

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>

      <div style={{ marginBottom: "20px", paddingBottom: "16px", borderBottom: `1px solid ${t.border}` }}>
        <p style={{ fontSize: "11px", fontWeight: 600, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.6px" }}>
          Adicionar à escala
        </p>
      </div>

      {/* Ministério */}
      <div style={s.field}>
        <label style={s.label}>Ministério</label>
        <select value={ministerioSelecionado} onChange={e => { setMinisterioSelecionado(e.target.value); onConflito?.(null); }} style={s.select}>
          {ministerios.map(m => (
            <option key={m.id} value={m.id}>{m.nome}{m.id === usuario?.ministerioId ? " (meu)" : ""}</option>
          ))}
        </select>
        {!podeEditar && (
          <div style={{ marginTop: "8px", padding: "8px 10px", borderRadius: "6px", background: "rgba(210,153,34,0.08)", border: "1px solid rgba(210,153,34,0.25)", display: "flex", alignItems: "center", gap: "7px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 9V14M12 17.5V18M12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" stroke="#d2993a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: "11px", color: "#d2993a", fontWeight: 600, letterSpacing: "0.3px" }}>SOMENTE LEITURA</span>
          </div>
        )}
      </div>

      {/* Pessoa */}
      <div style={s.field}>
        <label style={s.label}>Pessoa</label>
        <select value={pessoaSelecionada} onChange={e => { setPessoa(e.target.value); onConflito?.(null); }} style={{ ...s.select, opacity: !podeEditar ? 0.5 : 1 }} disabled={!podeEditar}>
          <option value="">Selecione...</option>
          {pessoasDoMinisterio.map(p => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Função */}
      <div style={s.field}>
        <label style={s.label}>Função</label>
        <select
          value={funcaoSelecionada}
          onChange={e => { setFuncao(e.target.value); onConflito?.(null); }}
          style={{ ...s.select, opacity: !podeEditar ? 0.5 : 1 }}
          disabled={!podeEditar}
        >
          <option value="">Selecione...</option>
          {funcoesDoMinisterio.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      {/* Datas — lista visível e compacta */}
      <div style={{ ...s.field }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
          <label style={{ ...s.label, marginBottom: 0 }}>
            Datas
            {datasIds.length > 0 && (
              <span style={{
                marginLeft: "7px", background: t.accent, color: "white",
                borderRadius: "10px", padding: "1px 6px", fontSize: "10px", fontWeight: 700,
              }}>
                {datasIds.length}
              </span>
            )}
          </label>
          {podeEditar && datasVisiveis.length > 0 && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => { setDatasIds(datasVisiveis.map(d => d.id)); onConflito?.(null); }}
                style={{
                  background: "transparent", border: "none", padding: 0,
                  fontSize: "11px", fontWeight: 600, color: t.accent,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Todas
              </button>
              <span style={{ color: t.border }}>·</span>
              <button
                onClick={() => { setDatasIds([]); onConflito?.(null); }}
                style={{
                  background: "transparent", border: "none", padding: 0,
                  fontSize: "11px", fontWeight: 600, color: t.textMuted,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Nenhuma
              </button>
            </div>
          )}
        </div>

        {/* Hint de datas ocupadas */}
        {datasHint && (
          <div style={{ marginBottom: "6px", display: "flex", alignItems: "center", gap: "5px" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 9V14M12 17.5V18M12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z"
                stroke={datasHint.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: "11px", color: datasHint.color, fontWeight: 500 }}>
              {datasHint.text}
            </span>
          </div>
        )}

        {/* Lista inline de datas */}
        <div style={{
          borderRadius: "6px", border: `1px solid ${t.border}`,
          overflow: "hidden",
          opacity: !podeEditar || carregandoOcupadas ? 0.5 : 1,
        }}>
          {carregandoOcupadas ? (
            <div style={{ padding: "10px 12px", fontSize: "13px", color: t.textMuted }}>
              Verificando disponibilidade...
            </div>
          ) : !funcaoSelecionada ? (
            <div style={{ padding: "10px 12px", fontSize: "13px", color: t.textMuted }}>
              Selecione uma função primeiro
            </div>
          ) : datasVisiveis.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: "13px", color: t.textMuted }}>
              Todas as datas já estão preenchidas
            </div>
          ) : (
            datasVisiveis.map((d, i) => {
              const checked = datasIds.includes(d.id);
              return (
                <div
                  key={d.id}
                  onClick={() => { if (podeEditar) toggleData(d.id); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "7px 10px", cursor: podeEditar ? "pointer" : "default",
                    background: checked ? (t.accentDim || "rgba(99,102,241,0.08)") : "transparent",
                    borderBottom: i < datasVisiveis.length - 1 ? `1px solid ${t.border}` : "none",
                    transition: "background 0.1s",
                  }}
                >
                  <span style={{
                    width: "14px", height: "14px", borderRadius: "3px", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: `2px solid ${checked ? t.accent : t.border}`,
                    background: checked ? t.accent : "transparent",
                    transition: "all 0.15s",
                  }}>
                    {checked && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                        <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  <span style={{
                    fontSize: "13px",
                    color: checked ? t.text : t.textMuted,
                    fontWeight: checked ? 500 : 400,
                  }}>
                    {formatarData(d.data, d.turno)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Botão confirmar */}
      <button
        onClick={handleConfirmarEscala}
        disabled={salvando || !podeEditar}
        style={{
          width: "100%", padding: "12px", borderRadius: "6px", border: "none",
          background: salvando || !podeEditar ? t.borderLight : t.accent,
          color: salvando || !podeEditar ? t.textDim : "white",
          fontSize: "14px", fontWeight: 600,
          cursor: salvando || !podeEditar ? "not-allowed" : "pointer",
          fontFamily: "inherit", letterSpacing: "-0.2px",
          transition: "all 0.15s", marginBottom: "8px",
        }}
      >
        {salvando
          ? "Salvando..."
          : datasIds.length > 1
            ? `Confirmar ${datasIds.length} escalas`
            : "Confirmar escala"}
      </button>

      {/* Botão limpar */}
      <button
        onClick={() => {
          setPessoa("");
          setFuncao("");
          setDatasIds([]);
          setDatasConfirmadas([]);
          setDatasOcupadas(new Set());
          onConflito?.(null);
        }}
        disabled={!podeEditar}
        style={{
          width: "100%", padding: "10px", borderRadius: "6px",
          border: `1px solid ${t.border}`, background: "transparent",
          color: t.textMuted, fontSize: "13px",
          cursor: !podeEditar ? "not-allowed" : "pointer",
          fontFamily: "inherit", opacity: !podeEditar ? 0.5 : 1,
        }}
      >
        Limpar seleção
      </button>

    </div>
  );
}