# Etapa 8 - Investimentos (Investments)

  

Nesta etapa, criaremos o módulo de **Investimentos**, responsável por gerenciar os investimentos do usuário.

  

## Fase 1

  
Criar a rota de investimentos na aplicação. Deve seguir o padrão das outras rotas, com um menu lateral e uma página de listagem.

  
### Cadastro de Investimento

  
O botão novo investimento deve abrir um modal para cadastro de um investimento e seu primeiro aporte.


O modal de cadastro de investimento e aporte deve conter os seguintes campos:

#### Seção de identificação do investimento:

- Tipo: Enumeração com os seguintes valores: Renda Fixa, Renda Variável, Criptomoedas, Outros.

- Categoria: Enumeração com os seguintes valores: Tesouro Direto, CDB, LCI, LCA, CRI, CRA, Debêntures, Ações, Fundos Imobiliários, Criptomoedas, Outros. Dependendo do tipo selecionado, já carrega as categorias relacionadas. Precisaremos criar os enums para alimentar esses campos com os tipos e suas categorias.

- Corretora: Um select com a listagem de contas, da collection accounts, que estão marcadas como corretoras **(implementar essa flag na collection accounts)**. Não irá alterar o saldo de nenhuma conta, apenas servirá para organização. 

- Nome: Texto curto para descrever o investimento (ex: CDB Itaú, Ações Petrobras, Bitcoin, Tesouro IPCA+ 8% 2032, etc).

- Objetivo: Select com os objetivos da collection goals. Para linkar o investimento.

#### Seção de aporte:

- Checkbox: Checkbox para sinalizer se o aporte irá utilizar o valor reservado do objetivo. Exibindo ao lado o valor disponível do objetivo. (Caso marcado, o valor do investimento será limitado ao valor disponível do objetivo, ou seja, não poderá ser maior que o valor disponível do objetivo).

- Data: Data do aporte (padrão data atual).

- Conta: conta de origem, de onde saiu o dinheiro (ex: Nubank, Inter, Itaú, etc). Ou seja, a conta que será debitada **(terá o saldo impactado)**. Como padrão será preenchido com o nome da corretora selecionada.

- Mês e ano do Orçamento: Mês do orçamento ao qual o aporte pertence e de **onde sairá o aporte** (padrão mês atual). Igual ao que existe no modal de transações.

- Quantidade: Quantidade de ações ou cotas (padrão 1).

- Valor da cota: Valor da cota (padrão 0,00). 

- Valor Total: Valor da aplicação/aporte (padrão 0,00). Calcular valor total do aporte multiplicando o valor da cota pela quantidade. (Quando esses campos forem manipulados)

Obs.: Para investimentos de Renda Fixa, os campos quantidade e valor da cota não devem ser exibidos.

Ao salvar deverá ser criado o investimento na coleção investments e o primeiro aporte na collection de aportes que ficará dentro do investimento criado **(Analisar se é a melhor forma de armazenar)**

Ao ser lançado um aporte, deverá ser **gerada uma transação de saída da conta de origem com um tipo específico de aporte/aplicação em investimento (descrição: Aporte Investimento nome do investimento)**. **Verificar e atualizar modelagem da collection de transações com essa nova implementação** 
Esta transação **não pode ser deletada enquanto existir a aplicação/aporte relacionado**. Caso a aplicação/aporte seja deletado, a transação deve ser deletada também, para que o saldo da conta seja atualizado corretamente.

Caso seja selecionado que o aporte utilizará o valor reservado do objetivo, a transaction que será inserida no banco deve ter o uid do objetivo. Deverá ser feito um saque do objetivo (goal_withdraw) no valor do investimento/aplicação (descrição: Saque para Investimento nome do investimento), no mesmo mês do aporte, para que o saldo reservado do objetivo diminua. Isso implica que o aporte em si não pode ser maior que o saldo reservado em conta do objetivo.

Teremos algumas **alterações na feature de objetivos**, pois os investimentos passarão a fazer parte da composição do saldo do objetivo, funcionando da seguinte forma:

> Novo Card de Objetivo:
    
    - Saldo em Conta (saldo reservado já existente hoje, não muda).

    - Saldo Investimentos (soma do saldo de todos os investimentos vinculados ao objetivo).

    - Saldo Total (soma do saldo em conta e saldo de investimentos).

     Obs. 1: Caso exista investimento vinculado ao objetivo, a deleção do objetivo não poderá ser realizada (esse deve ser o primeiro bloqueio do botão delete).

     Obs. 2: O saque do objetivo deve ser limitado apenas ao saldo em conta, como já é hoje. 

