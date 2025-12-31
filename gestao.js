const btnTrava = document.getElementById('btn-trava');
const textoTrava = btnTrava.querySelector('.texto-trava');
const iconeCadeado = btnTrava.querySelector('.icone-cadeado');
const inputsEstoque = document.querySelectorAll('.input-estoque');
const cards = document.querySelectorAll('.card-produto');

let cliquesTrava = 0;
let timerTrava;

const API_URL = "https://repositorio-render-ckey.onrender.com";

// ==============================
// Função: Atualiza a cor de cada card conforme estoque
// ==============================
function atualizarCorCard(input) {
    const card = input.closest('.card-produto');
    const valor = parseInt(input.value) || 0;

    card.classList.remove('estoque-ok', 'estoque-atencao', 'estoque-critico', 'status-vazio');

    if (valor === 0) card.classList.add('status-vazio');
    else if (valor <= 3) card.classList.add('estoque-critico');
    else if (valor <= 10) card.classList.add('estoque-atencao');
    else card.classList.add('estoque-ok');
}

// ==============================
// Função: Alterna estado da trava
// ==============================
function alternarEstadoSistema() {
    const estadoBloqueado = btnTrava.classList.contains('bloqueado');

    if (estadoBloqueado) {
        btnTrava.classList.replace('bloqueado', 'liberado');
        textoTrava.innerText = "SISTEMA LIBERADO";
        iconeCadeado.innerText = "🔓";
        inputsEstoque.forEach(input => input.disabled = false);
    } else {
        btnTrava.classList.replace('liberado', 'bloqueado');
        textoTrava.innerText = "SISTEMA BLOQUEADO";
        iconeCadeado.innerText = "🔒";
        inputsEstoque.forEach(input => input.disabled = true);

        salvarAlteracoesNoBanco();
    }
}

// ==============================
// Evento: Trava de Segurança (3 cliques rápidos)
// ==============================
btnTrava.addEventListener('click', () => {
    cliquesTrava++;
    clearTimeout(timerTrava);
    timerTrava = setTimeout(() => { cliquesTrava = 0; }, 2000);

    if (cliquesTrava === 3) {
        alternarEstadoSistema();
        cliquesTrava = 0;
    }
});

// ==============================
// Monitoramento de inputs
// ==============================
inputsEstoque.forEach(input => {
    atualizarCorCard(input);
    input.addEventListener('input', () => atualizarCorCard(input));
});

// ==============================
// Função: Carregar dados do banco
// ==============================
async function carregarDadosDoBanco() {
    const statusDb = document.getElementById('db-status');
    const ponto = document.querySelector('.ponto-conexao');

    try {
        statusDb.innerText = "Sincronizando...";
        const resposta = await fetch(`${API_URL}/estoque`);
        if (!resposta.ok) throw new Error("Erro ao buscar estoque");

        const dados = await resposta.json();

        dados.forEach(item => {
            const card = document.querySelector(`[data-sabor="${item.sabor}"]`);
            if (card) {
                const input = card.querySelector('.input-estoque');
                input.value = item.quantidade;
                atualizarCorCard(input);
            }
        });

        statusDb.innerText = "Sincronizado";
        ponto.style.background = "#2ecc71";
    } catch (err) {
        statusDb.innerText = "Erro de Conexão";
        ponto.style.background = "#ff4d4d";
        console.error(err);
    }
}

// ==============================
// Função: Salvar alterações no banco
// ==============================
async function salvarAlteracoesNoBanco() {
    const statusDb = document.getElementById('db-status');
    const ponto = document.querySelector('.ponto-conexao');

    const listaParaEnviar = Array.from(cards).map(card => ({
        sabor: card.getAttribute('data-sabor'),
        quantidade: parseInt(card.querySelector('.input-estoque').value) || 0
    }));

    try {
        const resposta = await fetch(`${API_URL}/atualizar-estoque`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(listaParaEnviar)
        });

        if (!resposta.ok) throw new Error("Erro ao salvar estoque");

        statusDb.innerText = "Sincronizado";
        ponto.style.background = "#2ecc71";
    } catch (err) {
        statusDb.innerText = "Erro ao Salvar";
        ponto.style.background = "#ff4d4d";
        console.error(err);
    }
}

// ==============================
// Função: Incrementar/Decrementar estoque manualmente (opcional)
// ==============================
cards.forEach(card => {
    const btnAdd = card.querySelector('.btn-add-estoque');
    const btnRemove = card.querySelector('.btn-remove-estoque');
    const input = card.querySelector('.input-estoque');

    btnAdd?.addEventListener('click', () => {
        input.value = (parseInt(input.value) || 0) + 1;
        atualizarCorCard(input);
    });

    btnRemove?.addEventListener('click', () => {
        input.value = Math.max((parseInt(input.value) || 0) - 1, 0);
        atualizarCorCard(input);
    });
});

// ==============================
// Inicialização
// ==============================
carregarDadosDoBanco();



// ========================================================
// PONTE DE COMUNICAÇÃO FINAL - GESTÃO (PÁGINA B)
// ========================================================

function salvarEstoqueNoEspelho() {
    const estoqueAtual = {};
    // Buscamos os cards de picolé na sua tela
    document.querySelectorAll('.card-produto').forEach(card => {
        // Pega o nome do sabor direto do H3 (ABACAXI, CHOCOLATE...)
        const tituloSabor = card.querySelector('h3');
        const inputQuantidade = card.querySelector('input');

        if (tituloSabor && inputQuantidade) {
            const sabor = tituloSabor.innerText.trim();
            const quantidade = parseInt(inputQuantidade.value) || 0;
            estoqueAtual[sabor] = quantidade;
        }
    });
    
    // Salva no espelho para o Totem ler
    localStorage.setItem('estoque_vitoria', JSON.stringify(estoqueAtual));
    console.log("✅ Estoque sincronizado no espelho:", estoqueAtual);
}

// Escuta se o Cliente (Página A) comprou algo e atualiza as caixas na Gestão
window.addEventListener('storage', (event) => {
    if (event.key === 'estoque_vitoria') {
        const novoEstoque = JSON.parse(event.newValue);
        
        document.querySelectorAll('.card-produto').forEach(card => {
            const tituloSabor = card.querySelector('h3');
            if (tituloSabor) {
                const sabor = tituloSabor.innerText.trim();
                if (novoEstoque[sabor] !== undefined) {
                    const input = card.querySelector('input');
                    input.value = novoEstoque[sabor];
                    
                    // Chama sua função de cor se ela existir
                    if (typeof atualizarCorCard === "function") {
                        atualizarCorCard(input);
                    }
                }
            }
        });
    }
});

// Aciona a sincronização ao clicar no cadeado (btnTrava)
if (typeof btnTrava !== 'undefined') {
    btnTrava.addEventListener('click', () => {
        if (btnTrava.classList.contains('bloqueado')) {
            salvarEstoqueNoEspelho();
        }
    });
}

// Inicializa o sistema ao carregar
salvarEstoqueNoEspelho();


