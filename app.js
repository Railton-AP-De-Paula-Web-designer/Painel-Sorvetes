// ========================================================
// app.js — Backend de Estoque (Render + SQLite)
// Versão: Produção Estável
// ========================================================

// -------------------------
// 1. IMPORTAÇÕES
// -------------------------
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

// -------------------------
// 2. CONFIGURAÇÃO DO APP
// -------------------------
const app = express();
const port = process.env.PORT || 10000;

// -------------------------
// 3. MIDDLEWARES
// -------------------------
app.use(cors()); // Libera acesso do GitHub Pages
app.use(express.json()); // Permite JSON no body

// -------------------------
// 4. BANCO DE DADOS (SQLite)
// -------------------------
const db = new sqlite3.Database('./banco.db', (err) => {
    if (err) {
        console.error('❌ Erro ao abrir o banco:', err.message);
    } else {
        console.log('✅ Banco SQLite conectado com sucesso');
    }
});

// -------------------------
// 5. CRIAÇÃO AUTOMÁTICA DA TABELA
// -------------------------
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS estoque (
            sabor TEXT PRIMARY KEY,
            quantidade INTEGER NOT NULL
        )
    `, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela estoque:', err.message);
        } else {
            console.log('✅ Tabela "estoque" verificada/criada');
        }
    });
});

// -------------------------
// 6. ROTAS
// -------------------------

// 🟢 ROTA DE TESTE (health check)
app.get('/', (req, res) => {
    res.json({ status: 'Servidor online 🚀' });
});

// 🟢 BUSCAR ESTOQUE
app.get('/estoque', (req, res) => {
    console.log('📥 GET /estoque recebido');

    db.all("SELECT * FROM estoque", [], (err, rows) => {
        if (err) {
            console.error('❌ Erro SQLite (GET /estoque):', err.message);
            return res.status(500).json({ error: err.message });
        }

        console.log(`✅ ${rows.length} itens enviados`);
        res.json(rows);
    });
});

// 🟢 ATUALIZAR ESTOQUE
app.post('/atualizar-estoque', (req, res) => {
    console.log('📤 POST /atualizar-estoque recebido');

    const listaProdutos = req.body;

    if (!Array.isArray(listaProdutos)) {
        return res.status(400).json({ success: false, error: 'Formato inválido' });
    }

    db.serialize(() => {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO estoque (sabor, quantidade)
            VALUES (?, ?)
        `);

        listaProdutos.forEach(item => {
            stmt.run(item.sabor, item.quantidade);
        });

        stmt.finalize((err) => {
            if (err) {
                console.error('❌ Erro ao salvar estoque:', err.message);
                return res.status(500).json({ success: false });
            }

            console.log('✅ Estoque atualizado com sucesso');
            res.json({ success: true });
        });
    });
});

// -------------------------
// 7. START DO SERVIDOR
// -------------------------
app.listen(port, () => {
    console.log(`🚀 Servidor rodando na porta ${port}`);
});
