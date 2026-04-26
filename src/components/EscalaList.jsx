// ===== src/components/EscalaList.jsx (VERSÃO ATUALIZADA) =====
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import EscalaCard from "./EscalaCard";

const ministerios = [
  { id: "comunicacao", nome: "COMUNICAÇÕES" },
  { id: "louvor", nome: "LOUVOR" },
  { id: "recepcao", nome: "RECEPÇÃO" },
  { id: "infantil", nome: "INFANTIL" }
];

export default function EscalaList() {
  const { user } = useAuth();
  const [todasEscalas, setTodasEscalas] = useState([]);
  const [refresh, setRefresh] = useState(0);

// Filtra pelo ministério e monta o mapa de chaves
const escalas = useMemo(() => {
  const map = {};
  todasEscalas
    .filter(e => e.ministerioId === ministerioSelecionado)
    .forEach(e => {
      // turno null vira a string "null" no template literal — padronize com ?? 
      const turno = e.turno ?? "único";
      const chave = `${e.data}-${turno}-${e.funcao}`;
      map[chave] = e.pessoaNome;
    });
  return map;
}, [todasEscalas, ministerioSelecionado]);

  const forcarRefresh = () => setRefresh(prev => prev + 1);

  // Separa as escalas: do usuário e de outros ministérios
  const minhasEscalas = todasEscalas.filter(e => e.ministerioId === user?.ministerioId);
  const outrasEscalas = todasEscalas.filter(e => e.ministerioId !== user?.ministerioId);

  // Agrupa outras escalas por ministério
  const outrasPorMinisterio = {};
  outrasEscalas.forEach(escala => {
    if (!outrasPorMinisterio[escala.ministerioId]) {
      outrasPorMinisterio[escala.ministerioId] = [];
    }
    outrasPorMinisterio[escala.ministerioId].push(escala);
  });

  return (
    <div>
      {/* MINHA ESCALA (com edição) */}
      <div style={{ marginBottom: "30px" }}>
        <h3>📌 Minha Escala - {ministerios.find(m => m.id === user?.ministerioId)?.nome}</h3>
        {minhasEscalas.length === 0 && <p>Nenhuma escala cadastrada</p>}
        {minhasEscalas.map(escala => (
          <EscalaCard 
            key={escala.id} 
            escala={escala} 
            usuario={user} 
            onRefresh={forcarRefresh} 
          />
        ))}
      </div>

      {/* ESCALAS DE OUTROS MINISTÉRIOS (somente visualização) */}
      <div>
        <h3>👀 Escalas dos demais ministérios</h3>
        {ministerios.filter(m => m.id !== user?.ministerioId).map(ministerio => (
          <div key={ministerio.id} style={{ marginTop: "20px" }}>
            <h4>{ministerio.nome}</h4>
            {outrasPorMinisterio[ministerio.id]?.length === 0 && (
              <p>Nenhuma escala cadastrada</p>
            )}
            {outrasPorMinisterio[ministerio.id]?.map(escala => (
              <EscalaCard 
                key={escala.id} 
                escala={escala} 
                usuario={user} 
                onRefresh={forcarRefresh} 
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}