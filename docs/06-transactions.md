# Etapa 7 — Transações

Implementar lançamento de transações. As transações contemplam lançamentos que sempre serão vinculadas a um mês. As transações caracterizam um lançamento de entrada ou saída de dinheiro. 

Utilize o PRD como base para implementação dos campos e regras de negócio. Atentando-se para as especifidades de alguns tipos de transações.

Basicamente podemos ter como exemplo os seguintes tipos de transações:

- Receita
- Despesa PIX
- Compra no Cartão
- Pagamento de Fatura
- Transferência entre Meses

Os campos básicos são:

- Data
- Conta
- Tipo 
- Método de Pagamento 
- Descrição
- Valor
- Mês 
- Categoria (aplicável apenas a despesas)
- Envelope (aplicável apenas a despesas)

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