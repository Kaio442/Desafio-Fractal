const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const clientRoutes = require('./routes/clientRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Registar as rotas da aplicação
app.use('/api', clientRoutes);

const PORT = process.env.PORT || 3000;

// Ligação ao MongoDB Atlas e arranque do servidor
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Conectado ao MongoDB Atlas com sucesso!');
        app.listen(PORT, () => {
            console.log(`Servidor a rodar na porta ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Erro ao ligar ao MongoDB:', err);
    });