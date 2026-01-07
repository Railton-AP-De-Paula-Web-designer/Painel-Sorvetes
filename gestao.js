// 1. IMPORTAÇÕES (Sempre no topo)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 2. CONFIGURAÇÃO (A mesma do script.js)
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
const btnTrava = document.getElementById('btn-trava');
const textoTrava = btnTrava.querySelector('.texto-trava');
const iconeCadeado = btnTrava.querySelector('.icone-cadeado');
const inputsEstoque = document.querySelectorAll('.input-estoque');
const cards = document.querySelectorAll('.card-produto');

let cliquesTrava = 0;
let timerTrava;

// FUNÇÃO: Salvar no Firebase (A peça que faltava!)
async function salvarEstoqueNoFirebase() {
    const novoEstoque = {};
    inputsEstoque.forEach(input => {
        const card = input.closest('.card-produto');
        const nomeSabor = card.querySelector('.nome-produto').innerText.trim();
        novoEstoque[nomeSabor] = parseInt(input.value) || 0;
    });

    try {
        await set(ref(db, 'estoque'), novoEstoque);
        console.log("Estoque salvo com sucesso!");
    } catch (e) {
        alert("Erro ao salvar no banco de dados!");
    }
}

// FUNÇÃO: Carregar do Firebase (Para os números não começarem zerados)
function carregarEstoqueAtual() {
    onValue(ref(db, 'estoque'), (snapshot) => {
        const estoque = snapshot.val();
        if (!estoque) return;

        inputsEstoque.forEach(input => {
            const card = input.closest('.card-produto');
            const nomeSabor = card.querySelector('.nome-produto').innerText.trim();
            if (estoque[nomeSabor] !== undefined) {
                input.value = estoque[nomeSabor];
                atualizarCorCard(input);
            }
        });
    });
}

// FUNÇÃO: Atualiza a cor de cada card conforme estoque
function atualizarCorCard(input) {
    const card = input.closest('.card-produto');
    const valor = parseInt(input.value) || 0;
    card.classList.remove('estoque-ok', 'estoque-atencao', 'estoque-critico', 'status-vazio');
    if (valor === 0) card.classList.add('status-vazio');
    else if (valor <= 3) card.classList.add('estoque-critico');
    else if (valor <= 10) card.classList.add('estoque-atencao');
    else card.classList.add('estoque-ok');
}

// FUNÇÃO: Alterna estado da trava
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
        
        // SALVA NO FIREBASE AO BLOQUEAR
        salvarEstoqueNoFirebase();
    }
}

// EVENTOS
btnTrava.addEventListener('click', () => {
    cliquesTrava++;
    clearTimeout(timerTrava);
    timerTrava = setTimeout(() => { cliquesTrava = 0; }, 2000);
    if (cliquesTrava === 3) {
        alternarEstadoSistema();
        cliquesTrava = 0;
    }
});

inputsEstoque.forEach(input => {
    input.addEventListener('input', () => atualizarCorCard(input));
});

cards.forEach(card => {
    const btnAdd = card.querySelector('.btn-add-estoque');
    const btnRemove = card.querySelector('.btn-remove-estoque');
    const input = card.querySelector('.input-estoque');

    btnAdd?.addEventListener('click', () => {
        if (!input.disabled) {
            input.value = (parseInt(input.value) || 0) + 1;
            atualizarCorCard(input);
        }
    });

    btnRemove?.addEventListener('click', () => {
        if (!input.disabled) {
            input.value = Math.max((parseInt(input.value) || 0) - 1, 0);
            atualizarCorCard(input);
        }
    });
});

// Inicialização
carregarEstoqueAtual();