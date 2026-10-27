/**
 * GhostTalk — Middleware de Rate Limiting
 * Proteção contra ataques de força bruta e abuso da API.
 * Utiliza express-rate-limit com janelas de tempo configuráveis.
 */

const rateLimit = require('express-rate-limit');

// ----------------------------------------------------------------
// Rate limiter global: proteção geral contra abuso
// ----------------------------------------------------------------
const rateLimiterGlobal = rateLimit({
  windowMs: 60 * 1000, // Janela de 1 minuto
  max: 200,            // Máximo 200 requisições por minuto por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas requisições. Tente novamente em instantes.' },
  // Não expõe informações do IP nos headers
  skipFailedRequests: false,
});

// ----------------------------------------------------------------
// Rate limiter para rotas de autenticação (login/cadastro)
// Máximo de 5 tentativas por minuto por IP — requisito de segurança
// ----------------------------------------------------------------
const rateLimiterAuth = rateLimit({
  windowMs: parseInt(process.env.LOGIN_WINDOW_MS, 10) || 60 * 1000,
  max: parseInt(process.env.LOGIN_MAX_ATTEMPTS, 10) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    erro: 'Muitas tentativas de autenticação. Aguarde 1 minuto e tente novamente.',
  },
  // Conta apenas requisições que retornaram erro (tentativas falhas)
  skipSuccessfulRequests: true,
});

// ----------------------------------------------------------------
// Rate limiter para upload de arquivos
// ----------------------------------------------------------------
const rateLimiterUpload = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // 20 uploads por minuto
  message: { erro: 'Limite de uploads atingido. Tente novamente em 1 minuto.' },
});

module.exports = {
  rateLimiterGlobal,
  rateLimiterAuth,
  rateLimiterUpload,
};
