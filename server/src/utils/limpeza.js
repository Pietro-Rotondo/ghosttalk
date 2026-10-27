/**
 * GhostTalk — Limpeza periódica de dados temporários
 * Remove salas temporárias expiradas e faz manutenção geral.
 * As mensagens expiradas são removidas automaticamente pelo TTL do MongoDB.
 */

const Conversa = require('../models/Conversa');
const logger = require('./logger');

/**
 * Remove salas temporárias que expiraram.
 */
async function limparSalasExpiradas() {
  try {
    const resultado = await Conversa.deleteMany({
      'temporaria.ativa': true,
      'temporaria.expiraEm': { $lt: new Date() },
    });

    if (resultado.deletedCount > 0) {
      logger.info(`Limpeza: ${resultado.deletedCount} sala(s) temporária(s) removida(s)`);
    }
  } catch (erro) {
    logger.error('Erro na limpeza de salas temporárias:', erro.message);
  }
}

/**
 * Inicia o processo periódico de limpeza.
 * Intervalo configurável via CLEANUP_INTERVAL_MS (padrão: 1 hora).
 */
function iniciarLimpezaMensagensExpiradas() {
  const intervalo = parseInt(process.env.CLEANUP_INTERVAL_MS, 10) || 60 * 60 * 1000;

  // Executa imediatamente ao iniciar
  limparSalasExpiradas();

  // Agenda execuções periódicas
  setInterval(limparSalasExpiradas, intervalo);

  logger.info(`Limpeza automática agendada a cada ${intervalo / 1000}s`);
}

module.exports = { iniciarLimpezaMensagensExpiradas, limparSalasExpiradas };