> Nova listagem de transações do card de objetivos:
    
    - Além da listagem atual, irá incluir também os investimentos com aquele objetivo, já que teremos o uid do objetivo vinculado ao investimento. Deverá ser exibido o nome do investimento, a corretora, e o saldo total do campo saldo do investimento. O ícone deve ser diferente (indicando investimento) e a cor do valor deve seguir o mesmo padrão que fica na listagem do transactionlist (verificar melhor forma de implementar isso).


    
#### Atenção: 
    
    Analise a modelagem do banco junto com o código, para entender o funcionamento das transactions e dos goals hoje, verifique onde existem cáclculos de saldos que dependem dos objetivos e transações e veja se é possível implementar essas alterações necessárias em objetivos e transactions, sem quebrar nenhuma funcionalidade existente. Faça o plano e apresente os campos e collections que serão necessários criar, bem como as funcionalidades a serem implementadas e alteradas. Identifique possíveis cenários de conflitos ou quebra de fluxo com as novas implementações que utilizarão e impactarão as features já existentes.

  
### Listagem de Investimentos
  
A listagem deve listar os investimentos contendo nome e corretora, mostrando o saldo total de cada investimento. Nessa fase o saldo total é a soma dos valores de todos os aportes realizados em um mesmo investimento. Cada card deve exibir o nome do investimento, a corretora, o tipo, a categoria, o saldo total.

Os cards devem seguir a estilização e o padrão visual dos outros cards do sistema. Em telas maiores podem ser exibidos mais de um card por linha. Em telas menores, ou seja, telas de dispositivos móveis, deve ser exibido apenas um card por linha. Cada card deve ter os botões de deleção e edição.

Deve existir um botão de filtro no topo que abre o box de filtros. Os filtros disponíveis são:

- Tipo
- Categoria
- Corretora
- Objetivo (da collection goals)

O box de filtros deve ter o mesmo comportamento para fechar quando clicar no botao filtros novamente, e um botão para limpar os filtros. 

Mantenha o mesmo padrão de estilização dos outros cards, listagem, modals e box de filtros do sistema, com responsividade mobile first.


## Fase 2

### Aportes

Na lateral do card do investimento deve ser criado um botão de aporte, que abrirá um modal para cadastro de um aporte (o mesmo modal de cadastro de investimento, com os campos da seção aporte, mas com os campos da seção de identificação do investimento já preenchidos e bloqueados para edição, no topo com estilo apenas informativo).


Como já definido na fase 1: 
 - ao ser lançado um aporte, deverá ser gerada uma transação de saída da conta de origem.
 - se o usuário tiver marcado o checkbox "utilizar valor disponível do objetivo" no aporte, o limite do aporte será o saldo do objetivo e deverá ser feito um saque do objetivo (goal_withdraw).
 - O aporte deve ser salvo dentro da collection do investimento que está sendo aportado. 


### Rendimentos

Ao lado do botão de aporte deve ter um botão de rendimentos, que abrirá um modal para cadastro de um rendimento. O modal de rendimentos deve ter os seguintes campos:


- Data: Data do rendimento (padrão data atual).
- Valor da cota: Valor da cota (padrão 0,00).
- Valor total: Valor do rendimento (padrão 0,00). 
- Saldo Anterior: Valor do saldo do investimento antes do rendimento (já carregar na abertura do modal e travar edição, talvez nem precise exibir na verdade).

Ao ser lançado um rendimento, deverá ser gerada um registro de rendimento dentro do investimento. 



### Resgates ou Vendas

Ao lado do botão de rendimentos deve existir um botão de resgates ou vendas, que abrirá um modal para cadastro de um resgate ou venda. O modal de resgates ou vendas deve ter os seguintes campos:


- Data: Data do resgate ou venda (padrão data atual).
- Valor da cota: Valor da cota (padrão 0,00).
- Quantidade: Quantidade de ações ou cotas (padrão soma da quantidade de aportes e limita até esse teto).
- Valor total: Valor do resgate ou venda (padrão 0,00). Deve ser calculado multiplicando o valor da cota pela quantidade.
- Conta: Conta de origem, de onde saiu o dinheiro (ex: Nubank, Inter, Itaú, etc). Ou seja, a conta que será creditada (terá o saldo impactado). Como padrão será preenchido com a mesma account da corretora do investimento.
- Saldo Anterior: Valor do saldo do investimento antes do resgate ou venda (já carregar na abertura do modal e travar edição, talvez nem precise exibir na verdade).

Se o total do resgate for maior do que o saldo total do investimento, deve ser informado ao usuário que ele precisa lançar um aporte ou rendimento para cobrir o valor do resgate ou venda, antes de prosseguir com o resgate. Caso ele prefira continuar informar que o saldo final ficará inconsistente e liberar o resgate.

