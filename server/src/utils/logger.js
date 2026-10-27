/**
 * GhostTalk — Logger estruturado com Winston
 * Registra eventos do servidor em formato JSON sem dados sensíveis.
 * Em produção, logs são gravados em arquivo. Em desenvolvimento, no console.
 */

const winston = require('winston');

const formatoLog = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  // Remove campos sensíveis dos logs automaticamente
  winston.format((info) => {
    delete info.senha;
    delete info.senhaHash;
    delete info.token;
    delete info.refreshToken;
    return info;
  })(),
  winston.format.json()
);

const transportes = [
  // Sempre loga no console em desenvolvimento
  ...(process.env.NODE_ENV !== 'production'
    ? [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
      ]
    : []),

  // Em produção, também salva em arquivo
  ...(process.env.NODE_ENV === 'production'
    ? [
        new winston.transports.File({
          filename: 'logs/erros.log',
          level: 'error',
          maxsize: 5242880, // 5 MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: 'logs/combinado.log',
          maxsize: 5242880,
          maxFiles: 5,
        }),
      ]
    : []),
];

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: formatoLog,
  transports: transportes,
  // Nunca expõe informação não tratada fora dos logs
  exitOnError: false,
});

module.exports = logger;
