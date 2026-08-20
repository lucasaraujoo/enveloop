# Product Requirements Document (PRD)

# Sistema de Planejamento Financeiro por Envelopes

**Versão:** 1.0

**Status:** Em elaboração

**Nome:** EnveLoop

---

# 1. Visão Geral

## Objetivo

Desenvolver uma aplicação web para gerenciamento financeiro baseada no método de envelopes, preservando a metodologia atualmente utilizada em uma planilha do Google Sheets, porém eliminando suas limitações através da automação de processos, organização das informações e melhoria da experiência do usuário.

O objetivo deste projeto não é reproduzir aplicativos existentes como YNAB, Mobills ou Organizze, apesar de usar conceitos de ambos e aproveitar algumas funcionalidades e recursos de interface.

Este sistema seguirá uma filosofia própria, construída em torno da forma como o usuário já realiza seu planejamento financeiro há vários anos, através de uma planilha do Google Sheets, mas adaptada ao formato de aplicação web, mais robusta e com melhor experiência do usuário.

A prioridade é preservar a regra de negócio existente, tornando-a mais simples, automatizada e escalável.

---

# 2. Objetivos do Projeto

O sistema deverá permitir:

- automatizar cálculos;
- controlar receitas e despesas;
- controlar contas bancárias;
- controlar cartões de crédito;
- acompanhar gastos por envelope;
- acompanhar planejamento de vários meses simultaneamente;
- visualizar rapidamente a situação financeira;
- manter histórico completo de movimentações;
- reduzir erros de lançamento;
- facilitar ajustes de planejamento.

---

# 3. Filosofia do Sistema

O sistema é baseado em planejamento financeiro por envelopes.

O sistema possui dois domínios completamente independentes, porém integrados.

## Domínio Financeiro

Representa o dinheiro real.

Neste domínio encontram-se:

- contas bancárias;
- dinheiro em espécie;
- cartões;
- receitas;
- pagamentos e gastos;
- saldo mensal e saldo geral.

O domínio financeiro responde perguntas como:

- Quanto dinheiro eu possuo hoje?
- Quanto tenho em contas?
- Quanto ainda devo pagar em cartões?
- Qual meu saldo em cada mês?
- Qual meu saldo geral?

---

## Domínio Orçamentário

Representa o planejamento.

Neste domínio encontram-se:

- envelopes;
- limites;
- planejamento mensal;
- saldo livre;


O domínio orçamentário responde perguntas como:

- Quanto planejei gastar?
- Quanto já utilizei de cada envelope?
- Quanto ainda posso gastar em cada envelope?
- Quanto ainda não destinei para nenhum envelope?

---

Os dois domínios conversam entre si, porém não devem ser confundidos.

O sistema deve considerar essa separação durante sua arquitetura.

---

# 4. Conceitos Fundamentais

## Envelope

Envelope representa um orçamento.

Cada envelope possui um limite financeiro destinado para determinada finalidade.

Exemplos:

- Mercado
- Carro
- Casa
- Saúde
- Faculdade
- Lazer

Todo lançamento pertence obrigatoriamente a um envelope.

---

## Envelope Padrão

São os envelopes principais do sistema.

São criados apenas uma vez.

Todo novo mês inicia automaticamente contendo todos os envelopes padrão.

Cada envelope padrão possui:

- nome;
- ordem;
- valor padrão;
- cor;
- ícone;
- ativo (boolean).

Um envelope inativo não será incluído em novos meses, apenas será exibido no histórico de meses que já foram criados com ele.

O valor padrão é apenas para ser utilizado na criação de cada mes planejado.

Os envelopes padrão poderão ser editados, não replicando as alterações para os meses que já foram criados. o valor padrão editado se aplica apenas a meses criados após a edição. 

---

## Envelope Temporário

São envelopes criados apenas para um ou mais meses específicos (se repetindo apenas nos meses marcados na criação).

Exemplo:

Julho

- Férias
- Viagem
- Presente Dia dos Pais

