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
const Mensagem = require('../models/Mensagem');
const Usuario = require('../models/Usuario');
const logger = require('../utils/logger');

// GET /api/grupos/conversas — Listar todas as conversas do usuário
roteador.get('/conversas', autenticar, async (req, res) => {
  try {
    const conversas = await Conversa.find({
      'participantes.usuarioId': req.usuarioId,
    })
      // chavePublica é essencial para a criptografia E2EE no frontend
      .populate('participantes.usuarioId', 'nomeUsuario nomeExibicao fotoPerfil online ultimaAtividade chavePublica status')
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

      const destinatario = await Usuario.findById(destinatarioId);
      if (!destinatario) {
        return res.status(404).json({ erro: 'Usuário não encontrado' });
      }

      let conversa = await Conversa.findOne({
        tipo: 'individual',
        'participantes.usuarioId': { $all: [req.usuarioId, destinatarioId] },
      }).populate('participantes.usuarioId', 'nomeUsuario nomeExibicao fotoPerfil online chavePublica status ultimaAtividade');

      if (!conversa) {
        conversa = new Conversa({
          tipo: 'individual',
          participantes: [
            { usuarioId: req.usuarioId, papel: 'membro' },
            { usuarioId: destinatarioId, papel: 'membro' },
          ],
        });
        await conversa.save();
        await conversa.populate('participantes.usuarioId', 'nomeUsuario nomeExibicao fotoPerfil online chavePublica status ultimaAtividade');
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
      await grupo.populate('participantes.usuarioId', 'nomeUsuario nomeExibicao fotoPerfil chavePublica status');

      logger.info(`Grupo criado: ${nome} por ${req.usuarioId}`);
      res.status(201).json({ conversa: grupo });
    } catch (erro) {
      logger.error('Erro ao criar grupo:', erro.message);
      res.status(500).json({ erro: 'Erro ao criar grupo' });
    }
  }
);

// PATCH /api/grupos/:conversaId — Editar grupo (apenas admins)
roteador.patch('/:conversaId', autenticar, async (req, res) => {
  try {
    const { nome, descricao } = req.body;

    const conversa = await Conversa.findOne({
      _id: req.params.conversaId,
      tipo: 'grupo',
      'participantes': {
        $elemMatch: { usuarioId: req.usuarioId, papel: 'administrador' },
      },
    });

    if (!conversa) {
      return res.status(403).json({ erro: 'Sem permissão ou grupo não encontrado' });
    }

    if (nome !== undefined) conversa.grupo.nome = nome;
    if (descricao !== undefined) conversa.grupo.descricao = descricao;
    await conversa.save();

    res.json({ mensagem: 'Grupo atualizado', conversa });
  } catch (erro) {
    logger.error('Erro ao editar grupo:', erro.message);
    res.status(500).json({ erro: 'Erro ao editar grupo' });
  }
});

// PATCH /api/grupos/:conversaId/admin — Promover/rebaixar admin
roteador.patch('/:conversaId/admin', autenticar, async (req, res) => {
  try {
    const { participanteId, promover } = req.body;

    const conversa = await Conversa.findOne({
      _id: req.params.conversaId,
      tipo: 'grupo',
      'participantes': {
        $elemMatch: { usuarioId: req.usuarioId, papel: 'administrador' },
      },
    });

    if (!conversa) {
      return res.status(403).json({ erro: 'Sem permissão' });
    }

    const participante = conversa.participantes.find(
      (p) => p.usuarioId.toString() === participanteId
    );

    if (!participante) {
      return res.status(404).json({ erro: 'Participante não encontrado' });
    }

    participante.papel = promover ? 'administrador' : 'membro';
    await conversa.save();

    res.json({ mensagem: `Participante ${promover ? 'promovido' : 'rebaixado'}` });
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao alterar admin' });
  }
});

// DELETE /api/grupos/:conversaId/participante/:participanteId — Remover membro
roteador.delete('/:conversaId/participante/:participanteId', autenticar, async (req, res) => {
  try {
    const conversa = await Conversa.findOne({
      _id: req.params.conversaId,
      tipo: 'grupo',
      'participantes': {
        $elemMatch: { usuarioId: req.usuarioId, papel: 'administrador' },
      },
    });

    if (!conversa) {
      return res.status(403).json({ erro: 'Sem permissão' });
    }

    // Não pode remover a si mesmo por aqui
    if (req.params.participanteId === req.usuarioId) {
      return res.status(400).json({ erro: 'Use a opção de sair do grupo' });
    }

    conversa.participantes = conversa.participantes.filter(
      (p) => p.usuarioId.toString() !== req.params.participanteId
    );
    await conversa.save();

    res.json({ mensagem: 'Participante removido' });
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao remover participante' });
  }
});

// DELETE /api/grupos/:conversaId — Excluir grupo (apenas admins) ou conversa individual
roteador.delete('/:conversaId', autenticar, async (req, res) => {
  try {
    const conversa = await Conversa.findOne({
      _id: req.params.conversaId,
      'participantes.usuarioId': req.usuarioId,
    });

    if (!conversa) {
      return res.status(404).json({ erro: 'Conversa não encontrada' });
    }

    // Grupos: apenas admins podem excluir
    if (conversa.tipo === 'grupo') {
      const participante = conversa.participantes.find(
        (p) => p.usuarioId.toString() === req.usuarioId
      );
      if (participante?.papel !== 'administrador') {
        return res.status(403).json({ erro: 'Apenas administradores podem excluir o grupo' });
      }
    }

    // Remove todas as mensagens e a conversa
    await Mensagem.deleteMany({ conversaId: conversa._id });
    await conversa.deleteOne();

    logger.info(`Conversa excluída: ${conversa._id} por ${req.usuarioId}`);
    res.json({ mensagem: 'Conversa excluída' });
  } catch (erro) {
    logger.error('Erro ao excluir conversa:', erro.message);
    res.status(500).json({ erro: 'Erro ao excluir conversa' });
  }
});

// DELETE /api/grupos/conversa/:conversaId — Alias para apagar conversa individual
roteador.delete('/conversa/:conversaId', autenticar, async (req, res) => {
  try {
    const conversa = await Conversa.findOne({
      _id: req.params.conversaId,
      'participantes.usuarioId': req.usuarioId,
    });

    if (!conversa) {
      return res.status(404).json({ erro: 'Conversa não encontrada' });
    }

    await Mensagem.deleteMany({ conversaId: conversa._id });
    await conversa.deleteOne();

    res.json({ mensagem: 'Conversa apagada' });
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao apagar conversa' });
  }
});

// POST /api/grupos/convite — Gerar link de sala temporária
roteador.post('/convite', autenticar, async (req, res) => {
  try {
    const { expiracaoHoras = 24, destruirAposUso = false } = req.body;

    const codigoConvite = uuidv4();
    const expiracao = new Date(Date.now() + expiracaoHoras * 60 * 60 * 1000);

    const sala = new Conversa({
      tipo: 'grupo',
      participantes: [{ usuarioId: req.usuarioId, papel: 'administrador' }],
      grupo: { nome: 'Sala temporária' },
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

    const jaParticipante = sala.participantes.some(
      (p) => p.usuarioId.toString() === req.usuarioId
    );

    if (!jaParticipante) {
      sala.participantes.push({ usuarioId: req.usuarioId, papel: 'membro' });
      await sala.save();
    }

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

// PATCH /api/grupos/:conversaId/auto-destruicao
roteador.patch('/:conversaId/auto-destruicao', autenticar, async (req, res) => {
  try {
    const { duracaoSegundos } = req.body;

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
