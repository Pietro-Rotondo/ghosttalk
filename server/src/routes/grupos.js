/**
 * GhostTalk — Rotas de Grupos e Conversas
 * Criação, listagem e gerenciamento de conversas individuais e em grupo.
 */

const express = require('express');
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const roteador = express.Router();
const { autenticar } = require('../middleware/autenticacao');
const Conversa = require('../models/Conversa');
const Usuario = require('../models/Usuario');
const logger = require('../utils/logger');

// GET /api/grupos/conversas — Listar todas as conversas do usuário
roteador.get('/conversas', autenticar, async (req, res) => {
  try {
    const conversas = await Conversa.find({
      'participantes.usuarioId': req.usuarioId,
    })
      .populate('participantes.usuarioId', 'nomeUsuario nomeExibicao fotoPerfil online ultimaAtividade')
      .populate('ultimaMensagem')
      .sort({ updatedAt: -1 });

    res.json({ conversas });
  } catch (erro) {
    logger.error('Erro ao listar conversas:', erro.message);
    res.status(500).json({ erro: 'Erro ao buscar conversas' });
  }
});

// POST /api/grupos/individual — Iniciar ou recuperar conversa 1-a-1
roteador.post(
  '/individual',
  autenticar,
  [body('destinatarioId').isMongoId().withMessage('ID de destinatário inválido')],
  async (req, res) => {
    try {
      const { destinatarioId } = req.body;

      if (destinatarioId === req.usuarioId) {
        return res.status(400).json({ erro: 'Não é possível conversar consigo mesmo' });
      }

      // Verifica se o destinatário existe
      const destinatario = await Usuario.findById(destinatarioId);
      if (!destinatario) {
        return res.status(404).json({ erro: 'Usuário não encontrado' });
      }

      // Busca conversa existente entre os dois usuários
      let conversa = await Conversa.findOne({
        tipo: 'individual',
        'participantes.usuarioId': { $all: [req.usuarioId, destinatarioId] },
      }).populate('participantes.usuarioId', 'nomeUsuario nomeExibicao fotoPerfil online');

      // Se não existe, cria nova conversa
      if (!conversa) {
        conversa = new Conversa({
          tipo: 'individual',
          participantes: [
            { usuarioId: req.usuarioId, papel: 'membro' },
            { usuarioId: destinatarioId, papel: 'membro' },
          ],
        });
        await conversa.save();
        await conversa.populate('participantes.usuarioId', 'nomeUsuario nomeExibicao fotoPerfil online');
      }

      res.json({ conversa });
    } catch (erro) {
      logger.error('Erro ao criar conversa individual:', erro.message);
      res.status(500).json({ erro: 'Erro ao iniciar conversa' });
    }
  }
);

// POST /api/grupos — Criar novo grupo
roteador.post(
  '/',
  autenticar,
  [
    body('nome').trim().isLength({ min: 1, max: 100 }).withMessage('Nome do grupo é obrigatório'),
    body('participantesIds').isArray({ min: 1 }).withMessage('Adicione pelo menos 1 participante'),
  ],
  async (req, res) => {
    try {
      const { nome, descricao, participantesIds } = req.body;

      // Remove duplicatas e inclui o criador como administrador
      const idsUnicos = [...new Set([...participantesIds])].filter(
        (id) => id !== req.usuarioId
      );

      const participantes = [
        { usuarioId: req.usuarioId, papel: 'administrador' },
        ...idsUnicos.map((id) => ({ usuarioId: id, papel: 'membro' })),
      ];

      const grupo = new Conversa({
        tipo: 'grupo',
        participantes,
        grupo: { nome, descricao },
      });

      await grupo.save();
      await grupo.populate('participantes.usuarioId', 'nomeUsuario nomeExibicao fotoPerfil');

      logger.info(`Grupo criado: ${nome} por ${req.usuarioId}`);
      res.status(201).json({ conversa: grupo });
    } catch (erro) {
      logger.error('Erro ao criar grupo:', erro.message);
      res.status(500).json({ erro: 'Erro ao criar grupo' });
    }
  }
);

// POST /api/grupos/:conversaId/convite — Gerar link de sala temporária
roteador.post('/convite', autenticar, async (req, res) => {
  try {
    const { expiracaoHoras = 24, destruirAposUso = false } = req.body;

    const codigoConvite = uuidv4();
    const expiracao = new Date(Date.now() + expiracaoHoras * 60 * 60 * 1000);

    // Cria uma sala temporária sem participantes fixos
    const sala = new Conversa({
      tipo: 'grupo',
      participantes: [{ usuarioId: req.usuarioId, papel: 'administrador' }],
      grupo: { nome: `Sala temporária` },
      temporaria: {
        ativa: true,
        codigoConvite,
        expiraEm: expiracao,
        destruirAposUso,
      },
    });

    await sala.save();

    res.status(201).json({
      codigoConvite,
      linkConvite: `${process.env.CLIENT_URL}/convite/${codigoConvite}`,
      expiraEm: expiracao,
    });
  } catch (erro) {
    logger.error('Erro ao gerar convite:', erro.message);
    res.status(500).json({ erro: 'Erro ao gerar link de convite' });
  }
});

// POST /api/grupos/entrar/:codigoConvite — Entrar em sala temporária
roteador.post('/entrar/:codigoConvite', autenticar, async (req, res) => {
  try {
    const { codigoConvite } = req.params;

    const sala = await Conversa.findOne({
      'temporaria.codigoConvite': codigoConvite,
      'temporaria.ativa': true,
      'temporaria.expiraEm': { $gt: new Date() },
    });

    if (!sala) {
      return res.status(404).json({ erro: 'Link de convite inválido ou expirado' });
    }

    // Adiciona o usuário se ainda não estiver na sala
    const jaParticipante = sala.participantes.some(
      (p) => p.usuarioId.toString() === req.usuarioId
    );

    if (!jaParticipante) {
      sala.participantes.push({ usuarioId: req.usuarioId, papel: 'membro' });
      await sala.save();
    }

    // Destrói a sala após o primeiro uso se configurado
    if (sala.temporaria.destruirAposUso && sala.participantes.length >= 2) {
      sala.temporaria.ativa = false;
      await sala.save();
    }

    res.json({ conversa: sala });
  } catch (erro) {
    logger.error('Erro ao entrar na sala:', erro.message);
    res.status(500).json({ erro: 'Erro ao entrar na sala' });
  }
});

// PATCH /api/grupos/:conversaId/auto-destruicao — Configurar auto-destruição
roteador.patch('/:conversaId/auto-destruicao', autenticar, async (req, res) => {
  try {
    const { duracaoSegundos } = req.body; // 0 = desabilitado

    const conversa = await Conversa.findOne({
      _id: req.params.conversaId,
      'participantes.usuarioId': req.usuarioId,
    });

    if (!conversa) {
      return res.status(403).json({ erro: 'Acesso negado' });
    }

    conversa.autoDestruicaoPadrao = duracaoSegundos || 0;
    await conversa.save();

    res.json({ mensagem: 'Configuração de auto-destruição atualizada', duracaoSegundos });
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao configurar auto-destruição' });
  }
});

module.exports = roteador;
