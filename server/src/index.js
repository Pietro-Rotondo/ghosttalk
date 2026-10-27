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
    // Loga as variáveis de ambiente críticas (sem expor valores sensíveis)
    logger.info('Iniciando GhostTalk', {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      MONGODB_URI_definida: !!process.env.MONGODB_URI,
      JWT_SECRET_definida: !!process.env.JWT_SECRET,
      JWT_REFRESH_SECRET_definida: !!process.env.JWT_REFRESH_SECRET,
      CLIENT_URL_definida: !!process.env.CLIENT_URL,
    });

    // Em produção escuta em 0.0.0.0 para aceitar conexões externas
    // Em desenvolvimento usa 127.0.0.1 por segurança
    const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';

    // Abre a porta ANTES de conectar ao MongoDB: o Render detecta a porta aberta
    // e o healthcheck (/api/health) responde mesmo se o banco demorar a conectar,
    // evitando o ciclo "deploy falha -> reinicia -> cai".
    await new Promise((resolve) => servidor.listen(PORTA, HOST, resolve));
    logger.info(`Servidor GhostTalk rodando na porta ${PORTA} em modo ${process.env.NODE_ENV}`);

    await conectarBancoDeDados();
    logger.info('Conectado ao banco de dados com sucesso');

    // Inicia a limpeza periódica de mensagens com auto-destruição
    iniciarLimpezaMensagensExpiradas();
  } catch (erro) {
    logger.error('Falha ao iniciar o servidor:', erro.stack || erro.message);
    // Sai só se a falha for na inicialização; o Render reinicia o serviço
    process.exit(1);
  }
}

// ----------------------------------------------------------------
// Rede de segurança: uma falha isolada (ex.: promise sem catch num handler
// de socket) NÃO deve derrubar o servidor inteiro e desconectar todos os
// usuários. O erro é registrado com a stack para que a causa seja corrigida.
// ----------------------------------------------------------------
process.on('unhandledRejection', (motivo) => {
  logger.error('Rejeição não tratada:', motivo instanceof Error ? motivo.stack : motivo);
});

process.on('uncaughtException', (erro) => {
  logger.error('Exceção não capturada:', erro.stack || erro.message);
});

// Encerramento limpo quando o Render envia SIGTERM (novo deploy / reinício)
function encerrar(sinal) {
  logger.info(`${sinal} recebido — encerrando servidor`);
  servidor.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10000).unref();
}
process.on('SIGTERM', () => encerrar('SIGTERM'));
process.on('SIGINT', () => encerrar('SIGINT'));

iniciar();
