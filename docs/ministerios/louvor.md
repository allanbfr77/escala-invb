# Ministério de Louvor — Guia de uso

Documentação específica do **Ministério de Louvor** no sistema Escala INVB.

[← Voltar ao README geral](../../README.md)

---

## Funções na escala (Firestore)

| Função | Cor | Abreviação (planilha) |
|--------|-----|------------------------|
| MINISTRANTE | Azul | **M** |
| BVOCAL 1 | Verde | **BV1** |
| BVOCAL 2 | Verde | **BV2** |
| BVOCAL 3 | Verde | **BV3** |
| BVOCAL 4 | Verde | **BV4** |
| MÚSICO 1 | Amarelo | **MS1** |
| MÚSICO 2 | Amarelo | **MS2** |
| MÚSICO 3 | Amarelo | **MS3** |
| MÚSICO 4 | Amarelo | **MS4** |

---

## Funções na sidebar (agrupadas)

Na sidebar aparecem apenas três opções; o sistema distribui no slot livre do grupo:

| Sidebar | Slots reais (preenchimento automático) |
|---------|----------------------------------------|
| **MINISTRANTE** | MINISTRANTE |
| **BVOCAL** | Primeiro livre entre BVOCAL 1 … 4 |
| **MÚSICO** | Primeiro livre entre MÚSICO 1 … 4 |

Exemplo: ao escalar alguém como **BVOCAL**, se BV1 e BV2 já estão ocupados, vai para BV3.

---

## Opção DISPONÍVEL

Exclusiva do Louvor.

- No dropdown de pessoa, pode escolher **✦ DISPONÍVEL**.
- Marca o slot como reservado sem nome fixo (útil para planejar vagas de back vocal ou músico).
- Aparece na grade com cor lilás / destaque especial.
- Só aparece se ainda existir culto com slot BV ou Músico vazio para preencher como “disponível”.

---

## Filtro Função → Pessoa

1. Escolha MINISTRANTE, BVOCAL, MÚSICO ou **TODOS**.
2. Lista de pessoas filtrada conforme a função (listas em `pessoasPorFuncaoLouvor`).
3. Confirme nas datas selecionadas.

**TODOS** abre fluxo para escalar sem escolher função agrupada antes (modal de escolha quando necessário).

---

## Botão Organizar

Reorganiza a escala do mês para que cada pessoa fique preferencialmente na **mesma coluna** (mesmo número de BV ou Músico) em todos os cultos. Ministrantes permanecem como ministrantes. Não remove ninguém da escala.

Recomendado depois de uma primeira passagem de preenchimento manual.

---

## Abreviações na planilha

| Digite | Função |
|--------|--------|
| M | Ministrante |
| BV1 … BV4 | Back Vocal 1 … 4 |
| MS1 … MS4 | Músico 1 … 4 |

**Atenção:** `M` na planilha do Louvor = **Ministrante**. No Infantil, `M` = Maternal.

---

## Cores na planilha e na TABELA

- **Azul:** Ministrante (`M`)
- **Verde:** Back Vocal (`BV1`–`BV4`)
- **Amarelo:** Músicos (`MS1`–`MS4`)

---

## Como escalar (view TABELA)

1. Sidebar com função agrupada ou TODOS.
2. Grade com 9 colunas por culto (Ministrante + 4 BV + 4 MS).
3. Linhas “Mostrar mais funções” em mobile permitem ver slots extras.
4. Remova com ✕ no chip do nome.

---

## Como escalar (view PLANILHA)

1. Uma linha por integrante do louvor.
2. Digite a abreviação na coluna do culto.
3. Não é possível editar célula se a pessoa estiver indisponível ou escalada em outro ministério naquele culto.

---

## Equipe

Lista geral em `pessoasPorMinisterio.louvor` e listas por função em `pessoasPorFuncaoLouvor` no código-fonte.

---

## Dicas

- Monte **ministrante** primeiro; depois distribua BV e músicos.
- Use **DISPONÍVEL** para marcar vagas ainda sem nome definido.
- Domingo manhã e noite: a mesma pessoa pode cantar em um turno e tocar no outro, mas **não** duas funções no mesmo culto.
- Exporte **Planilha (Web)** no download para compartilhar a visão por integrante com o time.
