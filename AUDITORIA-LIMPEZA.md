# Auditoria de Limpeza — escala-igreja

> **Status:** relatório apenas. **Nada foi removido.** Revisaremos item a item e só removerei após sua aprovação explícita.
> Stack: Vite 8 + React 18 + TypeScript + Firebase. Entry point: `src/main.jsx`.
> Método: grafo de imports com alcançabilidade (BFS a partir de `main.jsx`) + grep por referências dinâmicas/string em todo o projeto (incluindo `index.html`, `public/sw.js`, `manifest.json`, `scripts/`).

## Resumo

| Categoria | Itens | Confiança predominante |
|---|---|---|
| Arquivos mortos (código) | 18 | Alta |
| Assets sem referência | 6 | Alta |
| Funções/exports mortos (em arquivos vivos) | 11 | Alta |
| Exports usados só internamente (over-export) | ~19 | Média |
| Dependências não usadas | **0** | — |
| Configurações obsoletas / sujas | 2 | Média/Alta |
| Código duplicado / legado | ver seção | Alta |

Achado principal: o projeto migrou de uma arquitetura antiga **baseada em "Grid" por ministério** para uma arquitetura unificada **baseada em "Planilha de Faixas" (`PlanilhaMinisterio`)**. Quase todo o código morto é resíduo dessa refatoração. Também há sobras do template inicial do Vite.

---

## 1. Arquivos mortos (sem nenhuma referência viva)

Todos abaixo são **inalcançáveis a partir de `main.jsx`** e **não têm referência por string** em nenhum lugar (src, index.html, sw.js, manifest, scripts).

### 1a. Arquitetura "Grid" antiga (substituída por `PlanilhaMinisterio`)

| Arquivo | Motivo | Evidência | Impacto da remoção | Confiança |
|---|---|---|---|---|
| `src/pages/DashboardGrid.jsx` | Página da arquitetura antiga; substituída por `PlanilhaMinisterio`. Comentário em `planilhaMinisterioConfig.js` diz "substitui DashboardGrid". | Não importado por nada vivo. | Nenhum (não montado). | Alta |
| `src/components/GridComunicacao.jsx` | Grid por ministério (antigo). | Só era usado por `DashboardGrid` (morto). | Nenhum. | Alta |
| `src/components/GridInfantil.jsx` | idem | idem | Nenhum. | Alta |
| `src/components/GridLouvor.jsx` | idem | idem | Nenhum. | Alta |
| `src/components/GridRecepcao.jsx` | idem | idem | Nenhum. | Alta |
| `src/components/EscalaCard.jsx` | Card de escala da UI antiga. | Sem importadores vivos. | Nenhum. | Alta |
| `src/components/ModalInserirEscala.jsx` | Modal da UI antiga. | Sem importadores vivos. | Nenhum. | Alta |
| `src/components/AbrevBadge.jsx` | Badge usado só dentro dos Grids/DashboardGrid. | Único importador vivo seria `DashboardGrid` (morto). | Nenhum. | Alta |
| `src/components/TurnoLabelInline.jsx` | Label usado só pelos `Grid*`/`DashboardGrid`. | Todos os importadores estão mortos. | Nenhum. | Alta |
| `src/utils/permissoesMinisterio.js` | Helper de permissões usado só por `DashboardGrid`. | Único importador (`DashboardGrid`) está morto. **Atenção:** não confundir com `src/utils/permissions.js`, que é vivo. | Nenhum. | Alta |
| `src/components/NavBar.jsx` | Barra de navegação antiga (usa `ThemeContext`, mas não é montada em lugar nenhum). | Sem importadores. | Nenhum. | Alta |

### 1b. Download antigo

| Arquivo | Motivo | Evidência | Impacto | Confiança |
|---|---|---|---|---|
| `src/components/DownloadButton.jsx` | Botão de download da UI antiga. | Sem importadores. | Nenhum. | Alta |
| `src/hooks/useDownload.js` | Hook de exportação antigo (usava `html2canvas`). O `Dashboard.jsx` atual já tem a lógica de `html2canvas` inline. | Sem importadores. | Nenhum — `html2canvas` continua sendo usado pelo `Dashboard.jsx`, então **a dependência permanece necessária**. | Alta |

### 1c. Louvor legado (substituído pela planilha genérica)

| Arquivo | Motivo | Evidência | Impacto | Confiança |
|---|---|---|---|---|
| `src/components/PlanilhaLouvor.jsx` | Marcado `@deprecated Use PlanilhaMinisterio com ministerioId="louvor"`. | Sem importadores vivos. | Nenhum. | Alta |
| `src/utils/planilhaLouvorLayout.js` | Versão "louvor" do layout, duplicando `planilhaFaixasLayout.js`. | Só era referenciado pelo `PlanilhaLouvor` (morto). | Nenhum. | Alta |
| `src/hooks/useOrganizarLouvor.js` | Hook de organização do louvor, da arquitetura antiga. | Sem importadores. | Nenhum. | Alta |

