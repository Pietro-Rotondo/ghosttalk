/**
 * GhostTalk — Controller de Mensagens
 * Salva, busca e gerencia mensagens criptografadas.
 * O servidor NUNCA lê o conteúdo das mensagens — armazena apenas o blob cifrado.
 */

const { validationResult } = require('express-validator');
const Mensagem = require('../models/Mensagem');
const Conversa = require('../models/Conversa');
const logger = require('../utils/logger');

// ----------------------------------------------------------------
// Enviar mensagem (fallback REST — geralmente via Socket.IO)
// ----------------------------------------------------------------
async function enviarMensagem(req, res) {
  try {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
      return res.status(400).json({ erros: erros.array() });
    }

    const { conversaId, conteudoCriptografado, nonce, tipo, metadadosArquivo, respostaParaMensagemId, expiraEm } = req.body;

    // Verifica se o usuário é participante da conversa
    const conversa = await Conversa.findOne({
      _id: conversaId,
      'participantes.usuarioId': req.usuarioId,
    });

    if (!conversa) {
      return res.status(403).json({ erro: 'Você não é participante desta conversa' });
    }

    // Calcula data de expiração se auto-destruição estiver configurada
    let dataExpiracao = null;
    const duracaoDestruicao = expiraEm || conversa.autoDestruicaoPadrao;
    if (duracaoDestruicao > 0) {
      dataExpiracao = new Date(Date.now() + duracaoDestruicao * 1000);
    }

    const novaMensagem = new Mensagem({
      conversaId,
      remetenteId: req.usuarioId,
      conteudoCriptografado,
      nonce,
      tipo: tipo || 'texto',
      metadadosArquivo: metadadosArquivo || undefined,
      respostaParaMensagemId: respostaParaMensagemId || null,
      expiraEm: dataExpiracao,
      // Prepara status de entrega para todos os participantes
      statusEntrega: conversa.participantes
        .filter((p) => p.usuarioId.toString() !== req.usuarioId)
        .map((p) => ({ usuarioId: p.usuarioId, entregue: false, lido: false })),
    });

    await novaMensagem.save();

    // Atualiza a última mensagem da conversa
    await Conversa.findByIdAndUpdate(conversaId, {
      $set: { ultimaMensagem: novaMensagem._id },
    });

    res.status(201).json({ mensagem: await novaMensagem.populate('remetenteId', 'nomeUsuario nomeExibicao fotoPerfil chavePublica') });
  } catch (erro) {
    logger.error('Erro ao enviar mensagem:', erro.message);
    res.status(500).json({ erro: 'Erro ao enviar mensagem' });
  }
}

