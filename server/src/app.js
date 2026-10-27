/**
 * GhostTalk — Configuração principal do Express
 * Define middlewares globais, rotas e tratamento de erros.
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const { rateLimiterGlobal } = require('./middleware/rateLimiter');
const { verificarOrigem, origensConfiguradas } = require('./utils/origensPermitidas');
const logger = require('./utils/logger');

const rotasAuth = require('./routes/auth');
const rotasUsuarios = require('./routes/usuarios');
const rotasMensagens = require('./routes/mensagens');
const rotasGrupos = require('./routes/grupos');
const rotasUpload = require('./routes/upload');

const app = express();

// Health check — registrado ANTES de CORS/rate limit para que o healthcheck
// do Render nunca seja bloqueado (ele não envia header Origin).
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    servico: 'GhostTalk API',
    timestamp: new Date().toISOString(),
  });
});

// ----------------------------------------------------------------
// Segurança: headers HTTP com Helmet
// ----------------------------------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", ...origensConfiguradas],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// ----------------------------------------------------------------
// CORS — apenas origens autorizadas (regra em utils/origensPermitidas.js)
// ----------------------------------------------------------------
app.use(
  cors({
    origin: verificarOrigem,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ----------------------------------------------------------------
// Middlewares gerais
// ----------------------------------------------------------------
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Log de requisições (desabilitado em testes)
if (process.env.NODE_ENV !== 'test') {
  // Formato personalizado sem dados sensíveis
  app.use(
    morgan(':method :url :status :response-time ms', {
      skip: (req) => req.url.startsWith('/uploads'),
    })
  );
}

// Rate limiter global (proteção contra DDoS / abuso)
app.use(rateLimiterGlobal);

// Servir arquivos de upload localmente (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
}

// ----------------------------------------------------------------
// Rotas da API
// ----------------------------------------------------------------
app.use('/api/auth', rotasAuth);
app.use('/api/usuarios', rotasUsuarios);
app.use('/api/mensagens', rotasMensagens);
app.use('/api/grupos', rotasGrupos);
app.use('/api/upload', rotasUpload);

// ----------------------------------------------------------------
// Tratamento de rota não encontrada (404)
// ----------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

// ----------------------------------------------------------------
// Tratamento global de erros
// ----------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((erro, req, res, next) => {
  const status = erro.status || 500;
  // Registra o erro real no servidor (o cliente só recebe mensagem genérica)
  logger.error('Erro não tratado na requisição:', `${req.method} ${req.path} -> ${erro.stack || erro.message}`);

  // Em produção, não expõe detalhes internos do erro
  const mensagem =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Erro interno do servidor'
      : erro.message;

  res.status(status).json({ erro: mensagem });
});

module.exports = app;
