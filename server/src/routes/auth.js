/**
 * GhostTalk — Rotas de Autenticação
 * Expõe os endpoints de cadastro, login, refresh e 2FA.
 */

const express = require('express');
const { body } = require('express-validator');
const roteador = express.Router();

const {
  cadastrar,
  login,
  refreshToken,
  logout,
  logoutTodosdispositivos,
  configurar2FA,
  ativar2FA,
  desativar2FA,
} = require('../controllers/authController');

const { autenticar } = require('../middleware/autenticacao');
const { rateLimiterAuth } = require('../middleware/rateLimiter');

// ----------------------------------------------------------------
// Validações de entrada
// ----------------------------------------------------------------

// Validação para cadastro
const validarCadastro = [
  body('nomeUsuario')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Nome de usuário deve ter entre 3 e 30 caracteres')
    .matches(/^[a-z0-9_.-]+$/)
    .withMessage('Nome de usuário inválido'),

  body('senha')
    .isLength({ min: 8 })
    .withMessage('Senha deve ter no mínimo 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Senha deve conter letras maiúsculas, minúsculas e números'),

  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .isEmail()
    .withMessage('E-mail inválido')
    .normalizeEmail(),
];

// Validação para login
const validarLogin = [
  body('nomeUsuario').trim().notEmpty().withMessage('Nome de usuário é obrigatório'),
  body('senha').notEmpty().withMessage('Senha é obrigatória'),
];

// ----------------------------------------------------------------
// Rotas públicas (com rate limiting de autenticação)
// ----------------------------------------------------------------

// POST /api/auth/cadastro
roteador.post('/cadastro', rateLimiterAuth, validarCadastro, cadastrar);

// POST /api/auth/login
roteador.post('/login', rateLimiterAuth, validarLogin, login);

// POST /api/auth/refresh
roteador.post('/refresh', refreshToken);

// ----------------------------------------------------------------
// Rotas protegidas (requerem autenticação)
// ----------------------------------------------------------------

// POST /api/auth/logout
roteador.post('/logout', autenticar, logout);

// POST /api/auth/logout-todos
roteador.post('/logout-todos', autenticar, logoutTodosdispositivos);

// POST /api/auth/2fa/configurar — Gera QR Code para configurar 2FA
roteador.post('/2fa/configurar', autenticar, configurar2FA);

// POST /api/auth/2fa/ativar — Confirma o código e ativa o 2FA
roteador.post(
  '/2fa/ativar',
  autenticar,
  [body('codigoTotp').isLength({ min: 6, max: 6 }).withMessage('Código TOTP deve ter 6 dígitos')],
  ativar2FA
);

// POST /api/auth/2fa/desativar
roteador.post('/2fa/desativar', autenticar, desativar2FA);

module.exports = roteador;