// ----------------------------------------------------------------
// Buscar histórico de mensagens de uma conversa (paginado)
// ----------------------------------------------------------------
async function buscarMensagens(req, res) {
  try {
    const { conversaId } = req.params;
    const pagina = parseInt(req.query.pagina, 10) || 1;
    const limite = Math.min(parseInt(req.query.limite, 10) || 50, 100);
    const skip = (pagina - 1) * limite;

    // Verifica participação
    const conversa = await Conversa.findOne({
      _id: conversaId,
      'participantes.usuarioId': req.usuarioId,
    });

    if (!conversa) {
      return res.status(403).json({ erro: 'Acesso negado a esta conversa' });
    }

    const mensagens = await Mensagem.find({
      conversaId,
      apagada: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limite)
      // chavePublica necessária para descriptografar no cliente (E2EE)
      .populate('remetenteId', 'nomeUsuario nomeExibicao fotoPerfil chavePublica')
      .populate('respostaParaMensagemId', 'conteudoCriptografado nonce tipo remetenteId');

    const total = await Mensagem.countDocuments({ conversaId, apagada: false });

    res.json({
      mensagens: mensagens.reverse(), // Retorna em ordem cronológica
      paginacao: {
        pagina,
        limite,
        total,
        totalPaginas: Math.ceil(total / limite),
      },
    });
  } catch (erro) {
    logger.error('Erro ao buscar mensagens:', erro.message);
    res.status(500).json({ erro: 'Erro ao buscar mensagens' });
  }
}

// ----------------------------------------------------------------
// Marcar mensagens como lidas
// ----------------------------------------------------------------
async function marcarComoLidas(req, res) {
  try {
    const { conversaId } = req.params;

    await Mensagem.updateMany(
      {
        conversaId,
        'statusEntrega.usuarioId': req.usuarioId,
        'statusEntrega.lido': false,
      },
      {
        $set: {
          'statusEntrega.$[elem].lido': true,
          'statusEntrega.$[elem].lidoEm': new Date(),
        },
      },
      {
        arrayFilters: [{ 'elem.usuarioId': req.usuarioId }],
      }
    );

    res.json({ mensagem: 'Mensagens marcadas como lidas' });
  } catch (erro) {
    logger.error('Erro ao marcar como lidas:', erro.message);
    res.status(500).json({ erro: 'Erro ao atualizar leitura' });
  }
}

// ----------------------------------------------------------------
// Apagar mensagem (apenas o remetente pode apagar)
// ----------------------------------------------------------------
async function apagarMensagem(req, res) {
  try {
    const { mensagemId } = req.params;

    const mensagem = await Mensagem.findOne({
      _id: mensagemId,
      remetenteId: req.usuarioId,
    });

    if (!mensagem) {
      return res.status(404).json({ erro: 'Mensagem não encontrada ou sem permissão' });
    }

    mensagem.apagada = true;
    mensagem.apagadaEm = new Date();
    mensagem.conteudoCriptografado = '';
    mensagem.nonce = '';
    await mensagem.save();

    res.json({ mensagem: 'Mensagem apagada com sucesso' });
  } catch (erro) {
    logger.error('Erro ao apagar mensagem:', erro.message);
    res.status(500).json({ erro: 'Erro ao apagar mensagem' });
  }
}

// ----------------------------------------------------------------
// Fixar/desafixar mensagem no topo
// ----------------------------------------------------------------
async function fixarMensagem(req, res) {
  try {
    const { mensagemId } = req.params;
    const { fixar } = req.body;

    // Apenas administradores de grupo ou participantes de chat individual podem fixar
    const mensagem = await Mensagem.findById(mensagemId);
    if (!mensagem) {
      return res.status(404).json({ erro: 'Mensagem não encontrada' });
    }

    const conversa = await Conversa.findOne({
      _id: mensagem.conversaId,
      'participantes.usuarioId': req.usuarioId,
    });

    if (!conversa) {
      return res.status(403).json({ erro: 'Sem permissão' });
    }

    // Em grupos, apenas administradores podem fixar
    if (conversa.tipo === 'grupo') {
      const participante = conversa.participantes.find(
        (p) => p.usuarioId.toString() === req.usuarioId
      );
      if (participante?.papel !== 'administrador') {
        return res.status(403).json({ erro: 'Apenas administradores podem fixar mensagens' });
      }
    }

    mensagem.fixada = !!fixar;
    await mensagem.save();

    res.json({ mensagem: `Mensagem ${fixar ? 'fixada' : 'desafixada'} com sucesso` });
  } catch (erro) {
    logger.error('Erro ao fixar mensagem:', erro.message);
    res.status(500).json({ erro: 'Erro ao fixar mensagem' });
  }
}

// ----------------------------------------------------------------
// Adicionar/remover reação em mensagem
// ----------------------------------------------------------------
async function reagirMensagem(req, res) {
  try {
    const { mensagemId } = req.params;
    const { emoji } = req.body;

    const mensagem = await Mensagem.findById(mensagemId);
    if (!mensagem) {
      return res.status(404).json({ erro: 'Mensagem não encontrada' });
    }

    // Remove reação existente do usuário com esse emoji, ou adiciona
    const indiceReacao = mensagem.reacoes.findIndex(
      (r) => r.usuarioId.toString() === req.usuarioId && r.emoji === emoji
    );

    if (indiceReacao > -1) {
      mensagem.reacoes.splice(indiceReacao, 1); // Toggle: remove se já existia
    } else {
      mensagem.reacoes.push({ emoji, usuarioId: req.usuarioId });
    }

    await mensagem.save();
    res.json({ reacoes: mensagem.reacoes });
  } catch (erro) {
    logger.error('Erro ao reagir à mensagem:', erro.message);
    res.status(500).json({ erro: 'Erro ao adicionar reação' });
  }
}

module.exports = {
  enviarMensagem,
  buscarMensagens,
  marcarComoLidas,
  apagarMensagem,
  fixarMensagem,
  reagirMensagem,
};