Esses envelopes não existirão automaticamente nos meses que não foram marcados na sua criação.

---

## Planejamento Mensal

Cada mês possui seu próprio orçamento.

O planejamento é exibido em formato matricial moderno e responsivo.
Linhas representam envelopes.
Colunas representam meses criados.
Cada célula representa quanto daquele envelope já foi comprometido naquele mês.

Ao iniciar um novo mês o sistema copia automaticamente todos os envelopes padrão, ou envelopes temporários que contenha esse mês na sua lista.

O usuário poderá:

- alterar limites dos envelopes para cada mês;
- criar envelopes temporários para meses específicos;
- remover envelopes temporários apenas dos meses selecionados;
- aumentar orçamento para cada mês;
- reduzir orçamento para cada mês.

os dados de cada mês são materializados sob demanda:
Se o usuário nunca interagiu com novembro, a coluna ainda aparece.
Os envelopes exibem os valores padrão (calculados a partir da configuração), sem existir um documento específico para novembro.
O documento do mês só é criado quando acontece alguma ação que precise persistir os dados daquele mês, como:
- lançar uma receita;
- alterar o limite de um envelope nesse mês;
- criar um envelope temporário contendo o mês em questão;
- registrar um lançamento ou transferência (entre meses) para esse mês.

Não criamos documento para o mês se apenas foi exibido para o usuário.

---

## Receita

A receita pertence a um mês de referência.

Ela não cria envelopes.

Ela não distribui valores automaticamente.

Sua função é justificar o orçamento definido nos envelopes daquele mês.

Exemplo:

Lançamento de Receita Exemplo

mês:Julho
Descrição: Salário 
Valor: R$ 5.000
Conta: Banco do Brasil

O sistema compara automaticamente esta receita com o total planejado dos envelopes, na exibição daquele mês.

---

## Limites

Cada envelope possui um limite.

Exemplo:

Mercado

R$ 1.200

Casa

R$ 950

Carro

R$ 180

Os limites representam o orçamento máximo planejado.

Não representam dinheiro disponível em conta. Apesar de que quando forem criados os envelopes padrão, o sistema mostrará, na tela de listagem de envelopes, o total previsto (com base nos limites dos envelopes padrão) e com isso o usuário terá uma noção de quanto irá ter de gastos fixos em cada mês.

---

## Consumo

Sempre que um lançamento é realizado, seu valor é imediatamente somado na linha do envelope correspondente, na coluna daquele mês.

O consumo do envelope independe da forma de pagamento.

Os lançamentos devem ter:
- Data
- Conta (banco)
- Tipo (Receita ou Despesa)
- Método de Pagamento (Cartão de Crédito, Débito, Dinheiro, PIX)
- Descrição
- Valor
- Mês (Mês informado pelo usuário que será afetado pelo lançamento)
- Status (pago, pendente, estornado, cancelado)
- Categoria (aplicável apenas a despesas)
- Envelope (aplicável apenas a despesas)

---

## Caixa

O caixa representa o dinheiro efetivamente disponível.

Ele considera:

- dinheiro;
- pagamentos realizados.

Compras em cartão não alteram o caixa, apenas entram como consumo do envelope.

Pagamento da fatura altera o caixa.

---

## Cartão de Crédito

O cartão é apenas um meio de pagamento.

Ele pode possuir o cadastro do seu **Dia de Fechamento** e **Dia de Vencimento** (opcionais), que são utilizados pelo sistema para deduzir em qual mês a fatura será cobrada automaticamente.

Ele apenas posterga a saída do dinheiro da conta.

Toda compra em cartão:

- pertence ao mês em que foi informado pelo usuário no lançamento (os envelopes desse mês serão afetados);
- entra imediatamente como consumo do envelope;
- permanece pendente até pagamento da fatura;
- incrementa o valor acumulado de "Fatura Pendente" do respectivo cartão (calculado incrementalmente para melhor performance).

