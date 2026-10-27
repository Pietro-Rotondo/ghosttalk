/**
 * GhostTalk — Gerenciador de WebSocket (Socket.IO)
 * Responsável por: entrega de mensagens em tempo real, indicadores de
 * digitação, status online/offline e confirmações de leitura.
 *
 * Todos os eventos de mensagem recebem apenas o conteúdo já criptografado
 * pelo cliente — o servidor retransmite sem inspecionar o conteúdo.
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const Mensagem = require('../models/Mensagem');
const Conversa = require('../models/Conversa');
const logger = require('../utils/logger');

// Mapeia usuarioId -> Set de socket IDs (suporte a múltiplos dispositivos)
const usuariosConectados = new Map();

/**
 * Inicializa o servidor Socket.IO e registra todos os handlers de eventos.
 * @param {import('http').Server} servidor - Servidor HTTP do Express
 */
function inicializarSocket(servidor) {
  const io = new Server(servidor, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Ping para manter conexões ativas (detecta desconexões)
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ----------------------------------------------------------------
  // Middleware de autenticação do Socket.IO
  // Verifica o JWT antes de qualquer conexão
  // ----------------------------------------------------------------
  io.use(async (socket, proximo) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return proximo(new Error('Token de autenticação ausente'));
      }

      let payload;
      try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
      } catch {
        return proximo(new Error('Token inválido'));
      }

      const usuario = await Usuario.findById(payload.usuarioId);
      if (!usuario || !usuario.ativo) {
        return proximo(new Error('Usuário não encontrado'));
      }

      // Injeta dados do usuário no socket
      socket.usuarioId = usuario._id.toString();
      socket.nomeUsuario = usuario.nomeUsuario;

      proximo();
    } catch (erro) {
      proximo(new Error('Erro de autenticação'));
    }
  });

  // ----------------------------------------------------------------
  // Conexão estabelecida
  // ----------------------------------------------------------------
  io.on('connection', async (socket) => {
    const { usuarioId } = socket;

    logger.info(`Usuário conectado via Socket.IO: ${usuarioId} (socket: ${socket.id})`);

    // Registra o socket do usuário no mapa de conectados
    if (!usuariosConectados.has(usuarioId)) {
      usuariosConectados.set(usuarioId, new Set());
    }
    usuariosConectados.get(usuarioId).add(socket.id);

    // Entra automaticamente nas salas das conversas do usuário
    const conversas = await Conversa.find({
      'participantes.usuarioId': usuarioId,
    }).select('_id');

    conversas.forEach((c) => socket.join(c._id.toString()));

    // Marca usuário como online e notifica seus contatos
    await Usuario.findByIdAndUpdate(usuarioId, {
      $set: { online: true, ultimaAtividade: new Date() },
    });
    socket.broadcast.emit('usuarioOnline', { usuarioId });

    // ----------------------------------------------------------------
    // Evento: enviar mensagem em tempo real
    // ----------------------------------------------------------------
    socket.on('enviarMensagem', async (dados, callback) => {
      try {
        const {
          conversaId,
          conteudoCriptografado,
          nonce,
          tipo = 'texto',
          metadadosArquivo,
          respostaParaMensagemId,
          tempId, // ID temporário gerado pelo cliente para reconciliação
        } = dados;

        // Verifica participação na conversa
        const conversa = await Conversa.findOne({
          _id: conversaId,
          'participantes.usuarioId': usuarioId,
        });

        if (!conversa) {
          return callback?.({ erro: 'Acesso negado a esta conversa' });
        }

        // Calcula expiração se auto-destruição estiver ativa
        let dataExpiracao = null;
        if (conversa.autoDestruicaoPadrao > 0) {
          dataExpiracao = new Date(Date.now() + conversa.autoDestruicaoPadrao * 1000);
        }

        // Persiste a mensagem (conteúdo criptografado — servidor não lê)
        const mensagem = new Mensagem({
          conversaId,
          remetenteId: usuarioId,
          conteudoCriptografado,
          nonce,
          tipo,
          metadadosArquivo,
          respostaParaMensagemId: respostaParaMensagemId || null,
          expiraEm: dataExpiracao,
          statusEntrega: conversa.participantes
            .filter((p) => p.usuarioId.toString() !== usuarioId)
            .map((p) => ({ usuarioId: p.usuarioId, entregue: false, lido: false })),
        });

        await mensagem.save();
        await mensagem.populate('remetenteId', 'nomeUsuario nomeExibicao fotoPerfil');

        // Atualiza última mensagem da conversa
        await Conversa.findByIdAndUpdate(conversaId, {
          $set: { ultimaMensagem: mensagem._id },
        });

        // Emite a mensagem para todos os participantes da sala
        io.to(conversaId).emit('novaMensagem', {
          ...mensagem.toJSON(),
          tempId, // Para o remetente reconciliar com o ID temporário
        });

        // Marca como entregue para participantes online
        const idsParticipantes = conversa.participantes
          .filter((p) => p.usuarioId.toString() !== usuarioId)
          .map((p) => p.usuarioId.toString());

        const entregues = [];
        for (const participanteId of idsParticipantes) {
          if (usuariosConectados.has(participanteId)) {
            entregues.push(participanteId);
          }
        }

        if (entregues.length > 0) {
          await Mensagem.updateOne(
            { _id: mensagem._id },
            {
              $set: {
                'statusEntrega.$[elem].entregue': true,
              },
            },
            { arrayFilters: [{ 'elem.usuarioId': { $in: entregues } }] }
          );

          // Notifica o remetente sobre a entrega
          socket.emit('mensagemEntregue', {
            mensagemId: mensagem._id,
            conversaId,
          });
        }

        callback?.({ sucesso: true, mensagemId: mensagem._id });
      } catch (erro) {
        logger.error('Erro ao processar mensagem via socket:', erro.message);
        callback?.({ erro: 'Erro ao enviar mensagem' });
      }
    });

    // ----------------------------------------------------------------
    // Evento: indicador de digitação
    // ----------------------------------------------------------------
    socket.on('digitando', ({ conversaId, digitando }) => {
      socket.to(conversaId).emit('usuarioDigitando', {
        usuarioId,
        nomeUsuario: socket.nomeUsuario,
        conversaId,
        digitando,
      });
    });

    // ----------------------------------------------------------------
    // Evento: marcar mensagens como lidas
    // ----------------------------------------------------------------
    socket.on('marcarComoLidas', async ({ conversaId }) => {
      try {
        await Mensagem.updateMany(
          {
            conversaId,
            'statusEntrega.usuarioId': usuarioId,
            'statusEntrega.lido': false,
          },
          {
            $set: {
              'statusEntrega.$[elem].lido': true,
              'statusEntrega.$[elem].lidoEm': new Date(),
            },
          },
          { arrayFilters: [{ 'elem.usuarioId': usuarioId }] }
        );

        // Notifica os outros participantes que as mensagens foram lidas
        socket.to(conversaId).emit('mensagensLidas', {
          conversaId,
          leitorId: usuarioId,
          lidoEm: new Date(),
        });
      } catch (erro) {
        logger.error('Erro ao marcar como lidas via socket:', erro.message);
      }
    });

    // ----------------------------------------------------------------
    // Evento: adicionar reação a uma mensagem
    // ----------------------------------------------------------------
    socket.on('adicionarReacao', async ({ mensagemId, emoji, conversaId }) => {
      try {
        const mensagem = await Mensagem.findById(mensagemId);
        if (!mensagem) return;

        const indice = mensagem.reacoes.findIndex(
          (r) => r.usuarioId.toString() === usuarioId && r.emoji === emoji
        );

        if (indice > -1) {
          mensagem.reacoes.splice(indice, 1);
        } else {
          mensagem.reacoes.push({ emoji, usuarioId });
        }

        await mensagem.save();

        // Propaga a atualização para todos na conversa
        io.to(conversaId).emit('reacaoAtualizada', {
          mensagemId,
          reacoes: mensagem.reacoes,
        });
      } catch (erro) {
        logger.error('Erro ao processar reação:', erro.message);
      }
    });

    // ----------------------------------------------------------------
    // Desconexão
    // ----------------------------------------------------------------
    socket.on('disconnect', async () => {
      logger.info(`Usuário desconectado: ${usuarioId} (socket: ${socket.id})`);

      // Remove este socket do mapa
      const sockets = usuariosConectados.get(usuarioId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          usuariosConectados.delete(usuarioId);

          // Só marca como offline se não há outros dispositivos conectados
          await Usuario.findByIdAndUpdate(usuarioId, {
            $set: { online: false, ultimaAtividade: new Date() },
          });
          socket.broadcast.emit('usuarioOffline', {
            usuarioId,
            ultimaAtividade: new Date(),
          });
        }
      }
    });
  });

  logger.info('Socket.IO inicializado com sucesso');
  return io;
}

/**
 * Verifica se um usuário tem pelo menos um socket ativo.
 */
function usuarioEstaOnline(usuarioId) {
  return usuariosConectados.has(usuarioId) && usuariosConectados.get(usuarioId).size > 0;
}

module.exports = { inicializarSocket, usuarioEstaOnline };
