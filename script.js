
//1 selecao de elmentos cache
const containerProdutos = document.querySelector('.container-produtos');
const totalPicolesDisplay = document.getElementById('total-picoles');
const valorTotalDisplay =  document.getElementById('valor-total');
const btnCancelar = document.getElementById('cancelar-pedido');
const btnImprimir = document.getElementById('imprimir-pedido');

//1.Função Central de Atualização do Resumo (Mecanica Reativa)
function atualizarResumoPedido(){
    let totalItens = 0;
    let valorTotal = 0;

    document.querySelectorAll('.item-produto').forEach(produto =>{
        const qtd =parseInt(produto.querySelector('.contador').innerText);
        const preco = parseFloat(produto.getAttribute('data-preco'));

        totalItens += qtd;
        valorTotal += (qtd * preco);
    });

    totalPicolesDisplay.innerText = totalItens;
    valorTotalDisplay.innerText = `R$ ${valorTotal.toFixed(2).replace('.', '.')}`;
}

// 2. Delegação de Eventos (Otimizado para cliques no container)
containerProdutos.addEventListener('click', (e) =>{
    const target = e.target;
    const item = target.closest('.item-produto');
    if (!item) return;

    const contadorelemento = item.querySelector('.contador');
    let quantidadeAtual = parseInt(contadorelemento.innerText);

    // Lógica do botao ADICIONAR
    if (target.classList.contains('btn-add')) {
        quantidadeAtual++;
        contadorelemento.innerText = quantidadeAtual;
    }
    // Lógica do botao REMOVER
    else if (target.classList.contains('btn-remove')){
        if (quantidadeAtual > 0){
            quantidadeAtual--;
            contadorelemento.innerText = quantidadeAtual
        }
    }

    // Atualiza o resumo do pedido após qualquer alteração
    atualizarResumoPedido();
});

//3.     mecânica do botão cancelar (Reset total)
btnCancelar.addEventListener('click', () =>{
    if (confirm("Deseja realmente cancelar todo o pedido?")){
        document.querySelectorAll('.contador').forEach(c => c.innerText = "0");
        atualizarResumoPedido();
    }
});

//MECANICA BOTÃO IMPRIMIR (VERSÃO CORRIGIDA)
btnImprimir.addEventListener('click', () => {
    const total = totalPicolesDisplay.innerText;
    
    if (total === "0") {
        alert("O carrinho está vazio! Adicione produtos para imprimir.");
        return;
    }

    // 1. Configurações do WhatsApp
    const numeroTelefone = "5516996488910";
    let mensagem = `*🍦 NOVO PEDIDO - Distribuidora Vitoria*\n`;
    mensagem += `----------------------------------\n`;

    // 2. Varredura dos itens selecionados
    document.querySelectorAll('.item-produto').forEach(produto => {
        const qtd = parseInt(produto.querySelector('.contador').innerText);
        const nome = produto.querySelector('.nome-produto').innerText;

        if (qtd > 0) {
            mensagem += `✅ ${qtd}x ${nome}\n`;
        }
    });

    // 3. Adiciona o valor total
    mensagem += `----------------------------------\n`;
    mensagem += `*Total do Pedido: ${valorTotalDisplay.innerText}*`;

    // 4. Codifica a mensagem para URL (CORRIGIDO: "C" maiúsculo)
    const linkZap = `https://wa.me/${numeroTelefone}?text=${encodeURIComponent(mensagem)}`;

    // 5. Abre em uma nova aba
    const abaZap = window.open(linkZap, '_blank');
    
    // Verificação de segurança caso o navegador bloqueie o pop-up
    if (!abaZap) {
        alert("Por favor, permita que o navegador abra o WhatsApp para concluir o pedido.");
    }

})

// Função ajustada para o seu HTML real (Página A)
function sincronizarVisualEstoque(dadosDoBanco) {
    // Busca todos os seus itens de produto
    const itensProdutos = document.querySelectorAll('.item-produto');

    itensProdutos.forEach(item => {
        // Pega o nome do produto dentro do span .nome-produto
        const nomeSabor = item.querySelector('.nome-produto').innerText.trim();
        
        // Busca o valor no "banco de dados" (objeto JSON)
        const estoqueAtual = dadosDoBanco[nomeSabor];

        // Se o estoque for exatamente 0, aplica o efeito
        if (estoqueAtual === 0) {
            item.classList.add('status-esgotado');
        } else {
            item.classList.remove('status-esgotado');
        }
    });
}




// ========================================================
// LÓGICA DE ESTOQUE E COMUNICAÇÃO - TOTEM (PÁGINA A)
// ========================================================

// Função Principal para Atualizar o Estoque Global (LocalStorage)
function atualizarEstoqueGlobal(sabor, operacao) {
    const dadosSujas = localStorage.getItem('estoque_vitoria');
    if (!dadosSujas) return;

    let estoque = JSON.parse(dadosSujas);

    if (operacao === 'baixar') { // Quando o cliente clica no +
        if (estoque[sabor] > 0) {
            estoque[sabor] -= 1;
        }
    } else if (operacao === 'devolver') { // Quando o cliente clica no -
        estoque[sabor] += 1;
    }

    localStorage.setItem('estoque_vitoria', JSON.stringify(estoque));
}

// Escuta mudanças vindo da Gestão (Página B) em tempo real
window.addEventListener('storage', (event) => {
    if (event.key === 'estoque_vitoria') {
        const estoqueAtualizado = JSON.parse(event.newValue);
        verificarTravaSeguranca(estoqueAtualizado);
    }
});