quando a fatura é paga ela debita o caixa e retira o valor como pendente de cada compra.

Compras no cartão que já foram pagas através de uma fatura podem ser **estornadas**. O estorno não exclui a transação, mas altera seu status para "estornado" e gera um crédito no cartão que será abatido automaticamente das próximas faturas pendentes.

**Importante sobre Envelopes:** Transações com status **estornado** ou **cancelado** não entram no cálculo de consumo dos Envelopes. Dessa forma, ao estornar uma compra, o limite que havia sido gasto volta imediatamente a ficar disponível no planejamento.

---

## Saldo Geral

Representa a posição financeira consolidada.

É calculado considerando:

- saldo das contas;
- dinheiro;

Para garantir alta performance e escalabilidade, o saldo de cada conta é **atualizado de forma incremental** a cada lançamento de receita, despesa ou pagamento de fatura, e armazenado diretamente no documento da conta. Desta forma, o sistema não precisa ler todo o histórico de transações para calcular o Saldo Geral.

Este indicador é independente do mês selecionado.

---


## Saldo do Mês (Sobra ou Déficit)

O Saldo do mês representa o fluxo de caixa real projetado para aquele período, calculando se o mês fechou no azul ou no vermelho.

Fórmula:

Saldo = Receitas do mês - Despesas do mês (Despesas pagas, Transferências de saída, Pagamentos de Fatura e Compras no Cartão Pendentes)

O saldo no mês indica a saúde orçamentária:
- **Sobra (Positivo):** Pode ser transferido para o mês seguinte como um crédito para orçamentos futuros.
- **Déficit (Negativo):** Pode ser compensado puxando saldo orçamentário de meses anteriores.
- **Zerado:** As receitas cobriram perfeitamente as despesas.

---

## Transferência entre Meses

A transferência entre meses movimenta apenas orçamento.

Ela não é uma movimentação financeira no mundo real. É apenas uma forma de organizar o planejamento entre meses, organizando a visualização orçamentária ao longo dos meses.

Ela não altera contas.

Ela não altera cartões.

Ela apenas movimenta o saldo do mês de origem para o mês de destino. Basicamente vai gerar uma saída automática no mês de origem e uma receita automática no mês de destino, ambas invisíveis para as contas bancárias reais.

Na Dashboard, o atalho de transferência já é inteligente:
- Se o mês tem **Sobra**, ele sugere enviar o valor do mês atual (origem) para o próximo mês (destino).
- Se o mês tem **Déficit**, ele sugere cobrir o rombo puxando do mês anterior (origem) para o mês atual (destino).

---

## Objetivos (Metas)

Os objetivos (goals) permitem separar saldos para projetos futuros, como "Viagem", "Reserva de Emergência" ou "Troca de Carro". 
Os objetivos não guardam dinheiro físico e não interferem nas contas bancárias reais. Eles apenas organizam o saldo orçamentário. 

- **Alimentação:** Os objetivos são alimentados transferindo saldo livre de um mês (`goal_transfer`). Isso gera uma saída no mês de origem, reduzindo a "sobra" daquele mês, e aumenta o saldo do objetivo. Essa transaferencia pode consumir um envelope.
- **Saque:** Quando necessário, o saldo pode ser retirado do objetivo (`goal_withdraw`), retornando como receita (Sobra) para um mês de destino, para então ser planejado ou utilizado.
- **Exclusão:** Se um objetivo for excluído, o usuário tem a opção de fazer um "Soft Delete", mantendo as transações antigas e devolvendo automaticamente o saldo restante para o mês atual. Caso opte por não manter, as transações são deletadas restaurando o que afetou nos meses e o objetivo é deletado permanentemente.

---

# 5. Diferenciais do Sistema

Este sistema não tem como objetivo controlar apenas entradas e saídas financeiras.

Seu principal objetivo é permitir planejamento financeiro de médio e longo prazo.

Os principais diferenciais são:

