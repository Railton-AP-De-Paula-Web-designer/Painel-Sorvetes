// 1. IMPORTAÇÕES
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, update, increment, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// 5. EVENTOS DE CLIQUE (+ e -) - ATUALIZADO PARA SINCRONIA IMEDIATA
if (containerProdutos) {
    containerProdutos.addEventListener('click', async (e) =>{
        const target = e.target;
        const item = target.closest('.item-produto');
        if (!item) return;

        const nomeSabor = item.querySelector('.nome-produto').innerText.trim();
        const contadorelemento = item.querySelector('.contador');
        const btnAdd = item.querySelector('.btn-add');
        const btnRemove = item.querySelector('.btn-remove');
        let quantidadeLocal = parseInt(contadorelemento.innerText);

        // AÇÃO DE ADICIONAR (+)
        if (target.classList.contains('btn-add')) {
            if (item.classList.contains('status-esgotado')) return;

            // Desabilita botões para evitar spam de cliques antes da resposta do banco
            btnAdd.disabled = true;

            try {
                // Consulta estoque real antes de permitir
                const snapshot = await get(ref(db, `estoque/${nomeSabor}`));
                const estoqueReal = snapshot.val() || 0;

                if (estoqueReal > 2) {
                    // Atualiza Firebase imediatamente (decrementa 1)
                    await update(ref(db), { [`estoque/${nomeSabor}`]: increment(-1) });
                    contadorelemento.innerText = quantidadeLocal + 1;
                } else {
                    alert("Ops! Este sabor acabou de esgotar ou atingiu o limite de segurança.");
                }
            } catch (error) {
                console.error("Erro ao atualizar estoque:", error);
            } finally {
                btnAdd.disabled = false;
            }
        } 
        
        // AÇÃO DE REMOVER (-)
        else if (target.classList.contains('btn-remove') && quantidadeLocal > 0) {
            btnRemove.disabled = true;
            try {
                // Devolve 1 para o estoque no Firebase
                await update(ref(db), { [`estoque/${nomeSabor}`]: increment(1) });
                contadorelemento.innerText = quantidadeLocal - 1;
            } catch (error) {
                console.error("Erro ao devolver estoque:", error);
            } finally {
                btnRemove.disabled = false;
            }
        }
        
        atualizarResumoPedido();
    });
}

// 6. BOTÃO CANCELAR (PRECISA DEVOLVER OS ITENS AO ESTOQUE)
if (btnCancelar) {
    btnCancelar.addEventListener('click', async () =>{
        const itensNoCarrinho = [];
        document.querySelectorAll('.item-produto').forEach(produto => {
            const qtd = parseInt(produto.querySelector('.contador').innerText);
            const nome = produto.querySelector('.nome-produto').innerText.trim();
            if (qtd > 0) itensNoCarrinho.push({ nome, qtd });
        });

        if (itensNoCarrinho.length === 0) return;

        if (confirm("Deseja realmente cancelar todo o pedido? Os itens voltarão ao estoque.")){
            const devolucoes = {};
            itensNoCarrinho.forEach(item => {
                devolucoes[`estoque/${item.nome}`] = increment(item.qtd);
            });

            try {
                await update(ref(db), devolucoes);
                document.querySelectorAll('.contador').forEach(c => c.innerText = "0");
                atualizarResumoPedido();
            } catch (err) {
                alert("Erro ao cancelar pedido.");
            }
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

            // TRAVA: Se chegar a 2 unidades ou menos, bloqueia imediatamente
            if (qtdDisponivel !== undefined && qtdDisponivel <= 2) {
                item.classList.add('status-esgotado');
                const btnAdd = item.querySelector('.btn-add');
                if (btnAdd) btnAdd.disabled = true;
                
                // Se o estoque acabou por outra compra, zera o contador local para segurança
                // mas não devolvemos nada, pois o estoque já está baixo no banco.
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

// 8. BOTÃO IMPRIMIR (APENAS ENVIA WHATSAPP - O ESTOQUE JÁ FOI ATUALIZADO NO CLIQUE)
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
            if (qtd > 0) {
                mensagem += `✅ ${qtd}x ${nome}\n`;
            }
        });

        mensagem += `----------------------------------\n`;
        mensagem += `*Total do Pedido: ${valorTotalDisplay.innerText}*`;

        const linkZap = `https://wa.me/${numeroTelefone}?text=${encodeURIComponent(mensagem)}`;
        window.open(linkZap, '_blank');
        
        // Zera o contador local sem devolver ao estoque, pois a venda foi concluída
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