Ao ser lançado um resgate ou venda, deverá ser gerada uma registro de resgate ou venda dentro do investimento. 

Também deverá ser criada uma transaction de resgate de investimento que terá como destino a conta informada no campo Conta, aumentando o saldo da conta informada no campo Conta.

Verificar a possibilidade de ter o mesmo modal para lançamento de rendimento e resgate ou venda, pois os campos são basicamente os mesmos.

Os campos quantidade e valor da cota só serão exibidos caso o investimento contemple esses campos.

Ao clicar no card do investimento principal, abrirá uma página ou modal de detalhes do investimento com as informações e saldos do investimento no topo e abaixo a listagem de todos os aportes, rendimentos e resgates realizados naquele investimento, dividido em abas (aportes, rendimentos, resgates/vendas). A listagem desses itens deve ser em forma de cards com as principais informações e botão para deletar.

No card do investimento agora deverá ser exibido:
- o total dos aportes, a soma de todos os aportes realizados naquele investimento (já implementado na fase 1, só muda o nome para "Aportes").
- o total dos rendimentos, a soma de todos os rendimentos realizados naquele investimento.
- o total de resgates ou vendas, a soma de todos os resgates ou vendas realizados naquele investimento.
- o saldo total do investimento, que é a soma do total dos aportes e do total dos rendimentos menos o total de resgates ou vendas.

Na collection investimentos deve ser salvo os campos de totalizadores necessários para o cálculo do saldo total do investimento (total aportes, total rendimentos, total resgates), bem como o próprio saldo total. Esses campos devem ser atualizados sempre que for inserido, editado ou deletado um aporte, rendimento ou resgate.
Salvar também o campo de quantidade de cotas acumuladas, caso exista cotas nesse investimento. Para isso, em aportes a quantidade deve ser somada e em resgates a quantidade deve ser subtraída.

    Recursos futuros para rendimentos e resgates:

    Verificar possibilidade de implementar sugestão de valor de rendimento ou resgate/venda, capturando o valor da cota atual via api e multiplicando pela quantidade de cotas acumuladas:
    - A quantidade de cotas será capturada do campo da collection do investimentos (total de cotas acumuladas).
    - Para resgates a quantidade será lançada no campo permitindo o usuário editar até aquele limite disponível para resgate. O valor total é calculado multiplicando o valor da cota capturado, pela quantidade a ser resgatada.
    - Para rendimentoas a quantidade ficará apenas em variável sendo usada apenas para leitura. O valor total do rendimento a ser lançado deve ser calculado multiplicando o valor da cota capturado, pela quantidade de cotas acumuladas, menos o total de rendimentos já lançados até o momento (que será o valor atual do campo total rendimentos).


## Fase 3 

### Carteira

Implementar seção de distribuição da Carteira que irá exibir dois gráficos com a distribuição por Corretora e por Objetivo. 

Essa seção ficará no topo, antes da listagem dos cards de investimentos e poderá ser minimizada, exibindo apenas o saldo total de investimentos e um botão para expandir a seção. 


### Metas de Rendimentos

Implementar uma seção que irá exibir: 
- O rendimento do último mês somando os rendimentos de todos os investimentos 
- A meta de rendimento para o mes atual, que será calculada com base em um input onde o usuário digitará a porcentagem do rendimento esperado e já será calculado com base no patrimônio total em investimentos fora do mes atual (saldo total do investimento - rendimentos do mes atual - aportes do mes atual - resgates do mes atual). O campo porcentagem deve ter um valor padrão de 1% (0,01) e não pode ser menor que 0% (0,00). Ao lado já deve ser exibido o valor absoluto calculado com base na porcentagem sobre o valor do patrimônio calculado fora do mes atual. Deve existir uma barra de progresso que irá de 0 até o valor da meta. Caso exista rendimentos já lançados no mes atual, deve entrar na barra de progresso.

Essa seção ficará abaixo da listagem dos cards de investimentos. 

Abaixo e no final, exibir a lista de rendimentos totais agrupados por mês, dos últimos 12 meses (para cada mes: calcular iterando todos os investimentos, e para cada investimento, pegar o menor saldo anterior dos rendimentos daquele mes e somar com a todos dos rendimentos daquele mês, para no final somar o total desses menores saldos anteriores e total de rendimentos de todos os investimentos em cada mes). Cada mês da listagem terá o valor inicial total no mês (soma do menor total anterior de cada investimento naquele mes), o total de rendimento (soma de todos os rendimentos de investimentos daquele mes), a porcentagem, o valor final.