- visão simultânea de vários meses;
- planejamento baseado em envelopes;
- separação entre planejamento e caixa;
- pagamento de faturas sem alterar envelopes;
- histórico permanente;
- cálculo automático de limites;
- criação de envelopes temporários;
- transferência de orçamento entre meses;
- dashboard inspirada na planilha original, porém adaptada para ambiente web.

---

# 6. Princípios do Projeto

Todo o desenvolvimento deverá respeitar os seguintes princípios:

1. O planejamento é a funcionalidade central do sistema.

2. O caixa e o orçamento são conceitos independentes.

3. Todo lançamento possui apenas uma fonte de verdade.

4. Utilizar alteração de status ao invés de movimentação física de dados.

5. O sistema deve ser simples de utilizar.

6. O usuário deve conseguir visualizar vários meses simultaneamente.

7. A dashboard deve substituir completamente a planilha atual.

8. Toda informação apresentada deve ser calculada automaticamente.

9. A interface deve privilegiar produtividade e efeitos visuais intuitivos e agradáveis, com alta performance e responsividade em diferentes dispositivos.

10. Todo salvamento no banco de dados relacionado ao mês, deverá conter também o ano para que um mês de um ano futuro não seja sobrescrito por um mês de um ano passado. 


# 7. Fluxo do Planejamento Mensal

O planejamento financeiro é organizado por mês.

Ao acessar/criar um mês pela primeira vez, o sistema deverá:

1. Criar automaticamente os envelopes padrão para aquele mês.
2. Copiar seus respectivos valores padrão.
3. Permitir ajustes individuais para aquele mês.
4. Calcular o total planejado.
5. Comparar o planejamento com as receitas do mês.
6. Atualizar o saldo do mês.
7. Exibir o saldo do mês (Sobra ou Déficit).
8. Permitir transferência do saldo para equilibrar outros meses.
9. Atualizar o saldo do mês de origem.
10. Atualizar o saldo do mês de destino.

O usuário poderá:

- alterar limites dos envelopes;
- criar envelopes temporários;
- remover envelopes temporários (somente se não existir lançamentos para esse envelope nos meses que o mesmo estiver destinado);
- transferir saldo para equilibrar os meses.

Nenhuma alteração deverá modificar os meses anteriores ou futuros.

---

# 8. Fluxo Financeiro

## Receita

Ao lançar uma receita o usuário deverá informar:

- conta
- data
- mês (irá impactar o saldo disponível desse mês)
- descrição
- valor

A receita aumenta o saldo da conta imediatamente.

Também aumenta o saldo disponível para planejamento do mês informado.

---

## Despesa PIX / Dinheiro

Ao lançar uma despesa:

- reduz imediatamente o saldo da conta (calculando);
- aumenta / atualiza o consumo do envelope;
- permanece registrada no histórico.

---

## Compra no Cartão

Ao lançar uma compra no cartão:

- associa a compra a um cartão;
- associa a compra ao envelope;
- associa a compra ao mês de referência do orçamento e ao **mês da fatura**. O sistema possui uma inteligência de **sugestão automática**: cruzando a **Data da Compra** com o **Dia de Fechamento/Vencimento** do cartão, o sistema deduz instantaneamente as datas corretas. Por padrão, o mês da fatura sempre inicia sendo "o mês da compra + 1", e a depender do dia de fechamento, ambos (orçamento e fatura) avançam ou recuam 1 mês simultaneamente. O usuário é livre para substituir essa sugestão manualmente, o que gera um bloqueio na automação e fixa a escolha feita;
- **bloqueia o lançamento** se a fatura daquele mês/cartão já estiver paga (o sistema impede a criação de compras "órfãs" retroativas e exige que o pagamento seja excluído antes);
- aumenta o consumo do envelope;
- **não altera o saldo da conta**;
- permanece com status **PENDENTE**.

---

## Compra Parcelada no Cartão

O sistema permite lançar compras parceladas no cartão de crédito em até 12x.

