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

const rotasAuth = require('./routes/auth');
const rotasUsuarios = require('./routes/usuarios');
const rotasMensagens = require('./routes/mensagens');
const rotasGrupos = require('./routes/grupos');
const rotasUpload = require('./routes/upload');

const app = express();

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
        connectSrc: ["'self'", process.env.CLIENT_URL],
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
// CORS — apenas origens autorizadas
// ----------------------------------------------------------------
// Origens permitidas: lista do .env + padrão trycloudflare (tunnels temporários)
const origensPermitidas = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((u) => u.trim());

app.use(
  cors({
    origin: (origem, callback) => {
      // Sem origem: permite em desenvolvimento (Postman, curl, etc.)
      if (!origem && process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      // Permite tunnels temporários do Cloudflare em desenvolvimento
      if (
        process.env.NODE_ENV === 'development' &&
        origem &&
        origem.endsWith('.trycloudflare.com')
      ) {
        return callback(null, true);
      }
      if (origensPermitidas.includes(origem)) {
        return callback(null, true);
      }
      callback(new Error('Origem não permitida pelo CORS'));
    },
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

// Health check — confirma que o servidor está no ar
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    servico: 'GhostTalk API',
    timestamp: new Date().toISOString(),
  });
});

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

  // Em produção, não expõe detalhes internos do erro
  const mensagem =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Erro interno do servidor'
      : erro.message;

  res.status(status).json({ erro: mensagem });
});

module.exports = app;
