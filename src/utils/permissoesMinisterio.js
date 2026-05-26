import {
  pessoasPorFuncaoInfantil,
  pessoasPorFuncaoLouvor,
  pessoasPorFuncaoRecepcao,
} from "../data/pessoas";

const ABREVIACOES_POR_FUNCAO = {
  comunicacao: {
    "PROJEÇÃO": "P",
    "MESA DE SOM": "S",
    "TRANSMISSÃO": "T",
  },
  infantil: {
    "BERÇÁRIO": "B",
    MATERNAL: "M",
    JUNIORES: "J",
  },
  louvor: {
    MINISTRANTE: "M",
    "BVOCAL 1": "BV1",
    "BVOCAL 2": "BV2",
    "BVOCAL 3": "BV3",
    "BVOCAL 4": "BV4",
    "MÚSICO 1": "MS1",
    "MÚSICO 2": "MS2",
    "MÚSICO 3": "MS3",
    "MÚSICO 4": "MS4",
  },
  recepcao: {
    "INTRODUTOR(A) 1": "I1",
    "INTRODUTOR(A) 2": "I2",
    "INTRODUTOR(A) 3": "I3",
  },
};

function nomeEstaNaLista(nomePessoa, lista = []) {
  const pessoaLower = nomePessoa?.toLowerCase();
  if (!pessoaLower) return false;
  return lista.some((nome) => nome.toLowerCase() === pessoaLower);
}

export function getAbreviacoesPermitidasPessoa(ministerioId, pessoaNome) {
  if (!ministerioId || !pessoaNome) return [];

  if (ministerioId === "comunicacao") {
    return Object.values(ABREVIACOES_POR_FUNCAO.comunicacao);
  }

  if (ministerioId === "recepcao") {
    const podeServir =
      nomeEstaNaLista(pessoaNome, pessoasPorFuncaoRecepcao.INTRODUTOR) ||
      nomeEstaNaLista(pessoaNome, pessoasPorFuncaoRecepcao.INTRODUTORA);

    return podeServir ? Object.values(ABREVIACOES_POR_FUNCAO.recepcao) : [];
  }

  const mapaPessoasPorFuncao =
    ministerioId === "louvor" ? pessoasPorFuncaoLouvor : pessoasPorFuncaoInfantil;
  const mapaAbreviacoes = ABREVIACOES_POR_FUNCAO[ministerioId] || {};

  return Object.entries(mapaPessoasPorFuncao).flatMap(([funcao, pessoas]) =>
    nomeEstaNaLista(pessoaNome, pessoas) && mapaAbreviacoes[funcao]
      ? [mapaAbreviacoes[funcao]]
      : []
  );
}
