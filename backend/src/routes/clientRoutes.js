const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');
const Client = require('../models/Client');

const upload = multer({ storage: multer.memoryStorage() });

// 1. Listar clientes (com filtro por nome)
router.get('/clients', async (req, res) => {
    try {
        const { nome } = req.query;
        let query = {};
        
        if (nome) {
            query.nome = { $regex: nome, $options: 'i' };
        }

        const clients = await Client.find(query);
        res.status(200).json(clients);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar clientes.' });
    }
});

// 2. Criar cliente manual
router.post('/clients', async (req, res) => {
    try {
        const { nome, telefone, email, endereco } = req.body;
        const newClient = new Client({ nome, telefone, email, endereco });
        await newClient.save();
        res.status(201).json(newClient);
    } catch (error) {
        res.status(400).json({ error: 'Erro ao cadastrar cliente.' });
    }
});

// 3. Editar cliente
router.put('/clients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, telefone, email, endereco } = req.body;
        
        const updatedClient = await Client.findByIdAndUpdate(
            id, 
            { nome, telefone, email, endereco }, 
            { new: true }
        );

        if (!updatedClient) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }

        res.status(200).json(updatedClient);
    } catch (error) {
        res.status(400).json({ error: 'Erro ao atualizar cliente.' });
    }
});

// 4. Importação de CSV com suporte nativo a Latin-1 / UTF-8 e separador ';'
router.post('/clients/import', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo CSV enviado.' });
    }

    // 1. Decodifica o arquivo considerando Latin-1 / ANSI / UTF-8
    let decodedText;
    try {
        const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
        decodedText = utf8Decoder.decode(req.file.buffer);
    } catch {
        // Se falhar (como no arquivo em Latin-1 da prova), decodifica como latin1 nativo
        decodedText = req.file.buffer.toString('latin1');
    }

    // 2. Identifica o separador (; ou ,)
    const firstLine = decodedText.split(/\r?\n/)[0];
    const separator = firstLine.includes(';') ? ';' : ',';

    const validClients = [];
    const errors = [];
    let currentLine = 1;

    // Converte o texto limpo em UTF-8 para o csv-parser
    const stream = Readable.from(Buffer.from(decodedText, 'utf-8'));

    stream
        .pipe(csv({
            separator: separator,
            mapHeaders: ({ header }) => 
                header
                    .trim()
                    .toLowerCase()
                    .replace(/^\ufeff/, '') // Remove BOM se houver
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '') // Remove acentos do cabeçalho: 'Endereço' -> 'endereco'
        }))
        .on('data', (row) => {
            currentLine++;

            const getField = (keys) => {
                for (const k of keys) {
                    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
                        return String(row[k]).trim();
                    }
                }
                return '';
            };

            const nome = getField(['nome', 'name']);
            const telefone = getField(['telefone', 'phone', 'tel']);
            const email = getField(['email', 'e-mail']);
            const endereco = getField(['endereco', 'address']);

            // Se for uma linha completamente em branco, registra como vazia
            if (!nome && !telefone && !email && !endereco) {
                errors.push({ linha: currentLine, motivo: 'Linha completamente vazia.' });
                return;
            }

            // Validações individuais
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!nome) {
                errors.push({ linha: currentLine, motivo: 'Campo Nome ausente.' });
                return;
            }
            if (!telefone) {
                errors.push({ linha: currentLine, motivo: 'Campo Telefone ausente.' });
                return;
            }
            if (!email || !emailRegex.test(email)) {
                errors.push({ linha: currentLine, motivo: `E-mail ausente ou inválido (${email || 'vazio'}).` });
                return;
            }
            if (!endereco) {
                errors.push({ linha: currentLine, motivo: 'Campo Endereço ausente.' });
                return;
            }

            validClients.push({ nome, telefone, email, endereco });
        })
        .on('end', async () => {
            try {
                let insertedCount = 0;

                if (validClients.length > 0) {
                    const result = await Client.insertMany(validClients, { ordered: false });
                    insertedCount = result.length;
                }

                res.status(200).json({
                    totalLidos: validClients.length + errors.length,
                    inseridos: insertedCount,
                    falhas: errors.length,
                    relatorioErros: errors
                });
            } catch (dbError) {
                console.error(dbError);
                res.status(500).json({ error: 'Erro ao salvar no banco de dados.' });
            }
        })
        .on('error', (err) => {
            console.error(err);
            res.status(500).json({ error: 'Erro ao processar o CSV.' });
        });
});

module.exports = router;