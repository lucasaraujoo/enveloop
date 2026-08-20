# Etapa 6 — Transações

Implementar lançamento de transações. As transações contemplam lançamentos que sempre serão vinculadas a um mês. As transações caracterizam um lançamento de entrada ou saída de dinheiro. 

Utilize o PRD como base para implementação dos campos e regras de negócio. Atentando-se para as especifidades de alguns tipos de transações.

Basicamente podemos ter como exemplo os seguintes tipos de transações:

- Receita (income)
- Despesa (expense)
- Compra no Cartão (card_purchase) - *suporta parcelamento nativamente*
- Pagamento de Fatura (bill_payment)
- Transferência entre Meses (month_transfer_in / out)
- Transferência para Objetivo (goal_transfer)
- Saque de Objetivo (goal_withdraw)

Os campos básicos são:

- Data
- Conta (banco)
- Cartão (para compras no cartão e pagamentos de fatura)
- Tipo 
- Método de Pagamento (PIX, Débito, Crédito, Dinheiro, TED)
- Descrição
- Valor
- Parcelamento (opcional para compras no cartão)
- Mês de Referência (Orçamento)
- Mês da Fatura (para compras e pagamentos no cartão)
- Status (pendente, pago, estornado, cancelado)
- Categoria (aplicável apenas a despesas)
- Envelope (aplicável apenas a despesas)
- Objetivo (aplicável a transferências de metas)

Identifique todos os campos com base no PRD e suas regras. Caso haja necessidade, poderá ser criado um novo campo, mas com a devida justificativa. 

Respeitar integralmente o PRD.

Garantir que:

- compras em cartão consumam apenas envelopes;
- pagamentos de fatura alterem o saldo das contas e valor de fatura pendente do cartão.
- Um mês não se confunda com outro mês de outro ano, salvando e exibindo corretamente. Por exemplo, "Dez25" deve ser um mês diferente de "Dez26".

Ao finalizar:

- revisar;
- validar;
- apresentar resumo.

Aguardar aprovação.

---