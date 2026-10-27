/**
 * GhostTalk — Rotas de Mensagens
 */

const express = require('express');
const { body, param } = require('express-validator');
const roteador = express.Router();
const { autenticar } = require('../middleware/autenticacao');
const {
  enviarMensagem,
  buscarMensagens,
  marcarComoLidas,
  apagarMensagem,
  fixarMensagem,
  reagirMensagem,
} = require('../controllers/mensagensController');

// POST /api/mensagens — Enviar mensagem (fallback REST)
roteador.post(
  '/',
  autenticar,
  [
    body('conversaId').isMongoId().withMessage('ID de conversa inválido'),
    body('conteudoCriptografado').notEmpty().withMessage('Conteúdo é obrigatório'),
    body('nonce').notEmpty().withMessage('Nonce é obrigatório'),
  ],
  enviarMensagem
);

// GET /api/mensagens/:conversaId — Histórico paginado
roteador.get('/:conversaId', autenticar, buscarMensagens);

// PATCH /api/mensagens/:conversaId/lidas — Marcar como lidas
roteador.patch('/:conversaId/lidas', autenticar, marcarComoLidas);

// DELETE /api/mensagens/:mensagemId — Apagar mensagem
roteador.delete('/:mensagemId', autenticar, apagarMensagem);

// PATCH /api/mensagens/:mensagemId/fixar — Fixar/desafixar
roteador.patch('/:mensagemId/fixar', autenticar, fixarMensagem);

// POST /api/mensagens/:mensagemId/reacao — Reagir com emoji
roteador.post(
  '/:mensagemId/reacao',
  autenticar,
  [body('emoji').notEmpty().withMessage('Emoji é obrigatório')],
  reagirMensagem
);

module.exports = roteador;