Ao registrar uma compra parcelada:
- O sistema divide o valor total pelo número de parcelas;
- O valor da última parcela absorve qualquer resíduo (exemplo: R$ 100 em 3x resulta em duas parcelas de R$ 33,33 e a última de R$ 33,34);
- São gerados múltiplos lançamentos (um para cada parcela) vinculados a um mesmo `installmentId`;
- Cada parcela avança um mês em relação à parcela anterior (tanto no mês de referência do orçamento quanto no mês da fatura);
- Cada parcela é registrada individualmente com status **PENDENTE**;
- O `pendingBills` do cartão é incrementado apenas uma vez, pelo valor total da compra parcelada, garantindo alta performance.

**Gerenciamento do Grupo de Parcelas:**
O sistema trata as parcelas individualmente para pagamento de fatura, mas as trata como um grupo para deleção e estorno:
- **Exclusão:** Se **todas** as parcelas do grupo estiverem com status PENDENTE, o sistema permite excluir a parcela isoladamente ou excluir **todas as parcelas** (deletando os registros e removendo o valor total de `pendingBills`).
- **Bloqueio e Estorno:** Se houver **qualquer parcela paga** (ou seja, vinculada a um pagamento de fatura), a exclusão direta do grupo é bloqueada. O sistema passa a oferecer o fluxo de **Estorno do Parcelamento**. 
- **Estorno do Parcelamento:** Ao confirmar o estorno de uma compra parcelada com parcelas pagas, o sistema:
  - Deleta as parcelas que ainda estavam PENDENTES (e subtrai seus valores de `pendingBills`);
  - Marca as parcelas PAGAS como **ESTORNADAS** (creditando seus valores no `pendingBills` para abater próximas faturas);
  - Mantém o histórico correto, prevenindo desbalanceamento do saldo do cartão.

---

## Pagamento da Fatura

Ao selecionar o tipo de transação "Pagamento de Fatura" e escolher um Cartão e Mês/Ano, o sistema possui uma inteligência automática:

- **Prevenção de Duplicidade:** O sistema consulta no banco de dados se já existe um `bill_payment` para esse mesmo cartão e mês. Se sim, bloqueia o formulário e exige que o pagamento anterior seja excluído antes de lançar outro.
- **Auto-preenchimento Inteligente e Resíduos:** O sistema calcula automaticamente o valor exato a ser pago. Ele soma as compras do mês selecionado e verifica se existe algum **resíduo** (pendência deixada por pagamentos parciais de meses anteriores) ou crédito (gerado por estornos em faturas já pagas). O resíduo obedece à fórmula matemática: `Total Pendente do Cartão - Soma de Todas as Compras Pendentes (Global)`.
- **Preenchimento de Descrição:** Se houver resíduo, o sistema avisa na descrição da transação gerada para contexto histórico.
- **Validação de Valor Customizado:** Caso o usuário altere manualmente o valor preenchido e tente salvar, o sistema exige uma confirmação:
  - Se pagar a **menos**, avisa que a diferença será transferida como pendência (resíduo) para compor as próximas faturas.
  - Se pagar a **mais**, avisa da divergência (abatendo as faturas pendentes, mas não gerando crédito irreal no cartão).
- **Auto-cura de Créditos (Opção B):** Se o cartão possuir crédito (saldo negativo de estornos) e o usuário pagar a fatura gastando dinheiro da conta real, o sistema "limpa" o crédito, pois assume que o banco real já o consumiu. A fatura tem piso mínimo de 0.
- **Memoização de Abate (appliedReduction):** Ao processar o pagamento, o sistema salva internamente o valor exato matemático que foi reduzido da fatura pendente. Isso protege o banco de dados contra assimetrias de estorno.

Ao efetivar o pagamento da fatura o sistema deverá:

- alterar todas as compras do mês indicado para status **PAGO** vinculando-as ao pagamento gerado;
- abater o valor pago do total global de "Faturas Pendentes" do cartão (respeitando o limite mínimo de 0 e as regras de auto-cura);
- criar uma movimentação financeira de saída na conta escolhida;
- recalcular o saldo da conta nas exibições de saldo.

