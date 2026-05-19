# Ministério de Comunicações — Guia de uso

Documentação específica do ministério de **Comunicações** no sistema Escala INVB.

[← Voltar ao README geral](../../README.md)

---

## Funções da escala

| Função | Cor na grade | Abreviação (planilha) |
|--------|--------------|------------------------|
| PROJEÇÃO | Azul | **P** |
| MESA DE SOM | Verde | **S** |
| TRANSMISSÃO | Amarelo | **T** |

Não há agrupamento de funções: cada coluna na view **TABELA** corresponde exatamente a uma função acima.

---

## Como escalar (view TABELA)

1. Na sidebar, escolha a **função** (Projeção, Mesa de Som ou Transmissão).
2. Escolha a **pessoa** entre os integrantes do ministério.
3. Marque os **cultos** desejados.
4. Clique em **Confirmar escala**.

A lista de pessoas mostra apenas quem ainda tem pelo menos uma data livre para aquela função (considerando indisponibilidades e vagas já preenchidas).

---

## Como escalar (view PLANILHA)

1. Alterne para **PLANILHA** no topo da página.
2. Localize o integrante na linha e o culto na coluna (`DOM, 03/05 (M)`, `QUA, 06/05`, etc.).
3. Digite a abreviação: `P`, `S` ou `T` (maiúsculas ou minúsculas).
4. Pressione **Enter** ou clique fora da célula para salvar.
5. Apague o conteúdo da célula para remover a escala.

Legenda abaixo da tabela: `P = Projeção`, `S = Som`, `T = Transmissão`.

---

## Integrantes

A lista oficial de nomes está em `src/data/pessoas.js` (chave `comunicacao`). Alterações na lista exigem atualização nesse arquivo e novo deploy.

---

## O que este ministério não tem

Comparado aos outros ministérios:

- Sem opção **TODOS** ou **DISPONÍVEL** na sidebar
- Sem filtro função → sublista de pessoas (todas as pessoas aparecem para qualquer função)
- Sem botão **Organizar grade**
- Funções fixas e independentes (sem slots BV1/BV2 etc.)

---

## Dicas

- Use a view **TABELA** para montar a escala culto a culto com visão por função.
- Use a **PLANILHA** para preencher rápido por pessoa quando já souber quem serve em cada culto.
- Marque **indisponibilidades** antes de escalar para evitar conflitos.
- Confira **Membros escalados em outros ministérios** (só na TABELA) se alguém do time também serve em Louvor, Infantil etc.