### 1d. Sobras do template Vite

| Arquivo | Motivo | Evidência | Impacto | Confiança |
|---|---|---|---|---|
| `src/counter.ts` | Demo `setupCounter` do template inicial do Vite. Único arquivo `.ts` do projeto. | Sem importadores. | Nenhum. Ver também seção "Configurações" sobre o `tsconfig`. | Alta |
| `src/routes.jsx` | **Arquivo vazio.** | 0 bytes de conteúdo; nenhuma referência. | Nenhum. | Alta |

---

## 2. Assets sem referência

| Arquivo | Motivo | Evidência | Impacto | Confiança |
|---|---|---|---|---|
| `src/assets/hero.png` | Asset do template. | 0 referências em código/HTML. | Nenhum. | Alta |
| `src/assets/typescript.svg` | Asset do template. | 0 referências. | Nenhum. | Alta |
| `src/assets/vite.svg` | Asset do template. | 0 referências. | Nenhum. | Alta |
| `public/favicon.svg` | Favicon não usado — o `index.html` define ícones via `/logo3.png`. | 0 referências em `index.html`, `manifest.json`, `sw.js`. | Nenhum. | Alta |
| `public/icons.svg` | Sprite/ícone sem referência. | 0 referências em qualquer lugar. | **Médio-Alto** — verificar se não é aberto manualmente; nenhum `<use href>` ou import aponta para ele. | Média-Alta |
| `public/ministerios/logo2.png` | Variante de logo não usada (os usados são `logo.png` e `logo3.png`; os `*2.png` de ministério usados no `Login.jsx` são `comunicacoes2/infantil2/louvor2/recepcao2`). | 0 referências. | Nenhum. | Alta |

> Observação: `public/sw.js` faz cache de estáticos por extensão (`.svg/.png/.woff2`), mas não referencia nominalmente esses arquivos — cache por extensão não conta como "uso".

---

## 3. Funções / exports mortos (dentro de arquivos vivos)

Símbolos exportados que **não são usados em nenhum lugar** (nem em outros arquivos, nem internamente). Confiança **Alta** — o único risco residual seria uso dinâmico por string, improvável para utilitários internos.

| Arquivo | Símbolo | Tipo |
|---|---|---|
| `src/utils/permissions.js` | `isMaster` | função |
| `src/utils/dateHelper.js` | `formatarDataIndisponibilidadeCurta` | função |
| `src/utils/gridAbreviacoes.js` | `estiloBadgeAbrevExport` | função |
| `src/utils/gridAbreviacoes.js` | `buildCellsFromEscalas` | função |
| `src/utils/gridAbreviacoes.js` | `getTooltipAbrevCombinadas` | função |
| `src/utils/gridAbreviacoes.js` | `formatarCabecalhoColuna` | função |
| `src/utils/indisponibilidadeHelpers.js` | `filtrarPessoasDisponiveisMes` | função |
| `src/utils/indisponibilidadeHelpers.js` | `contarIndisponibilidadesNoMes` | função |
| `src/utils/escalasCruzadas.js` | `contarBloqueiosIndisponibilidade` | função |
| `src/utils/planilhaMinisterioConfig.js` | `ministerioUsaPlanilhaFaixas` | função |
| `src/utils/planilhaFaixasLayout.js` | `colunasComData` | função |
| `src/constants/theme.js` | `themeLight` | constante |

**Impacto da remoção:** remover só o símbolo (o arquivo permanece, pois tem outros exports vivos). Nenhum efeito em runtime.

---

## 4. Exports usados apenas internamente (over-export) — opcional

Estes símbolos **são usados**, mas só dentro do próprio arquivo — não precisam da palavra-chave `export`. Não são código morto; é apenas superfície de API desnecessária. **Confiança média**, **prioridade baixa**, risco baixo (remover só o `export`, manter a função).

