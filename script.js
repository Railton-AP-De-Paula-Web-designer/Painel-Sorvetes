// 1. IMPORTAÇÕES
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, update, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 2. CONFIGURAÇÃO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDlSCGhFrWxprYJe_-mGFjhUhacLcTQrsk",
  authDomain: "distribuidora-vitoria.firebaseapp.com",
  projectId: "distribuidora-vitoria",
  storageBucket: "distribuidora-vitoria.firebasestorage.app",
  messagingSenderId: "748501265294",
  appId: "1:748501265294:web:3f24e04da3ac7e326fd2df",
  databaseURL: "https://distribuidora-vitoria-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 3. SELEÇÃO DE ELEMENTOS
const containerProdutos = document.querySelector('.container-produtos');
const totalPicolesDisplay = document.getElementById('total-picoles');
const valorTotalDisplay = document.getElementById('valor-total');
const btnCancelar = document.getElementById('cancelar-pedido');
const btnImprimir = document.getElementById('imprimir-pedido');

// O seu "Banco Local" para eliminar o delay do Firebase
let estoqueLocal = {}; 

// 4. ATUALIZAR RESUMO DO PEDIDO
function atualizarResumoPedido(){
    let totalItens = 0;
    let valorTotal = 0;
    document.querySelectorAll('.item-produto').forEach(produto =>{
        const qtd = parseInt(produto.querySelector('.contador').innerText) || 0;
        const preco = parseFloat(produto.getAttribute('data-preco')) || 0;
        totalItens += qtd;
        valorTotal += (qtd * preco);
    });
    totalPicolesDisplay.innerText = totalItens;
    valorTotalDisplay.innerText = `R$ ${valorTotal.toFixed(2)}`;
}

// 5. EVENTOS DE CLIQUE (REFATORADO PARA ALTA PERFORMANCE)
if (containerProdutos) {
    containerProdutos.addEventListener('click', (e) =>{
        const target = e.target;
        const item = target.closest('.item-produto');
        if (!item) return;

        const nomeSabor = item.querySelector('.nome-produto').innerText.trim();
        const contadorelemento = item.querySelector('.contador');
        let quantidadeLocalNoCarrinho = parseInt(contadorelemento.innerText);

        // AÇÃO DE ADICIONAR (+)
        if (target.classList.contains('btn-add')) {
            // Verifica no Banco Local (instantâneo) e respeita a trava de 2 unidades
            if (estoqueLocal[nomeSabor] > 2) {
                
                // 1. Atualiza a tela NA HORA (Fluidez total)
                contadorelemento.innerText = quantidadeLocalNoCarrinho + 1;
                
                // 2. Deduz do estoque local para o próximo clique rápido já saber o novo valor
                estoqueLocal[nomeSabor]--;

                // 3. Sincroniza com Firebase em background
                update(ref(db), { [`estoque/${nomeSabor}`]: increment(-1) }).catch(err => {
                    console.error("Erro de sincronia:", err);
                });
            } else {
                alert("Sabor esgotado ou no limite de segurança!");
            }
        } 
        
        // AÇÃO DE REMOVER (-)
        else if (target.classList.contains('btn-remove') && quantidadeLocalNoCarrinho > 0) {
            // 1. Atualiza tela
            contadorelemento.innerText = quantidadeLocalNoCarrinho - 1;
            
            // 2. Devolve ao estoque local
            estoqueLocal[nomeSabor]++;

            // 3. Sincroniza background
            update(ref(db), { [`estoque/${nomeSabor}`]: increment(1) });
        }
        
        atualizarResumoPedido();
    });
}

// 6. BOTÃO CANCELAR
if (btnCancelar) {
    btnCancelar.addEventListener('click', async () =>{
        const itensNoCarrinho = [];
        document.querySelectorAll('.item-produto').forEach(produto => {
            const qtd = parseInt(produto.querySelector('.contador').innerText);
            const nome = produto.querySelector('.nome-produto').innerText.trim();
            if (qtd > 0) itensNoCarrinho.push({ nome, qtd });
        });

        if (itensNoCarrinho.length === 0) return;

        if (confirm("Deseja realmente cancelar todo o pedido?")){
            const devolucoes = {};
            itensNoCarrinho.forEach(item => {
                devolucoes[`estoque/${item.nome}`] = increment(item.qtd);
            });

            try {
                await update(ref(db), devolucoes);
                document.querySelectorAll('.contador').forEach(c => c.innerText = "0");
                atualizarResumoPedido();
            } catch (err) {
                alert("Erro ao cancelar.");
            }
        }
    });
}

// 7. MONITORAMENTO DE ESTOQUE (ALIMENTA O BANCO LOCAL)
function monitorarEstoque() {
    onValue(ref(db, 'estoque'), (snapshot) => {
        const estoque = snapshot.val();
        if (!estoque) return;

        // Sincroniza o banco local com o que vem do Firebase
        estoqueLocal = estoque; 

        document.querySelectorAll('.item-produto').forEach(item => {
            const nomeSabor = item.querySelector('.nome-produto').innerText.trim();
            const qtdDisponivel = estoqueLocal[nomeSabor];

            // Bloqueio visual se chegar a 2
            if (qtdDisponivel !== undefined && qtdDisponivel <= 2) {
                item.classList.add('status-esgotado');
                const btnAdd = item.querySelector('.btn-add');
                if (btnAdd) btnAdd.disabled = true;
            } else {
                item.classList.remove('status-esgotado');
                const btnAdd = item.querySelector('.btn-add');
                if (btnAdd) btnAdd.disabled = false;
            }
        });
        atualizarResumoPedido();
    });
}

// 8. BOTÃO IMPRIMIR
if (btnImprimir) {
    btnImprimir.addEventListener('click', () => {
        const totalItensQtd = totalPicolesDisplay.innerText;
        if (totalItensQtd === "0") {
            alert("O carrinho está vazio!");
            return;
        }

        const numeroTelefone = "5516996488910";
        let mensagem = `*🍦 NOVO PEDIDO - Distribuidora Vitoria*\n`;
        mensagem += `----------------------------------\n`;

        document.querySelectorAll('.item-produto').forEach(produto => {
            const qtd = parseInt(produto.querySelector('.contador').innerText);
            const nome = produto.querySelector('.nome-produto').innerText.trim();
            if (qtd > 0) mensagem += `✅ ${qtd}x ${nome}\n`;
        });

        mensagem += `----------------------------------\n`;
        mensagem += `*Total: ${valorTotalDisplay.innerText}*`;

        const linkZap = `https://wa.me/${numeroTelefone}?text=${encodeURIComponent(mensagem)}`;
        window.open(linkZap, '_blank');
        
        document.querySelectorAll('.contador').forEach(c => c.innerText = "0");
        atualizarResumoPedido();
    });
}

// 9. REDIRECIONAMENTO ADM
const linkAdm = document.getElementById('link-adm');
if (linkAdm) {
    linkAdm.addEventListener('click', (e) => {
        e.preventDefault();
        const senhaAcesso = "vitoria777";
        const tentativa = prompt("Senha ADM:");
        if (tentativa === senhaAcesso) window.location.href = "gestao.html";
    });
}

// INICIALIZAÇÃO
monitorarEstoque();