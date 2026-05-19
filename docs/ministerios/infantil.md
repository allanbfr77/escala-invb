# Ministério Infantil — Guia de uso

Documentação específica do **Ministério Infantil** no sistema Escala INVB.

[← Voltar ao README geral](../../README.md)

---

## Funções da escala

| Função | Cor na grade | Abreviação (planilha) |
|--------|--------------|------------------------|
| BERÇÁRIO | Azul | **B** |
| MATERNAL | Verde | **M** |
| JUNIORES | Amarelo | **J** |

---

## Filtro por função (sidebar)

O Infantil usa o fluxo **Função → Pessoa**:

1. Selecione a função (Berçário, Maternal ou Juniores).
2. O dropdown **Pessoa** mostra só integrantes habilitados para aquela faixa etária.
3. Marque as datas e confirme.

Opção extra: **TODOS (sem filtro)** — abre um fluxo alternativo para escalar sem filtrar pessoas por função (útil em situações específicas; consulte o líder do ministério).

---

## Abreviações na planilha

| Digite | Função |
|--------|--------|
| B | Berçário |
| M | Maternal |
| J | Juniores |

**Atenção:** na planilha, `M` significa **Maternal**. No ministério de Louvor, `M` significa Ministrante — sempre confira o ministério ativo antes de preencher.

---

## Pessoas por função

Cada faixa etária tem uma lista própria de voluntários (definida em `src/data/pessoas.js`, chaves `pessoasPorFuncaoInfantil`). Exemplos:

- **Berçário:** equipe do berçário
- **Maternal / Juniores:** listas distintas conforme idade e disponibilidade do time

Se uma pessoa não aparecer após escolher a função, ela não está cadastrada para aquela faixa.

---

## Como escalar (view TABELA)

1. Função → Pessoa → Datas → Confirmar.
2. Na grade, cada coluna é Berçário, Maternal ou Juniores.
3. Remova com ✕ ao passar o mouse no nome.

---

## Como escalar (view PLANILHA)

1. Linha = integrante; coluna = culto.
2. Digite `B`, `M` ou `J` na interseção.
3. Célula bloqueada com ícone vermelho = indisponível; ícone de outro ministério = já escalado em outro time no mesmo culto.

---

## O que este ministério não tem

- Sem opção **DISPONÍVEL** (exclusiva do Louvor)
- Sem botão **Organizar grade**
- Sem funções agrupadas tipo BVOCAL / MÚSICO

---

## Dicas

- Escale **Berçário**, **Maternal** e **Juniores** em cultos separados — cada culto precisa de cobertura nas três faixas quando aplicável.
- Domingo manhã e noite são colunas diferentes: a mesma pessoa pode estar em faixas distintas em turnos diferentes, respeitando a regra de uma função por culto.
- Use indisponibilidades para quem não pode em determinadas quartas ou domingos.
