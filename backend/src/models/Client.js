const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    telefone: { type: String, required: true },
    email: { type: String, required: true },
    endereco: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Client', ClientSchema);