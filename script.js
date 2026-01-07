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

// 5. EVENTOS DE CLIQUE (+ e -)
if (containerProdutos) {
    containerProdutos.addEventListener('click', (e) =>{
        const target = e.target;
        const item = target.closest('.item-produto');
        if (!item) return;

        // Se estiver esgotado, não deixa clicar no botão de adicionar (+)
        if (item.classList.contains('status-esgotado') && target.classList.contains('btn-add')) {
            return;
        }

        const contadorelemento = item.querySelector('.contador');
        let quantidadeAtual = parseInt(contadorelemento.innerText);

        if (target.classList.contains('btn-add')) {
            quantidadeAtual++;
            contadorelemento.innerText = quantidadeAtual;
        } else if (target.classList.contains('btn-remove') && quantidadeAtual > 0){
            quantidadeAtual--;
            contadorelemento.innerText = quantidadeAtual;
        }
        atualizarResumoPedido();
    });
}

// 6. BOTÃO CANCELAR
if (btnCancelar) {
    btnCancelar.addEventListener('click', () =>{
        if (confirm("Deseja realmente cancelar todo o pedido?")){
            document.querySelectorAll('.contador').forEach(c => c.innerText = "0");
            atualizarResumoPedido();
        }
    });
}

// 7. MONITORAMENTO DE ESTOQUE (COM TRAVA DE 2 UNIDADES)
function monitorarEstoque() {
    onValue(ref(db, 'estoque'), (snapshot) => {
        const estoque = snapshot.val();
        if (!estoque) return;

        document.querySelectorAll('.item-produto').forEach(item => {
            const nomeSabor = item.querySelector('.nome-produto').innerText.trim();
            const qtdDisponivel = estoque[nomeSabor];

            // TRAVA: Se chegar a 2 unidades ou menos, bloqueia
            if (qtdDisponivel !== undefined && qtdDisponivel <= 2) {
                item.classList.add('status-esgotado');
                const btnAdd = item.querySelector('.btn-add');
                if (btnAdd) btnAdd.disabled = true;
                item.querySelector('.contador').innerText = "0"; 
            } else {
                item.classList.remove('status-esgotado');
                const btnAdd = item.querySelector('.btn-add');
                if (btnAdd) btnAdd.disabled = false;
            }
        });
        atualizarResumoPedido();
    });
}

// 8. BOTÃO IMPRIMIR (FIREBASE + WHATSAPP)
if (btnImprimir) {
    btnImprimir.addEventListener('click', async () => {
        const totalItensQtd = totalPicolesDisplay.innerText;
        
        if (totalItensQtd === "0") {
            alert("O carrinho está vazio!");
            return;
        }

        const numeroTelefone = "5516996488910";
        let mensagem = `*🍦 NOVO PEDIDO - Distribuidora Vitoria*\n`;
        mensagem += `----------------------------------\n`;

        const atualizacoes = {};
        document.querySelectorAll('.item-produto').forEach(produto => {
            const qtd = parseInt(produto.querySelector('.contador').innerText);
            const nome = produto.querySelector('.nome-produto').innerText.trim();

            if (qtd > 0) {
                mensagem += `✅ ${qtd}x ${nome}\n`;
                atualizacoes[`estoque/${nome}`] = increment(-qtd);
            }
        });

        mensagem += `----------------------------------\n`;
        mensagem += `*Total do Pedido: ${valorTotalDisplay.innerText}*`;

        try {
            await update(ref(db), atualizacoes);
            const linkZap = `https://wa.me/${numeroTelefone}?text=${encodeURIComponent(mensagem)}`;
            window.open(linkZap, '_blank');
            document.querySelectorAll('.contador').forEach(c => c.innerText = "0");
            atualizarResumoPedido();
        } catch (err) {
            console.error("Erro:", err);
            alert("Erro ao conectar com o banco de dados.");
        }
    });
}

// 9. REDIRECIONAMENTO ADM
const linkAdm = document.getElementById('link-adm');
if (linkAdm) {
    linkAdm.addEventListener('click', (e) => {
        e.preventDefault();
        const senhaAcesso = "vitoria777";
        const tentativa = prompt("Acesso Restrito. Digite a senha de administrador:");

        if (tentativa === senhaAcesso) {
            window.location.href = "gestao.html";
        } else if (tentativa !== null) {
            alert("Senha incorreta! Acesso negado.");
        }
    });
}

// INICIALIZAÇÃO
monitorarEstoque();