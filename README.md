# Escala INVB

Sistema web para montagem e consulta das escalas mensais dos ministérios da igreja. Os dados ficam sincronizados em tempo real via Firebase (Firestore).

## Ministérios

| Ministério | Documentação específica |
|------------|-------------------------|
| Comunicações | [docs/ministerios/comunicacao.md](docs/ministerios/comunicacao.md) |
| Louvor | [docs/ministerios/louvor.md](docs/ministerios/louvor.md) |
| Introdução (Recepção) | [docs/ministerios/recepcao.md](docs/ministerios/recepcao.md) |
| Infantil | [docs/ministerios/infantil.md](docs/ministerios/infantil.md) |

Cada ministério tem funções, abreviações da planilha e regras próprias. Consulte o guia do seu ministério antes de escalar.

---

## Requisitos

- Node.js 18+
- Conta Firebase com Authentication e Firestore configurados
- Arquivo `.env` na raiz do projeto (copie de `.env.example`)

## Instalação e execução

```bash
npm install
cp .env.example .env   # preencha com as credenciais do Firebase
npm run dev            # desenvolvimento em http://localhost:5173
npm run build          # build de produção
npm run preview        # pré-visualizar o build
```

---

## Acesso e permissões

1. Na tela de login, escolha o **ministério** do seu perfil.
2. Informe e-mail e senha cadastrados no Firebase.
3. O sistema valida se o usuário pertence ao ministério selecionado (exceto perfil **master**, que edita todos).

| Perfil | O que pode fazer |
|--------|------------------|
| Usuário do ministério | Editar apenas a escala do próprio ministério |
| Master | Editar qualquer ministério e trocar ministério na sidebar |

Quem não tem permissão de edição vê a escala em **modo leitura** (badge "LEITURA").

---

## Cultos do mês (todas as views)

O calendário padrão inclui:

| Dia | Cultos gerados |
|-----|----------------|
| **Domingo** | Manhã `(M)` e Noite `(N)` — duas colunas no mesmo dia |
| **Quarta-feira** | Culto único (sem sufixo M/N) |

Horários gravados na escala:

| Culto | Início | Fim |
|-------|--------|-----|
| Domingo manhã | 08:00 | 12:00 |
| Domingo noite | 18:00 | 22:00 |
| Quarta / extras | 19:00 | 22:00 |

É possível adicionar **cultos extras** do mês (consagração, encontros etc.) pela sidebar, por ministério.

A navegação de mês segue a regra do sistema: a partir do dia 20, o foco padrão tende ao mês seguinte (planejamento).

---

## Duas formas de visualizar a escala

No topo da área principal há o alternador **TABELA** | **PLANILHA**.

### View TABELA (padrão)

- Grade por **função**: cada coluna é uma função do ministério; cada linha é um culto/data.
- Escala pela **sidebar**: escolha função → pessoa → marque as datas → confirme.
- Remoção: passe o mouse no nome na célula e clique em ✕.
- Exibe a seção **Membros escalados em outros ministérios este mês** (quando houver conflitos cruzados).

### View PLANILHA

- Grade por **integrante**: linhas = pessoas do ministério; colunas = cultos do mês.
- Digite a **abreviação da função** diretamente na célula (Enter ou sair do campo para salvar).
- Indicadores visuais em células vazias:
  - Ícone vermelho: integrante **indisponível** naquela data/turno
  - Ícone do ministério: escalado em **outro ministério** no mesmo culto
- Quem está indisponível em **todas** as datas do mês some da lista de linhas.
- A seção de outros ministérios **não** aparece na planilha (a informação já está nas células).

Detalhes das abreviações: veja o README do seu ministério.

---

## Sidebar (painel lateral)

Disponível no desktop; no mobile, abra pelo botão **+** (canto inferior direito).

| Campo | Descrição |
|-------|-----------|
| Ministério | Troca de ministério (conforme permissão) |
| Função | Função a preencher na escala |
| Pessoa | Integrante escalado |
| Datas | Cultos selecionados para confirmar a escala |
| Cultos extras | Adicionar/remover cultos especiais do mês |

**Indisponibilidades:** integrantes marcados como indisponíveis em determinados cultos não aparecem nas datas correspondentes e somem do dropdown se estiverem indisponíveis o mês inteiro.

**Conflito entre ministérios:** se a pessoa já estiver escalada em outro ministério no mesmo culto, o sistema bloqueia e exibe um aviso.

---

## Botões da barra superior

| Botão | Função |
|-------|--------|
| **TABELA / PLANILHA** | Alterna o tipo de grade |
| Filtrar nome | (TABELA) Destaca nomes na grade |
| **Baixar escala** | Exporta PNG |
| **Relatório** | Resumo de participações no mês |
| **Indispon.** | Abre o modal de indisponibilidades |
| **Organizar** | Só Louvor e Introdução — reorganiza colunas fixas |
| **Limpar mês** | Apaga todas as escalas do ministério no mês |
| Tema | Claro / escuro |

### Formatos de download

| Opção | Conteúdo |
|-------|----------|
| **Tabela (Web)** | Grade por função (estilo da view TABELA) |
| **Planilha (Web)** | Grade por integrante com abreviações coloridas |
| **Cards (Mobile)** | Cards por culto (melhor para telas pequenas) |

---

## Modal de indisponibilidades

- Marque, por pessoa, em quais cultos do mês ela **não** pode servir.
- Pode importar indisponibilidades a partir de escalas já feitas em outros ministérios.
- Afeta dropdown de pessoas, datas disponíveis na sidebar e células da planilha.

---

## Regras gerais de escala

1. **Uma função por pessoa por culto** — no mesmo culto (data + turno), a pessoa só pode ter uma função no ministério.
2. **Cultos diferentes no mesmo dia** — permitido (ex.: manhã e noite no domingo).
3. **Substituição de slot** — ao escalar alguém em uma função já ocupada, o sistema remove o registro anterior daquela função.
4. **Sincronização** — alterações aparecem em tempo real para quem estiver com a página aberta.

---

## Estrutura do projeto

```
src/
  pages/          Login, Dashboard, DashboardGrid (planilha)
  components/     Grids por ministério, sidebar, modais
  context/        Autenticação, escalas, tema
  data/           Pessoas e funções por ministério
  utils/          Datas, abreviações, permissões, indisponibilidades
docs/
  ministerios/    README individual de cada ministério
```

---

## Deploy

O projeto inclui workflow GitHub Actions (`.github/workflows/deploy.yml`) para publicação. Configure os secrets do Firebase e do hosting conforme o ambiente da igreja.

---

## Suporte

Dúvidas sobre **qual função usar** ou **abreviação na planilha**: consulte o README do ministério na pasta `docs/ministerios/`.
