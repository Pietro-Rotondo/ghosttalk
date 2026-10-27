/**
 * GhostTalk — Ponto de entrada do servidor
 * Inicializa Express, Socket.IO, conexão com MongoDB e rotas principais.
 */

require('dotenv').config();

const http = require('http');
const app = require('./app');
const { inicializarSocket } = require('./socket/socketManager');
const conectarBancoDeDados = require('./utils/bancoDeDados');
const logger = require('./utils/logger');
const { iniciarLimpezaMensagensExpiradas } = require('./utils/limpeza');

const PORTA = process.env.PORT || 4000;

// Cria o servidor HTTP para suportar Socket.IO
const servidor = http.createServer(app);

// Inicializa o Socket.IO no mesmo servidor HTTP
inicializarSocket(servidor);

// Conecta ao banco de dados e inicia o servidor
async function iniciar() {
  try {
    await conectarBancoDeDados();
    logger.info('Conectado ao banco de dados com sucesso');

    // Em produção escuta em 0.0.0.0 para aceitar conexões externas
    // Em desenvolvimento usa 127.0.0.1 por segurança
    const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
    servidor.listen(PORTA, HOST, () => {
      logger.info(`Servidor GhostTalk rodando na porta ${PORTA} em modo ${process.env.NODE_ENV}`);
    });

    // Inicia a limpeza periódica de mensagens com auto-destruição
    iniciarLimpezaMensagensExpiradas();
  } catch (erro) {
    logger.error('Falha ao iniciar o servidor:', erro.message);
    process.exit(1);
  }
}

// Tratamento de erros não capturados
process.on('unhandledRejection', (motivo) => {
  logger.error('Rejeição não tratada:', motivo);
  process.exit(1);
});

process.on('uncaughtException', (erro) => {
  logger.error('Exceção não capturada:', erro.message);
  process.exit(1);
});

iniciar();
