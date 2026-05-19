# Ministério de Introdução (Recepção) — Guia de uso

Documentação específica do ministério de **Introdução** no sistema Escala INVB.

[← Voltar ao README geral](../../README.md)

---

## Funções na escala (Firestore)

Na grade e no banco, existem **três slots** por culto:

| Slot | Cor na grade | Abreviação (planilha) |
|------|--------------|------------------------|
| INTRODUTOR(A) 1 | Azul | **I1** |
| INTRODUTOR(A) 2 | Verde | **I2** |
| INTRODUTOR(A) 3 | Amarelo | **I3** |

---

## Funções na sidebar (escolha simplificada)

Ao escalar pela sidebar, você escolhe apenas:

| Opção na sidebar | O que o sistema faz |
|------------------|---------------------|
| **INTRODUTOR** | Preenche o primeiro slot livre entre 1 → 2 → 3 (preferência masculina) |
| **INTRODUTORA** | Preenche preferindo slots 2 → 3 → 1 |

Isso evita escolher manualmente “slot 1 ou 2” a cada culto. O slot real gravado no Firestore será `INTRODUTOR(A) 1`, `2` ou `3`.

---

## Filtro por função

Fluxo **Função → Pessoa**, como no Infantil:

1. Escolha **Introdutor** ou **Introdutora**.
2. Escolha a pessoa (lista filtrada por gênero/função em `pessoasPorFuncaoRecepcao`).
3. Marque as datas e confirme.

Opção **TODOS (sem filtro)** disponível para fluxos especiais.

---

## Botão Organizar

Disponível só para Introdução e Louvor.

**Organizar** reorganiza a escala do mês para que cada pessoa tenda a ficar na **mesma coluna de slot** sempre que possível (ex.: quem costuma ser “2” permanece na coluna 2). Ninguém é removido da escala — apenas os slots são redistribuídos.

Use após montar a escala bruta, se a grade estiver “misturada” entre colunas 1, 2 e 3.

---

## Abreviações na planilha

| Digite | Significado |
|--------|-------------|
| I1 | Introdutor(a) 1 |
| I2 | Introdutor(a) 2 |
| I3 | Introdutor(a) 3 |

Na planilha você define o **slot exato**, diferente da sidebar que escolhe automaticamente.

---

## Como escalar (view TABELA)

1. Sidebar: Introdutor ou Introdutora → pessoa → datas.
2. Grade: três colunas (1, 2, 3) por culto.
3. Um culto está “cheio” para aquela função agrupada quando os três slots têm pessoa.

---

## Como escalar (view PLANILHA)

1. Digite `I1`, `I2` ou `I3` na célula da pessoa/culto desejados.
2. Uma pessoa só pode ter **um** slot por culto.

---

## O que este ministério não tem

- Sem opção **DISPONÍVEL**
- Sem funções BVOCAL / MÚSICO

---

## Dicas

- Para escalar rápido várias datas da mesma pessoa, use a sidebar com Introdutor/Introdutora.
- Para ajustar slot específico (ex.: forçar alguém no 1), use a **PLANILHA** com `I1`.
- Três introdutores por culto: verifique se os três slots estão preenchidos antes de considerar o culto completo.
