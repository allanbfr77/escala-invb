import { useCallback } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs, updateDoc } from "firebase/firestore";

export function useOrganizarLouvor({ escalas, datas, mes, setConfirmModal, mostrarMensagem, setRefreshKey }) {
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

        const changes = [];

        for (const funcoes of grupos) {
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
          if (pessoas.length === 0) continue;

          const candidatos = [];
          for (const pessoa of pessoas) {
            for (const f of funcoes) {
              candidatos.push({ pessoa, funcao: f, count: countMatrix[pessoa][f] || 0 });
            }
          }
          candidatos.sort((a, b) => b.count - a.count);

          const preferred       = {};
          const assignedPessoas = new Set();
          const usedFuncoes     = new Set();

          for (const { pessoa, funcao } of candidatos) {
            if (!assignedPessoas.has(pessoa) && !usedFuncoes.has(funcao)) {
              preferred[pessoa] = funcao;
              assignedPessoas.add(pessoa);
              usedFuncoes.add(funcao);
            }
          }
          const remainingFuncoes = funcoes.filter(f => !usedFuncoes.has(f));
          let ri = 0;
          for (const pessoa of pessoas) {
            if (!preferred[pessoa]) preferred[pessoa] = remainingFuncoes[ri++];
          }

          for (const dataObj of datas) {
            const turnoKey = dataObj.turno ?? "único";

            const currentAssignments = {};
            const disponiveisSlots   = new Set();
            for (const f of funcoes) {
              const pessoa = escalas[`${dataObj.data}-${turnoKey}-${f}`];
              if (pessoa === "disponível") disponiveisSlots.add(f);
              else if (pessoa)            currentAssignments[f] = pessoa;
            }

            const pessoasHoje = Object.values(currentAssignments);
            if (pessoasHoje.length === 0) continue;

            const availableSlots = funcoes.filter(f => !disponiveisSlots.has(f));
            const newAssignment  = {};
            const takenSlots     = new Set();

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
        }

        if (changes.length === 0) {
          mostrarMensagem("Grade já está organizada", "sucesso");
          return;
        }

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

  return handleOrganizarLouvor;
}
