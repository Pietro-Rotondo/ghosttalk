/**
 * GhostTalk — Rotas de Usuários
 */

const express = require('express');
const { body } = require('express-validator');
const roteador = express.Router();
const { autenticar } = require('../middleware/autenticacao');
const Usuario = require('../models/Usuario');
const logger = require('../utils/logger');

// GET /api/usuarios/perfil — Perfil do usuário logado
roteador.get('/perfil', autenticar, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuarioId);
    res.json(usuario.toPerfilPublico());
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao buscar perfil' });
  }
});

// PATCH /api/usuarios/perfil — Atualizar perfil
roteador.patch(
  '/perfil',
  autenticar,
  [
    body('nomeExibicao').optional().trim().isLength({ max: 50 }),
    body('status').optional().trim().isLength({ max: 100 }),
  ],
  async (req, res) => {
    try {
      const { nomeExibicao, status, privacidade, preferencias, chavePublica } = req.body;

      const atualizacao = {};
      if (nomeExibicao !== undefined) atualizacao.nomeExibicao = nomeExibicao;
      if (status !== undefined) atualizacao.status = status;
      if (privacidade !== undefined) atualizacao.privacidade = privacidade;
      if (preferencias !== undefined) atualizacao.preferencias = preferencias;
      if (chavePublica !== undefined) atualizacao.chavePublica = chavePublica;

      const usuario = await Usuario.findByIdAndUpdate(
        req.usuarioId,
        { $set: atualizacao },
        { new: true }
      );

      res.json(usuario.toPerfilPublico());
    } catch (erro) {
      logger.error('Erro ao atualizar perfil:', erro.message);
      res.status(500).json({ erro: 'Erro ao atualizar perfil' });
    }
  }
);

// GET /api/usuarios/buscar?q=nome — Buscar usuários por nome
roteador.get('/buscar', autenticar, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ usuarios: [] });
    }

    // Escape para regex seguro
    const termoBusca = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const usuarios = await Usuario.find({
      nomeUsuario: { $regex: termoBusca, $options: 'i' },
      ativo: true,
      _id: { $ne: req.usuarioId }, // Não retorna o próprio usuário
      'privacidade.perfilInvisivel': false,
    })
      .limit(20)
      .select('nomeUsuario nomeExibicao fotoPerfil status online');

    res.json({ usuarios: usuarios.map((u) => u.toPerfilPublico()) });
  } catch (erro) {
    logger.error('Erro na busca de usuários:', erro.message);
    res.status(500).json({ erro: 'Erro ao buscar usuários' });
  }
});

// GET /api/usuarios/:nomeUsuario — Perfil público de um usuário
roteador.get('/:nomeUsuario', autenticar, async (req, res) => {
  try {
    const usuario = await Usuario.findOne({
      nomeUsuario: req.params.nomeUsuario.toLowerCase(),
      ativo: true,
    });

    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    // Respeita configuração de perfil invisível
    if (usuario.privacidade.perfilInvisivel) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    res.json(usuario.toPerfilPublico());
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao buscar usuário' });
  }
});

module.exports = roteador;
