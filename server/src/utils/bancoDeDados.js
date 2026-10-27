/**
 * GhostTalk — Utilitário de Banco de Dados
 * Gerencia a conexão com o MongoDB via Mongoose.
 */

const mongoose = require('mongoose');
const logger = require('./logger');

async function conectarBancoDeDados() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI não definida nas variáveis de ambiente');
  }

  await mongoose.connect(uri, {
    // Estas opções garantem compatibilidade e performance
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB desconectado. Tentando reconectar...');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconectado com sucesso');
  });

  mongoose.connection.on('error', (erro) => {
    logger.error('Erro na conexão com MongoDB:', erro.message);
  });
}

module.exports = conectarBancoDeDados;