**Restrição de Exclusão:** Lançamentos vinculados a um pagamento de fatura (pagos ou estornados) ficam **bloqueados** para exclusão direta. O usuário precisa primeiro excluir o pagamento da fatura.

**Exclusão Simétrica do Pagamento da Fatura:** Caso o usuário exclua o lançamento de pagamento da fatura:
- O sistema devolve o valor correspondente ao saldo da conta bancária.
- O sistema devolve o saldo de Fatura Pendente usando a **Simetria Matemática**: ele lê a memória do `appliedReduction` e adiciona de volta exatamente o mesmo valor que havia sido tirado, restaurando o estado com perfeição, mesmo que compras tenham sofrido mutação (estorno) após o pagamento.
- As compras atreladas que estavam com status **PAGO** retornam para **PENDENTE**.
- As compras atreladas que haviam sido **ESTORNADAS** passam para o status **CANCELADO**. Como a transação que efetuou o pagamento da fatura deixou de existir, o "estorno" passa a ser apenas o cancelamento de uma compra que nunca foi paga. O crédito original do estorno permanece seguro no cartão.

O pagamento da fatura **não altera nenhum envelope**.
Os lançamentos de despesas realizadas no cartão de crédito não entram no calculo de saldos. O desconto só ocorre no pagamento da fatura. Ou seja, as compras no cartão nunca entram no cálculo do saldo das contas. Nunca.

---

## Transferência entre Contas

O usuário poderá transferir valores entre duas contas bancárias ativas.

A operação:

- exige que as contas de origem e destino sejam diferentes;
- exige que o valor seja maior que zero e que a conta de origem tenha saldo suficiente;
- reduz imediatamente o saldo da conta de origem;
- aumenta imediatamente o saldo da conta de destino;
- não gera registros ou histórico na listagem de lançamentos (a operação altera apenas os saldos incrementais das contas de forma atômica).

---

## Transferência entre Meses

O usuário poderá transferir parte do saldo livre (desvinculado de envelopes) de um mês para outro mês.

A operação:

- reduz o saldo livre do mês origem;
- aumenta o saldo livre do mês destino;
- não altera contas;
- não altera cartões;
- gera duas movimentações financeiras, uma saída e uma receita, para cada mês impactado.

---

# 9. Dashboard

A Dashboard é a principal tela do sistema.

Ela deverá apresentar:

## Indicadores Gerais

- Saldo Geral
- Total das Faturas Pendentes

## Planejamento

Visualização em grade (grid) moderna, com:

- Envelopes nas linhas.
- Meses nas colunas.

Cada célula deverá exibir:

- valor utilizado;
- limite;
- percentual utilizado;
- ou barra de progresso.

Abaixo da tabela deverão existir os resumos mensais:

- **Total Planejado:** (Fica vermelho se os limites ultrapassarem a receita, mesmo havendo despesas)
- **Receitas**
- **Despesas:** (Inclui despesas da conta, compras pendentes no cartão ou pagamentos de fatura e transferências de saída do mês)
- **Saldo:** (Receitas - Despesas, exibindo status visual de Sobra ou Déficit com atalho direto para transferências)

Ao clicar em uma célula deverá ser possível editar limite do envelope naquele mes.

A visualização dos meses deverá ser feita através de um componente visual que permita com um simples movimento do mouse ou toque, deslizar entre os meses (para frente ou para trás).
O número de meses exibidos na tela de celulares deverá ser de 4 meses. O mes anterior, o mes atual e os 2 próximos meses. 

---

# 10. Módulos do Sistema

## Autenticação

- Login
- Cadastro
- Recuperação de senha

---

## Dashboard

Visualização geral do planejamento.

---

## Envelopes

- CRUD de envelopes padrão.
- Configuração mensal.
- Envelopes temporários.

---

## Contas Bancárias