`dashboardSectionFromFlags` (hashNavigation), `isMasterReadOnly` (permissions), `ICONES_MINISTERIO` (ministerioIcons), `montarDatasMinisterio` (relatorioUnificado), `CORES_FUNCAO`/`abrevParaFuncao`/`abreviacoesValidas`/`parseAbreviacoesCombinadas`/`formatarAbreviacoesCombinadas` (gridAbreviacoes), `MINISTERIO_ESCALA_FLEXIVEL` (regrasMinisterio), `buildMinisteriosPorPessoa`/`MINISTERIOS_POR_PESSOA` (ministeriosPorPessoa), `ABREV_MINISTERIOS_INDISP` (escalasCruzadas), `MINISTERIOS_PLANILHA_FAIXAS` (planilhaMinisterioConfig), `COLUNAS_POR_FAIXA` (planilhaFaixasLayout), `LIMITE_ESCALAS_INFANTIL_MES`/`cultoKey`/`dataPertenceAoMes` (limiteEscalasInfantil), `ACCENT_RGB` (theme).

> Recomendo deixar para o fim, ou simplesmente ignorar — não traz ganho funcional, só estético.

---

## 5. Dependências

**Nenhuma dependência não utilizada.** Todas as do `package.json` têm uso comprovado:

- `react`, `react-dom` — base.
- `firebase` — `firebase/app`, `firebase/auth`, `firebase/firestore`.
- `lucide-react` — ícones (6 arquivos vivos).
- `html2canvas` — exportação de imagem no `Dashboard.jsx` (inline). **Não remover**, apesar de o hook antigo `useDownload` morrer.
- `firebase-admin` (devDependency) — usado por `scripts/criar-usuario.mjs` e `scripts/alterar-senhas-usuarios.mjs`.
- `typescript`, `vite` (devDependencies) — build.

---

## 6. Código duplicado / legado consolidável

Todos os duplicados já caem nos arquivos mortos da Seção 1, então a "consolidação" é, na prática, **remover a versão antiga**:

- **Grids por ministério** (`GridComunicacao/Infantil/Louvor/Recepcao` + `DashboardGrid`) → unificados em `PlanilhaMinisterio` + `planilhaFaixasLayout`. Confiança Alta.
- **`PlanilhaLouvor` + `planilhaLouvorLayout`** → duplicavam `PlanilhaMinisterio` + `planilhaFaixasLayout` (variante "louvor"). Confiança Alta.
- **`useDownload`** (hook) → lógica `html2canvas` foi reescrita inline no `Dashboard.jsx`. Confiança Alta.

---

## 7. Configurações obsoletas

| Item | Motivo | Evidência | Impacto | Confiança |
|---|---|---|---|---|
| `.gitignore` (linhas finais corrompidas) | Há um bloco com texto espaçado/duplicado (`n o d e _ m o d u l e s /`, `dist/`, `.env` repetidos) anexado de forma estranha após a seção padrão do Vite. As regras úteis já existem no topo. | Final do arquivo. | Apenas limpeza cosmética; remover as linhas redundantes não muda o comportamento (as regras já estão cobertas acima). | Alta |
| `tsconfig.json` | Config herdada do template TS. Com `noEmit: true` e sem `allowJs`, o `tsc` do script `build` só checa arquivos `.ts` — e o único `.ts` é o morto `src/counter.ts`. Na prática não valida o projeto (que é `.jsx`). | `tsconfig.json` + `package.json` (`"build": "tsc && vite build"`). | Se remover `counter.ts`, o `tsc` passa a não checar nada. Decidir: (a) remover o `tsc` do build e o `tsconfig`, ou (b) reconfigurar para checar JS/JSX. Não remover sem decisão de arquitetura. | Média |

---

## 8. Outros (informativo, não é código)

- `dist/` (~1.7 MB) existe em disco e é artefato de build (gitignored). Pode ser regenerado com `npm run build`; não é código-fonte. Sem ação necessária.
- `docs/ministerios/*.md` e `README.md`: documentação — não auditados como código. Posso revisar se há descrições de arquitetura desatualizadas (ex.: menções a "Grid") caso queira.
- `scripts/emails-exemplo.txt`: arquivo de exemplo dos scripts admin; manter (apoio operacional), a menos que queira removê-lo.

---

## Próximo passo

Sugiro removermos em ondas, validando o build (`npm run build`) e um teste rápido da UI entre cada onda:

1. **Onda 1 (risco ~zero):** template Vite — `counter.ts`, `routes.jsx` (vazio), `src/assets/{hero.png,typescript.svg,vite.svg}`, assets `public/{favicon.svg,icons.svg,ministerios/logo2.png}`, e limpeza do `.gitignore`.
2. **Onda 2 (alta confiança):** arquivos mortos da arquitetura Grid/Louvor antiga (Seção 1a/1b/1c).
3. **Onda 3:** exports mortos da Seção 3.
4. **Onda 4 (opcional):** decisão sobre `tsconfig`/`tsc` no build; over-exports da Seção 4.

Me diga quais itens aprova (por onda ou item a item) que eu executo só o que for autorizado.
