# Escala INVB

<p align="center">
  <img src="public/logo3.png" alt="Logo INVB" width="96" />
</p>

<p align="center">
  Sistema web para montagem e consulta das escalas mensais dos ministérios da igreja.
  Dados sincronizados em tempo real via Firebase Firestore.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase&logoColor=black" alt="Firebase" />
  <img src="https://img.shields.io/badge/PWA-Service%20Worker-5A0FC8?logo=pwa&logoColor=white" alt="PWA" />
</p>

---

## Índice

- [Funcionalidades](#funcionalidades)
- [Ministérios](#ministérios)
- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Scripts disponíveis](#scripts-disponíveis)
- [Acesso e permissões](#acesso-e-permissões)
- [Como usar](#como-usar)
- [Deploy (GitHub Pages)](#deploy-github-pages)
- [Gerenciamento de usuários](#gerenciamento-de-usuários)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Documentação por ministério](#documentação-por-ministério)

---

## Funcionalidades

- **Escalas mensais** por ministério, com cultos de domingo (manhã e noite) e quarta-feira
- **Duas visualizações**: grade por função (Tabela) ou por integrante (Planilha com abreviações)
- **Sincronização em tempo real** — alterações visíveis para todos os usuários conectados
- **Indisponibilidades** por pessoa e por culto, com importação entre ministérios
- **Detecção de conflitos** quando alguém já está escalado em outro ministério no mesmo culto
- **Exportação** da escala em PNG (tabela, planilha ou cards mobile)
- **Relatório** de participações no mês e relatório unificado (perfil master)
- **Tema claro/escuro** e layout responsivo (desktop e mobile)
- **PWA** — instalável no celular com service worker

---

## Ministérios

| Ministério | ID | Funções principais |
|------------|-----|-------------------|
| Comunicações | `comunicacao` | Projeção, Mesa de som, Transmissão |
| Louvor | `louvor` | Ministrante, Backing vocals, Músicos |
| Introdução (Recepção) | `recepcao` | Introdutores |
| Infantil | `infantil` | Berçário, Maternal, Juniores |

---

## Tecnologias

| Camada | Stack |
|--------|-------|
| Frontend | React 18, Vite 8 |
| Backend / dados | Firebase Authentication, Cloud Firestore |
| UI | CSS customizado, Lucide React |
| Exportação | html2canvas |
| Deploy | GitHub Actions → GitHub Pages |

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou superior
- Projeto no [Firebase](https://console.firebase.google.com/) com **Authentication** (e-mail/senha) e **Firestore** habilitados
- Conta de serviço do Firebase (para scripts de criação de usuários)

---

## Instalação

```bash
# Clone o repositório
git clone https://github.com/allanbfr77/escala-invb.git
cd escala-invb

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com as credenciais do seu projeto Firebase

# Inicie o servidor de desenvolvimento
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`.

---

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha com os dados do console Firebase (**Configurações do projeto → Seus apps**):

| Variável | Descrição |
|----------|-----------|
| `VITE_FIREBASE_API_KEY` | Chave da API |
| `VITE_FIREBASE_AUTH_DOMAIN` | Domínio de autenticação |
| `VITE_FIREBASE_PROJECT_ID` | ID do projeto |
| `VITE_FIREBASE_STORAGE_BUCKET` | Bucket de storage |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID |
| `VITE_FIREBASE_APP_ID` | App ID |

> **Importante:** nunca commite o arquivo `.env` com credenciais reais.

---

## Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (Vite) |
| `npm run build` | Build de produção na pasta `dist/` |
| `npm run preview` | Pré-visualiza o build localmente |

---

## Acesso e permissões

1. Na tela de login, selecione o **ministério** do seu perfil.
2. Informe e-mail e senha cadastrados no Firebase.
3. O sistema valida se o usuário pertence ao ministério escolhido.

| Perfil | Permissões |
|--------|------------|
| Usuário do ministério | Edita apenas a escala do próprio ministério |
| Master | Edita qualquer ministério, troca ministério na sidebar e acessa relatório unificado |
| Master (somente leitura) | Visualiza tudo, sem editar escalas |

Usuários sem permissão de edição veem a escala em **modo leitura** (badge "LEITURA").

---

## Como usar

### Cultos do mês

| Dia | Cultos |
|-----|--------|
| Domingo | Manhã `(M)` e Noite `(N)` |
| Quarta-feira | Culto único |

| Culto | Horário |
|-------|---------|
| Domingo manhã | 08:00 – 12:00 |
| Domingo noite | 18:00 – 22:00 |
| Quarta / extras | 19:00 – 22:00 |

A partir do dia **20** de cada mês, o foco padrão passa para o mês seguinte (planejamento).

### View Tabela

- Grade por **função** — colunas são funções, linhas são cultos
- Escala pela **sidebar**: função → pessoa → datas → confirmar
- Remoção: passe o mouse no nome e clique em ✕

### View Planilha

- Grade por **integrante** — linhas são pessoas, colunas são cultos
- Digite a **abreviação da função** na célula (Enter para salvar)
- Ícones indicam indisponibilidade ou escala em outro ministério

### Barra de ações

| Botão | Função |
|-------|--------|
| TABELA / PLANILHA | Alterna a visualização |
| Baixar escala | Exporta PNG (tabela, planilha ou cards) |
| Relatório | Participações no mês |
| Indispon. | Modal de indisponibilidades |
| Organizar | Reorganiza colunas (Louvor e Recepção) |
| Limpar mês | Apaga todas as escalas do ministério no mês |

### Regras gerais

1. Uma função por pessoa por culto no mesmo ministério
2. Cultos diferentes no mesmo dia são permitidos (ex.: manhã e noite)
3. Ao substituir um slot ocupado, o registro anterior é removido
4. Alterações sincronizam em tempo real

---

## Deploy (GitHub Pages)

O workflow em [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) publica automaticamente a cada push na branch `main`.

Configure os seguintes **secrets** no repositório GitHub (**Settings → Secrets and variables → Actions**):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

O deploy usa [peaceiris/actions-gh-pages](https://github.com/peaceiris/actions-gh-pages) e publica o conteúdo de `dist/`.

---

## Gerenciamento de usuários

Scripts em `scripts/` usam o Firebase Admin SDK. Defina a variável de ambiente com o caminho ao JSON da conta de serviço:

```bash
# Windows (PowerShell)
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\caminho\service-account.json"

# Linux / macOS
export GOOGLE_APPLICATION_CREDENTIALS="/caminho/service-account.json"
```

### Criar usuário

```bash
# Master com edição
node scripts/criar-usuario.mjs --email=usuario@exemplo.com --senha=senha123 --role=master

# Master somente leitura
node scripts/criar-usuario.mjs --email=usuario@exemplo.com --senha=senha123 --role=master --readOnly

# Usuário de ministério
node scripts/criar-usuario.mjs --email=usuario@exemplo.com --senha=senha123 --ministerioId=louvor
```

IDs de ministério válidos: `comunicacao`, `louvor`, `recepcao`, `infantil`.

### Alterar senhas em lote

```bash
node scripts/alterar-senhas-usuarios.mjs
```

Consulte os comentários em cada script para opções adicionais (`--dry-run`, etc.).

---

## Estrutura do projeto

```
escala-igreja/
├── public/              # Assets estáticos, PWA (manifest, service worker)
├── src/
│   ├── pages/           # Login, Dashboard, Relatório unificado
│   ├── components/      # Grids, sidebar, modais
│   ├── context/         # Auth, escalas, tema
│   ├── data/            # Pessoas e funções por ministério
│   ├── hooks/           # Hooks customizados
│   └── utils/           # Datas, permissões, indisponibilidades, exportação
├── docs/ministerios/    # Guias específicos de cada ministério
├── scripts/             # Criação e gestão de usuários (Admin SDK)
└── .github/workflows/   # CI/CD para GitHub Pages
```

---

## Documentação por ministério

Cada ministério tem funções, abreviações da planilha e regras próprias:

| Ministério | Guia |
|------------|------|
| Comunicações | [docs/ministerios/comunicacao.md](docs/ministerios/comunicacao.md) |
| Louvor | [docs/ministerios/louvor.md](docs/ministerios/louvor.md) |
| Introdução (Recepção) | [docs/ministerios/recepcao.md](docs/ministerios/recepcao.md) |
| Infantil | [docs/ministerios/infantil.md](docs/ministerios/infantil.md) |

---

## Licença

Projeto privado — uso interno da igreja INVB.
