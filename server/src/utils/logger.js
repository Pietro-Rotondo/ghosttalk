/**
 * GhostTalk — Logger estruturado com Winston
 * Registra eventos do servidor em formato JSON sem dados sensíveis.
 * Em produção, logs são gravados em arquivo. Em desenvolvimento, no console.
 */

const winston = require('winston');

// O código usa logger.error('mensagem:', detalhe). O Winston descarta argumentos
// extras por padrão — aqui eles são anexados à mensagem para não perder a causa do erro.
const anexarArgumentosExtras = winston.format((info) => {
  const extras = info[Symbol.for('splat')];
  if (Array.isArray(extras) && extras.length > 0) {
    const texto = extras
      .map((e) => (e instanceof Error ? e.stack || e.message : typeof e === 'object' ? JSON.stringify(e) : String(e)))
      .join(' ');
    info.message = `${info.message} ${texto}`;
  }
  return info;
});

const formatoLog = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  anexarArgumentosExtras(),
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
  // Console em todos os ambientes: o Render captura stdout/stderr e é a única
  // forma de ver os logs (o disco é efêmero). Em produção sai em JSON.
  new winston.transports.Console({
    format:
      process.env.NODE_ENV === 'production'
        ? winston.format.json()
        : winston.format.combine(winston.format.colorize(), winston.format.simple()),
  }),

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