- Cadastro de contas.
- Saldos.
- Histórico.

---

## Cartões

- Cadastro.
- Compras pendentes.
- Pagamento de faturas.

---

## Objetivos

- Cadastro de objetivos e metas.
- Transferência de saldos dos meses para objetivos.
- Saques de objetivos retornando saldo para os meses.
- Histórico e barra de progresso.

## Categorias

- Cadastro.

As categorias são usadas para relatorios e não devem ser confundidas com envelopes, pois os envelopes são utilizados para planejamento financeiro e as categorias são usadas para acompanhamento e identificação dos gastos.

---

## Lançamentos

- Data.

- Tipo (Receita ou Despesa).

- Conta (escolher banco)

- Método de Pagamento (Cartão de Crédito, Débito, Dinheiro, PIX)
- Descrição
- Valor
- Mês de Orçamento (mês em que o limite do envelope/planejamento será afetado)
- Mês da Fatura (aplicável apenas a compras e pagamentos de cartão de crédito)
- Status (pago, pendente, estornado, cancelado)
- Categoria (aplicável apenas a despesas)
- Envelope (aplicável apenas a despesas)

---

## Relatórios

- Gastos por envelope.
- Gastos por categoria.
- Gastos por cartão.
- Gastos por mês.
- Fluxo de caixa.
- Evolução patrimonial.

Deve-se ter o cuidado de não incluir os lançamentos de compras de cartão de crédito junto com os lançamentos de pagamentos de faturas, já que isso geraria duplicidade de valores nos relatórios. Os pagamentos de faturas devem ser tratados em relatórios específicos ou de forma separada.

---

# 11. Requisitos Funcionais

O sistema deverá permitir:

- autenticação de usuários;
- gerenciamento de contas;
- gerenciamento de cartões;
- gerenciamento de envelopes;
- gerenciamento de categorias;
- configuração mensal de envelopes;
- lançamento de receitas;
- lançamento de despesas;
- pagamento de faturas;
- transferência de saldo entre meses;
- geração de relatórios;
- pesquisa de lançamentos, com filtros;
- edição de lançamentos;
- exclusão lógica (Soft Delete).

### Regras de Exclusão Lógica (Soft Delete)
As entidades principais (Contas, Cartões, Envelopes e Categorias) não são deletadas fisicamente do banco de dados, mas inativadas (flag `active: false`). As diretrizes são:
- **Histórico**: Itens inativados continuam disponíveis em listagens de histórico, filtros avançados e faturas passadas.
- **Visualização**: Em telas de gerenciamento (Dashboard, listagens padrão), os itens inativos ficam ocultos. Para visualizá-los em suas telas de listagem, o usuário deve ativar um filtro específico "Exibir Inativos".
- **Restauração**: É possível restaurar qualquer item inativo a qualquer momento, e a dashboard/planejamento será recalculado instantaneamente.
- **Reciclagem**: Caso o usuário tente criar um novo item com o mesmo nome de um item inativo, o sistema identificará a duplicidade e oferecerá a opção de restaurar o item inativo.

---

# 12. Requisitos Não Funcionais

- Interface responsiva.
- O design deve ser moderno e agradável, mas deve priorizar a produtividade e a clareza das informações.
- Deve rodar em desktop e primariamente em mobile.
- Atualização em tempo real utilizando Firestore.
- Código componentizado.
- Tipagem completa com TypeScript.
- Componentes reutilizáveis.
- Performance otimizada (Uso de atualizações incrementais para saldos e consolidações, evitando *full scans* em coleções grandes no Firestore).
- Evitar uso de tabelas, priorizar componentes.
- Estrutura preparada para evolução futura.

---

# 13. Arquitetura

Next.js

Firebase

TypeScript

Tailwind

React Hook Form

Firestore



# 14. Escopo Futuro

Funcionalidades previstas para versões futuras:

- Lançamentos recorrentes.
- Dashboard anual.
- Backup automático.
- Compartilhamento entre usuários.

---