// Aplica o visual de "Esgotado" e trava o botão +
function verificarTravaSeguranca(estoque) {
    document.querySelectorAll('.item-picole').forEach(item => {
        const nomeSabor = item.querySelector('.nome-sabor').innerText.trim();
        const qtdDisponivel = estoque[nomeSabor];

        if (qtdDisponivel !== undefined && qtdDisponivel <= 2) {
            item.classList.add('status-esgotado'); // Aplica o risco no nome (CSS)
            item.querySelector('.btn-mais').disabled = true; // Impede novas adições
        } else {
            item.classList.remove('status-esgotado');
            item.querySelector('.btn-mais').disabled = false;
        }
    });
}

// --- INTEGRAÇÃO COM SEUS BOTÕES EXISTENTES ---

// Exemplo de como deve ficar sua função do botão +
function clicarBotaoMais(sabor) {
    // Sua lógica atual de somar no carrinho vai aqui...
    
    // Adicionamos a baixa no estoque da Gestão
    atualizarEstoqueGlobal(sabor, 'baixar');
}

// Exemplo de como deve ficar sua função do botão -
function clicarBotaoMenos(sabor, quantidadeNoCarrinho) {
    // Só devolve se o cliente tiver o item selecionado
    if (quantidadeNoCarrinho > 0) {
        // Sua lógica atual de diminuir no carrinho vai aqui...
        
        // Devolve o item para a caixa de estoque da Gestão
        atualizarEstoqueGlobal(sabor, 'devolver');
    }
}

// Inicializa a trava assim que a página abre
const estoqueInicial = JSON.parse(localStorage.getItem('estoque_vitoria'));
if (estoqueInicial) verificarTravaSeguranca(estoqueInicial);


// ========================================================
// LÓGICA DE COMUNICAÇÃO TOTAL - TOTEM (PÁGINA A)
// ========================================================

// 1. Função que avisa a Gestão sobre a compra ou devolução
function atualizarEstoqueNaGestao(sabor, operacao) {
    const dados = localStorage.getItem('estoque_vitoria');
    if (!dados) return;

    let estoque = JSON.parse(dados);
    const saborChave = sabor.toUpperCase();

    if (estoque[saborChave] !== undefined) {
        if (operacao === 'baixar') {
            if (estoque[saborChave] > 0) estoque[saborChave] -= 1;
        } else if (operacao === 'devolver') {
            estoque[saborChave] += 1;
        }
        localStorage.setItem('estoque_vitoria', JSON.stringify(estoque));
    }
}

// 2. Função para travar picolés com estoque baixo (2 ou menos)
function verificarTravaSeguranca() {
    const dados = localStorage.getItem('estoque_vitoria');
    if (!dados) return;

    const estoque = JSON.parse(dados);

    // Usa a classe correta do seu HTML: .item-produto
    document.querySelectorAll('.item-produto').forEach(item => {
        const nomeSabor = item.querySelector('.nome-produto').innerText.trim().toUpperCase();
        const qtdDisponivel = estoque[nomeSabor];

        if (qtdDisponivel !== undefined && qtdDisponivel <= 2) {
            item.classList.add('status-esgotado'); // Aplica o risco (CSS)
            item.querySelector('.btn-add').disabled = true; // Trava o botão +
        } else {
            item.classList.remove('status-esgotado');
            item.querySelector('.btn-add').disabled = false;
        }
    });
}

// 3. INTEGRAÇÃO COM OS CLIQUES (Adicione isso nas suas funções de clique)
// Exemplo de como você deve chamar no seu script atual:
document.querySelectorAll('.btn-add').forEach(botao => {
    botao.addEventListener('click', (e) => {
        const item = e.target.closest('.item-produto');
        const sabor = item.querySelector('.nome-produto').innerText;
        atualizarEstoqueNaGestao(sabor, 'baixar');
    });
});

document.querySelectorAll('.btn-remove').forEach(botao => {
    botao.addEventListener('click', (e) => {
        const item = e.target.closest('.item-produto');
        const contador = item.querySelector('.contador').innerText;
        const sabor = item.querySelector('.nome-produto').innerText;

        // REGRA: Só devolve se o cliente tiver o item (contador > 0)
        if (parseInt(contador) > 0) {
            atualizarEstoqueNaGestao(sabor, 'devolver');
        }
    });
});

// Escuta a Gestão e inicia o sistema
window.addEventListener('storage', (event) => {
    if (event.key === 'estoque_vitoria') verificarTravaSeguranca();
});
verificarTravaSeguranca();

// ========================================================
// CORREÇÃO DE LOGICA: ATUALIZAÇÃO VISUAL INSTANTÂNEA
// ========================================================

// Esta função força o Totem a se atualizar a cada clique do usuário
function sincronizarTravaAposClique() {
    // Pequeno atraso para garantir que o LocalStorage salvou o novo valor
    setTimeout(() => {
        if (typeof verificarTravaSeguranca === "function") {
            verificarTravaSeguranca();
        }
    }, 50); 
}

// Aplicando o vigilante nos botões de Adicionar (+)
document.querySelectorAll('.btn-add').forEach(botao => {
    botao.addEventListener('click', () => {
        sincronizarTravaAposClique();
    });
});

// Aplicando o vigilante nos botões de Remover (-)
document.querySelectorAll('.btn-remove').forEach(botao => {
    botao.addEventListener('click', () => {
        sincronizarTravaAposClique();
    });
});

// Executa uma vez ao carregar para garantir que o estado inicial está correto
verificarTravaSeguranca();
