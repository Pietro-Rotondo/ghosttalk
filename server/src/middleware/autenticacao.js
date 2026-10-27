/**
 * GhostTalk — Middleware de Autenticação JWT
 * Verifica o access token em cada requisição protegida.
 * Garante que o usuário está autenticado antes de acessar recursos.
 */

const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const logger = require('../utils/logger');

/**
 * Middleware: verifica e valida o JWT no header Authorization.
 * Injeta `req.usuarioId` e `req.usuario` para uso nas rotas.
 */
async function autenticar(req, res, next) {
  try {
    const cabecalho = req.headers.authorization;

    if (!cabecalho || !cabecalho.startsWith('Bearer ')) {
      return res.status(401).json({ erro: 'Token de autenticação ausente' });
    }

    const token = cabecalho.split(' ')[1];

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (erroJwt) {
      if (erroJwt.name === 'TokenExpiredError') {
        return res.status(401).json({ erro: 'Token expirado', codigo: 'TOKEN_EXPIRADO' });
      }
      return res.status(401).json({ erro: 'Token inválido' });
    }

    // Busca o usuário no banco para confirmar que ainda está ativo
    const usuario = await Usuario.findById(payload.usuarioId).select('+refreshTokens');

    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ erro: 'Usuário não encontrado ou inativo' });
    }

    // Injeta os dados do usuário na requisição
    req.usuarioId = usuario._id.toString();
    req.usuario = usuario;

    next();
  } catch (erro) {
    logger.error('Erro no middleware de autenticação:', erro.message);
    res.status(500).json({ erro: 'Erro interno na autenticação' });
  }
}

/**
 * Middleware opcional: verifica autenticação mas não bloqueia se ausente.
 * Usado em rotas que funcionam com ou sem usuário logado.
 */
async function autenticarOpcional(req, res, next) {
  const cabecalho = req.headers.authorization;

  if (!cabecalho || !cabecalho.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = cabecalho.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findById(payload.usuarioId);

    if (usuario && usuario.ativo) {
      req.usuarioId = usuario._id.toString();
      req.usuario = usuario;
    }
  } catch {
    // Ignora erro — continua sem usuário autenticado
  }

  next();
}

module.exports = { autenticar, autenticarOpcional };
