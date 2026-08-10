# Etapa 1 — Modelagem do Banco de Dados (Revisado)
# EnveLoop — Firestore Data Model

---

## Visão Geral

O Firestore é um banco NoSQL orientado a documentos. A modelagem respeita as seguintes premissas:

- Dados nunca são duplicados desnecessariamente.
- Todo lançamento tem uma única fonte de verdade (Princípio 3 do PRD).
- Status é alterado em vez de deletar fisicamente (Princípio 4 do PRD).
- Todo dado associado a um mês armazena também o ano (Princípio 10 do PRD).
- Meses são materializados sob demanda.
- Toda a estrutura é escopada por `userId`.

---

## Estrutura de Coleções

```
users/{userId}/
  accounts/{accountId}
  cards/{cardId}
  categories/{categoryId}
  envelopes/{envelopeId}
  goals/{goalId}
  monthPlans/{monthPlanId}
  transactions/{transactionId}
```

> **Justificativa:** Subcoleções de `users/{userId}` garantem isolamento completo entre usuários e simplificam as regras de segurança do Firestore.

---

## Coleção: `users/{userId}/accounts`

Representa as contas bancárias do usuário (inclusive contas usadas para dinheiro em espécie, se o usuário optar por cadastrá-las).

```ts
{
  id: string;
  name: string;                  // Ex: "Nubank", "Banco do Brasil", "Carteira"
  initialBalance: number;        // Saldo inicial no momento do cadastro
  balance: number;               // Saldo atualizado incrementalmente
  color?: string;
  icon?: string;
  active: boolean;               // Soft Delete
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Justificativa:**
- `type` removido: não existe distinção especial entre conta bancária e dinheiro em espécie no sistema. O usuário pode criar uma conta chamada "Carteira" ou "Dinheiro" normalmente.
- O método de pagamento (`PIX`, `Dinheiro`, `TED`, `Débito`) registrado na transação é quem identifica como o dinheiro entrou/saiu da conta — não o tipo da conta.
- O saldo atual é armazenado no campo `balance` e atualizado de forma incremental a cada receita, despesa ou transferência, garantindo alta performance na listagem e no cálculo do Saldo Geral.

---

## Coleção: `users/{userId}/cards`

Representa os cartões de crédito.

```ts
{
  id: string;
  name: string;                  // Ex: "Nubank Roxo", "Inter Mastercard"
  lastDigits?: string;           // 4 últimos dígitos (visual)
  pendingBills: number;          // Total de faturas pendentes (atualizado incrementalmente)
  color?: string;
  icon?: string;
  active: boolean;               // Soft Delete
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Justificativa:**
- O cartão é apenas um meio de pagamento (PRD §4).
- Não armazena limite de crédito — o PRD não prevê essa funcionalidade.
- O total pendente do cartão é armazenado no campo `pendingBills` e atualizado incrementalmente a cada compra ou pagamento de fatura, garantindo escalabilidade.

---

## Coleção: `users/{userId}/categories`

Categorias para classificação de gastos em relatórios.

```ts
{
  id: string;
  name: string;                  // Ex: "Alimentação", "Transporte", "Saúde"
  color?: string;
  icon?: string;
  active: boolean;               // Soft Delete
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Justificativa:**
- Categorias são distintas de envelopes (PRD §10).
- Envelopes = planejamento. Categorias = acompanhamento e relatórios.

---

## Coleção: `users/{userId}/envelopes`

Unifica envelopes padrão e temporários em uma única coleção.

```ts
{
  id: string;
  name: string;                  // Ex: "Mercado", "Lazer", "Férias"
  type: "default" | "temporary";
  defaultAmount: number;         // Valor copiado ao criar novos meses
  order: number;                 // Ordem de exibição
  color: string;
  icon: string;
  active: boolean;               // false = não entra em novos meses, mas histórico é preservado

  // Exclusivo para temporários — meses/anos onde este envelope está ativo
  targetMonths?: Array<{
    month: number;               // 1–12
    year: number;
  }>;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Justificativa:**
- Coleção única evita duplicação de lógica entre "padrão" e "temporário".
- `active: false` em envelope padrão: não entra em novos meses, mas histórico preservado (PRD §4).
- `defaultAmount` editado se aplica apenas a meses criados após a edição (PRD §4).
- `targetMonths` é `undefined` para padrões (aparecem em todos os meses com `active: true`).
- Remoção de envelope temporário só é permitida se não houver lançamentos para ele nos meses vinculados (PRD §7).

---

## Coleção: `users/{userId}/monthPlans`

Planejamento mensal materializado sob demanda. Armazena um **snapshot completo de todos os envelopes ativos** no momento da primeira interação com o mês.

```ts
{
  id: string;
  month: number;                 // 1–12
  year: number;
  monthYear: string;             // "2025-07" — campo auxiliar indexado para queries

  // Snapshot completo de TODOS os envelopes ativos no momento da materialização.
  // Após a criação do documento, cada envelope pode ser editado individualmente sem retroagir.
  envelopeLimits: {
    [envelopeId: string]: number; // valor = snapshot do defaultAmount ou limite editado pelo usuário
  };

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Justificativa:**
- O documento é criado na primeira **operação de escrita** que referencie aquele `monthYear`. A lista do PRD §4 são exemplos, não uma lista exaustiva — novos fluxos podem surgir.
- A implementação utiliza uma função genérica `ensureMonthPlan(userId, monthYear)` chamada por **qualquer** service antes de escrever dados vinculados a um mês. Se o documento já existe, não faz nada. Se não existe, cria o snapshot completo de todos os envelopes ativos.
- Na criação do snapshot, `envelopeLimits` recebe **todos** os envelopes ativos com seus `defaultAmount` vigentes naquele instante.
- A partir daí, editar `envelope.defaultAmount` **não retroage** para este mês: o valor já está gravado no documento do mês. ✅
- Editar o limite de um envelope para um mês específico atualiza apenas `envelopeLimits[envelopeId]` daquele documento.
- **Meses virtuais** (sem documento) continuam exibindo `envelope.defaultAmount` atual — comportamento correto pelo PRD, pois esses meses não têm histórico a preservar.
- `monthYear: "2025-07"` como campo indexado garante unicidade e queries eficientes (Princípio 10 do PRD).
- O documento **não é criado** por mera visualização (operação de leitura).

---

## Coleção: `users/{userId}/goals`

Representa as metas financeiras do usuário. O saldo é calculado dinamicamente a partir das transações associadas — não é armazenado de forma incremental.

```ts
{
  id: string;
  name: string;                  // Ex: "Viagem", "Reserva de emergência"
  targetAmount: number;          // Meta (valor)
  active: boolean;               // Soft Delete — false = excluído, mas transações preservadas
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Justificativa:**
- Soft delete adotado para preservar o histórico de transações (`goal_transfer` e `goal_withdraw`) mesmo após a exclusão do objetivo.
- O saldo não é armazenado; é derivado via `Σ(goal_transfer) - Σ(goal_withdraw)` para evitar dessincronização.
- `active: false` mantém o goalId como referência válida em transações históricas.

---

## Coleção: `users/{userId}/transactions`

**Coleção central do sistema.** Toda movimentação financeira ou orçamentária.

```ts
{
  id: string;

  // Identificação temporal
  date: Timestamp;               // Data real do lançamento
  referenceMonthYear: string;    // "YYYY-MM" — mês/ano que afeta o orçamento (envelopes e saldo mensal)
  invoiceMonthYear?: string;     // "YYYY-MM" — mês/ano da fatura (apenas card_purchase e bill_payment)

  // Tipo
  type: TransactionType;

  // Dados financeiros
  amount: number;                // Sempre positivo
  description: string;
  paymentMethod?: PaymentMethod; // Forma de pagamento (quando aplicável)

  // Vínculos
  accountId?: string;            // Conta debitada/creditada
  cardId?: string;               // Cartão usado (compra ou pagamento de fatura)
  envelopeId?: string;           // Envelope consumido
  categoryId?: string;           // Categoria (relatórios)
  installmentId?: string;        // UUID compartilhado entre as parcelas de uma compra parcelada
  goalId?: string;               // Obrigatório para goal_transfer e goal_withdraw

  // Vínculo para transferências entre meses e faturas
  relatedTransactionId?: string; // ID do lançamento oposto (out ↔ in)
  billPaymentId?: string;        // ID do pagamento da fatura que liquidou esta compra (se aplicável)
  appliedReduction?: number;     // Para bill_payment: o valor exato abatido do pendingBills do cartão (simetria de estorno)

  // Status
  status: "paid" | "pending" | "reversed" | "cancelled";

  // Soft Delete
  deletedAt?: Timestamp;         // Presença = excluído logicamente

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

type TransactionType =
  | "income"               // Receita
  | "expense"              // Despesa (PIX, Dinheiro, TED, Débito)
  | "card_purchase"        // Compra no cartão
  | "bill_payment"         // Pagamento de fatura
  | "month_transfer_out"   // Transferência entre meses — saída do mês origem
  | "month_transfer_in"    // Transferência entre meses — entrada no mês destino
  | "goal_transfer"        // Alimenta um objetivo — debita o mês de origem
  | "goal_withdraw";       // Saca de um objetivo — credita o mês de destino

type PaymentMethod =
  | "pix"
  | "cash"                 // Dinheiro em espécie
  | "ted"
  | "debit"
  | "credit_card";         // Apenas para card_purchase
```

---

## Regras por Tipo de Transação

| Tipo | accountId | cardId | envelopeId | categoryId | paymentMethod | status |
|---|---|---|---|---|---|---|
| `income` | ✅ obrigatório | ❌ | ❌ | ❌ | `pix` / `ted` / `cash` | `paid` |
| `expense` | ✅ obrigatório | ❌ | ✅ obrigatório | opcional | `pix` / `cash` / `ted` / `debit` | `paid` |
| `card_purchase` | ❌ | ✅ obrigatório | ✅ obrigatório | opcional | `credit_card` | `pending` |
| `bill_payment` | ✅ obrigatório | ✅ obrigatório | ❌ | ❌ | `pix` / `ted` / `debit` | `paid` |
| `month_transfer_out` | ❌ | ❌ | ❌ | ❌ | ❌ | `paid` |
| `month_transfer_in` | ❌ | ❌ | ❌ | ❌ | ❌ | `paid` |
| `goal_transfer` | ❌ | ❌ | opcional | ❌ | ❌ | `paid` |
| `goal_withdraw` | ❌ | ❌ | ❌ | ❌ | ❌ | `paid` |

---

## Cálculos Derivados

Saldos principais são atualizados de forma incremental para garantir performance, enquanto cálculos orçamentários são derivados.

| Indicador | Fórmula / Armazenamento |
|---|---|
| **Saldo da conta** | Armazenado no campo `balance` na conta e atualizado incrementalmente. |
| **Saldo Geral** | `Σ(balance)` de todas as contas ativas. |
| **Consumo de envelope (mês Y)** | `Σ(expense.amount) + Σ(card_purchase.amount) + Σ(goal_transfer.amount where envelopeId = X)` onde `referenceMonthYear = Y` (Exclui estornados e cancelados). |
| **Faturas pendentes (cartão X)** | Armazenado no campo `pendingBills` no cartão e atualizado incrementalmente. |
| **Saldo livre do mês Y** | `Σ(income) + Σ(month_transfer_in) + Σ(goal_withdraw) - Σ(month_transfer_out) - Σ(goal_transfer) - Σ(limites dos envelopes)` onde `referenceMonthYear = Y` |
| **Total planejado (mês Y)** | `Σ(limites dos envelopes do mês Y)` (override se existir, senão `defaultAmount`) |
| **Saldo do objetivo X** | `Σ(goal_transfer.amount where goalId = X) - Σ(goal_withdraw.amount where goalId = X)` |
| **Total em objetivos** | `Σ(saldo de cada objetivo ativo)` — exibido no topo da tela de Objetivos. Se maior que Saldo Geral, exibe alerta. |

> **Nota sobre `Σ(limites dos envelopes do mês Y)`:**
> - **Mês materializado:** usa `monthPlan.envelopeLimits[envelopeId]` — snapshot gravado no momento da criação do documento. Imune a edições posteriores de `defaultAmount`.
> - **Mês virtual (sem documento):** usa `envelope.defaultAmount` atual — comportamento esperado pelo PRD para meses sem histórico.

---

## Relacionamentos

```
accounts ──────────────────── transactions.accountId
cards ─────────────────────── transactions.cardId
envelopes ─────────────────── transactions.envelopeId
envelopes ─────────────────── monthPlans.envelopeLimits (keys)
categories ────────────────── transactions.categoryId
goals ──────────────────────── transactions.goalId
transactions ─── relatedTransactionId ─── transactions (self-reference para transferências)
```

---

## Índices Necessários (Firestore)

```
// Lançamentos por período — query central da dashboard
transactions: [referenceMonthYear ASC, type ASC]
transactions: [referenceMonthYear ASC, envelopeId ASC]

// Faturas pendentes por cartão
transactions: [cardId ASC, status ASC, invoiceMonthYear ASC]

// Extrato por conta
transactions: [accountId ASC, date DESC]

// Relatórios
transactions: [type ASC, referenceMonthYear ASC]
transactions: [categoryId ASC, referenceMonthYear ASC]

// Soft Delete — excluídos devem ser filtrados em todas as queries
transactions: [referenceMonthYear ASC, deletedAt ASC]

// Objetivos — buscar todas as transações de um objetivo
transactions: [goalId ASC, type ASC]

// Mês plano por período
monthPlans: [monthYear ASC]

// Envelopes temporários
envelopes: [type ASC, active ASC]

// Objetivos ativos
goals: [active ASC]
```

> Índices compostos são criados manualmente no Firebase Console ou via `firestore.indexes.json`. Serão gerados na Etapa 2.

---

## Estratégia de Consultas

### Dashboard — Montagem das Colunas de Meses

1. Calcular os `monthYear` dos meses a exibir (ex: mês anterior, atual, +1, +2).
2. Buscar `envelopes` ativos do usuário.
3. Buscar `monthPlans` dos meses relevantes.
4. Buscar `transactions` dos meses relevantes (`deletedAt == null`).
5. No cliente: calcular consumo por envelope, saldo livre, total de receitas por mês.
6. Para cada envelope em cada mês:
   - Se o mês **tem** documento `monthPlan` → usar `envelopeLimits[envelopeId]` (snapshot completo).
   - Se o mês **não tem** documento (virtual) → usar `envelope.defaultAmount` atual.

### Pagamento de Fatura

1. Buscar `transactions` com `cardId = X`, `invoiceMonthYear = Y`, `type = "card_purchase"`, `status = "pending"`, `deletedAt == null`.
2. Calcular total e apresentar ao usuário para confirmação.
3. Em batch (Firestore batch write):
   - Atualizar `status = "paid"` em todas as compras.
   - Criar 1 transação `bill_payment` com `accountId`, `cardId`, `amount = total`, `referenceMonthYear = orçamento_Y`, `invoiceMonthYear = Y`.

### Transferência entre Meses

1. Criar 2 transações em batch:
   - `month_transfer_out` com `referenceMonthYear = origem`, `amount = X`.
   - `month_transfer_in` com `referenceMonthYear = destino`, `amount = X`.
   - Ambas com `relatedTransactionId` apontando uma para a outra.
2. Criar/atualizar `monthPlan` do mês destino se não existir.

### Transferência entre Contas

1. Validar se há saldo na conta de origem e se as contas são diferentes.
2. Atualizar contas em batch (`writeBatch`):
   - Atualizar saldo da conta de origem com `increment(-amount)`.
   - Atualizar saldo da conta de destino com `increment(amount)`.
3. Não cria documento na collection `transactions`. Altera diretamente os saldos para máxima performance.

### Compras Parceladas

1. Gerar um `installmentId` único.
2. Calcular o valor exato das parcelas, adicionando o resíduo (diferença de centavos) na última parcela.
3. Em batch (`writeBatch`):
   - Criar `N` transações de `type = "card_purchase"` com `status = "pending"`, compartilhando o mesmo `installmentId`.
   - Incrementar o `pendingBills` do cartão apenas **uma** vez com o valor total da compra.
4. **Deleção e Estorno:** São realizados operando todos os documentos que possuam o mesmo `installmentId`. Se todas forem pendentes, apenas se exclui as transações. Se alguma já foi paga, as pagas viram `reversed` (e subtraem seu valor individual do `pendingBills`) e as pendentes são deletadas.

---

## Estratégia de Soft Delete

| Entidade | Estratégia |
|---|---|
| `accounts`, `cards`, `categories`, `envelopes` | `active: boolean` — inativo preserva histórico |
| `transactions` | `deletedAt?: Timestamp` — ausente = ativo, presente = excluído |

- Toda query deve incluir `.where("deletedAt", "==", null)` para excluir soft-deleted.
- Nenhum documento é fisicamente deletado do Firestore.

---

## Regras de Segurança Propostas

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read, write: if isOwner(userId);

      match /accounts/{docId} {
        allow read, write: if isOwner(userId);
      }
      match /cards/{docId} {
        allow read, write: if isOwner(userId);
      }
      match /categories/{docId} {
        allow read, write: if isOwner(userId);
      }
      match /envelopes/{docId} {
        allow read, write: if isOwner(userId);
      }
      match /monthPlans/{docId} {
        allow read, write: if isOwner(userId);
      }
      match /transactions/{docId} {
        allow read, write: if isOwner(userId);
      }
    }

    // Bloquear qualquer outro acesso
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Justificativa:**
- Validações de campos (campos obrigatórios, `amount > 0`, etc.) são feitas no cliente com Zod — mantém regras simples e performáticas.
- Isolamento por `userId` garante que nenhum usuário acesse dados de outro.

---

## Decisões de Modelagem — Resumo Final

| Decisão | Justificativa |
|---|---|
| Coleção única `transactions` | Princípio 3: "Todo lançamento possui uma fonte de verdade". |
| Saldos incrementais (contas e cartões) | Para garantir alta performance e escalabilidade, evitando leitura de todo o histórico para apresentar saldos na dashboard. |
| `monthYear: string` como campo auxiliar | Facilita queries eficientes por período sem lógica de range de timestamps. |
| `monthPlans` materializado sob demanda | O documento é criado na primeira operação de **escrita** que referencie aquele `monthYear`. Mera visualização (leitura) nunca materializa. A lista do PRD §4 são exemplos — novos fluxos podem surgir. |
| `envelopeLimits` = snapshot completo na materialização | Ao criar o documento do mês, todos os envelopes ativos e seus `defaultAmount` são gravados. Edições futuras no `defaultAmount` não retroagem para meses já materializados. Meses virtuais continuam lendo `defaultAmount` atual — correto pelo PRD. |
| `ensureMonthPlan(userId, monthYear)` | Função genérica de infraestrutura chamada por qualquer service antes de escrever dados vinculados a um mês. Garante idempotência e extensibilidade sem amarrar o sistema a uma lista fechada de ações. |
| `month_transfer_out` + `month_transfer_in` | Rastreabilidade completa; não afetam saldo de contas; afetam apenas saldo livre do mês. |
| `bill_payment` separado de `card_purchase` | Evita duplicidade em relatórios (PRD §10). São eventos independentes. |
| Sem tipo `cash` em `accounts` | `paymentMethod` da transação já indica o meio (dinheiro, PIX, TED). A conta pode ser qualquer banco. |
| Sem tipo `adjustment` | Removido a pedido — não previsto no PRD. |
| Soft Delete com `deletedAt` | Princípio 4 do PRD. |
| `active` em entidades de cadastro | Preserva histórico sem sujar queries de lançamentos. |

---

