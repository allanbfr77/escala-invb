// Mapeamento Função → Pessoas para ministérios com filtro dependente
const LISTA_PESSOAS_COMUNICACAO = [
  "ALAN",
  "ALEX",
  "A. BEATRIZ",
  "BIANCA",
  "JEAN",
  "JOÃO",
  "MATHEUS",
  "MEDEIROS",
];

export const pessoasPorFuncaoComunicacao = {
  "PROJEÇÃO": LISTA_PESSOAS_COMUNICACAO,
  "MESA DE SOM": LISTA_PESSOAS_COMUNICACAO,
  "TRANSMISSÃO": LISTA_PESSOAS_COMUNICACAO,
};

export const pessoasPorFuncaoLouvor = {
  "MINISTRANTE": ["CRIS", "DANIELA", "MIRIAN", "PR. HUMBERTO", "RAPHAELA"],
  "BVOCAL 1":    ["ALESSANDRO", "CRIS", "DANIELA", "LUCIANA F.", "MIRIAN", "PR. HUMBERTO", "RAPHAELA", "ROSE", "SEBASTIANA", "VANESSA R.", "ZEMA"],
  "BVOCAL 2":    ["ALESSANDRO", "CRIS", "DANIELA", "LUCIANA F.", "MIRIAN", "PR. HUMBERTO", "RAPHAELA", "ROSE", "SEBASTIANA", "VANESSA R.", "ZEMA"],
  "BVOCAL 3":    ["ALESSANDRO", "CRIS", "DANIELA", "LUCIANA F.", "MIRIAN", "PR. HUMBERTO", "RAPHAELA", "ROSE", "SEBASTIANA", "VANESSA R.", "ZEMA"],
  "BVOCAL 4":    ["ALESSANDRO", "CRIS", "DANIELA", "LUCIANA F.", "MIRIAN", "PR. HUMBERTO", "RAPHAELA", "ROSE", "SEBASTIANA", "VANESSA R.", "ZEMA"],
  "MÚSICO 1":    ["A. BEATRIZ", "LÉO", "MATHEUS", "MEDEIROS", "ZEMA"],
  "MÚSICO 2":    ["A. BEATRIZ", "LÉO", "MATHEUS", "MEDEIROS", "ZEMA"],
  "MÚSICO 3":    ["A. BEATRIZ", "LÉO", "MATHEUS", "MEDEIROS", "ZEMA"],
  "MÚSICO 4":    ["A. BEATRIZ", "LÉO", "MATHEUS", "MEDEIROS", "ZEMA"],
  "MESA DE SOM": ["ALAN", "A. BEATRIZ", "BIANCA", "JEAN", "MEDEIROS"],
};

export const pessoasPorFuncaoRecepcao = {
  "INTRODUTOR":  ["ALFREDO", "ATAYDE", "JOÃO", "MARCIO", "SALATHIEL", "WELLINGTON"],
  "INTRODUTORA": ["BIANCA M.", "CLAUDIA", "CLEUSA", "FRANCISCA", "HELENA", "LIA", "LUCIANA F.", "LUCIANE MARTINS", "MARILDA", "MIRIAN", "ROSE"],
};

export const pessoasPorFuncaoInfantil = {
  "BERÇÁRIO": ["BIANCA", "CELIANA", "CRIS", "ELIZANGELA", "MARILDA", "MARILIA", "RAPHAELA", "VANESSA H."],
  "MATERNAL": ["ALAN", "A. BEATRIZ", "ELIZANGELA", "FRANCISCA", "LUCIANE MARTINS", "LUCYENE PAULINO", "MARILIA", "MEDEIROS", "RAPHAELA", "SEBASTIANA", "SUELLEN"],
  "JUNIORES": ["ALAN", "ALESSANDRO", "A. BEATRIZ", "LUCIANE MARTINS", "MARILIA", "MEDEIROS", "PR. MARCIO", "VANESSA R."],
};

export const pessoasPorMinisterio = {
  comunicacao: LISTA_PESSOAS_COMUNICACAO,

  infantil: [
    "ALAN",
    "ALESSANDRO",
    "A. BEATRIZ",
    "BIANCA",
    "CELIANA",
    "CRIS",
    "ELIZANGELA",
    "FRANCISCA",
    "LUCIANE MARTINS",
    "LUCYENE PAULINO",
    "MARILDA",
    "MARILIA",
    "MEDEIROS",
    "PR. MARCIO",
    "RAPHAELA",
    "SEBASTIANA",
    "SUELLEN",
    "VANESSA H.",
    "VANESSA R."
  ],

  louvor: [
    "ALAN",
    "ALESSANDRO",
    "A. BEATRIZ",
    "BIANCA",
    "CRIS",
    "DANIELA",
    "ELIZANGELA",
    "JEAN",
    "LÉO",
    "LUCIANA F.",
    "MATHEUS",
    "MEDEIROS",
    "MIRIAN",
    "PR. HUMBERTO",
    "RAPHAELA",
    "ROSE",
    "SEBASTIANA",
    "VANESSA R.",
    "ZEMA"
  ],

  recepcao: [
    "ALFREDO",
    "ATAYDE",
    "BIANCA M.",
    "CLAUDIA",
    "CLEUSA",
    "FRANCISCA",
    "HELENA",
    "JOÃO",
    "LIA",
    "LUCIANA F.",
    "LUCIANE MARTINS",
    "MARCIO",
    "MARILDA",
    "MIRIAN",
    "ROSE",
    "SALATHIEL",
    "WELLINGTON"
  ]
};
