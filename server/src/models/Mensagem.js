/**
 * GhostTalk — Modelo de Mensagem (MongoDB / Mongoose)
 * Armazena apenas o conteúdo JÁ CRIPTOGRAFADO pelo cliente.
 * O servidor nunca tem acesso ao texto original da mensagem.
 */

const mongoose = require('mongoose');

const esquemaReacao = new mongoose.Schema(
  {
    emoji: { type: String, required: true },
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  },
  { _id: false }
);

const esquemaMensagem = new mongoose.Schema(
  {
    // ID da conversa (individual ou grupo) à qual esta mensagem pertence
    conversaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversa',
      required: true,
      index: true,
    },

    // Remetente da mensagem
    remetenteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },

    // Conteúdo criptografado (Base64 ou hex da cifra E2EE)
    // O servidor armazena apenas esse blob opaco
    conteudoCriptografado: {
      type: String,
      required: true,
    },

    // Nonce usado na criptografia (necessário para descriptografar no cliente)
    nonce: {
      type: String,
      required: true,
    },

    // Tipo de conteúdo original (texto, imagem, arquivo, sticker)
    tipo: {
      type: String,
      enum: ['texto', 'imagem', 'arquivo', 'sticker', 'sistema'],
      default: 'texto',
    },

    // Metadados não-sensíveis do arquivo (nome, tamanho — sem conteúdo)
    metadadosArquivo: {
      nome: String,
      tamanho: Number,
      mimeType: String,
      url: String,
    },

    // Mensagem à qual esta está respondendo (reply/quote)
    respostaParaMensagemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mensagem',
      default: null,
    },

    // Reações com emojis dos participantes
    reacoes: [esquemaReacao],

    // Status de entrega/leitura por destinatário
    statusEntrega: [
      {
        usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
        entregue: { type: Boolean, default: false },
        lido: { type: Boolean, default: false },
        lidoEm: Date,
        _id: false,
      },
    ],

    // Mensagem fixada no topo do chat
    fixada: { type: Boolean, default: false },

    // Auto-destruição: data/hora em que a mensagem deve ser apagada
    // null = mensagem permanente
    expiraEm: {
      type: Date,
      default: null,
    },

    // Mensagem foi apagada pelo remetente
    apagada: { type: Boolean, default: false },
    apagadaEm: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Índice composto para busca eficiente de mensagens por conversa
esquemaMensagem.index({ conversaId: 1, createdAt: -1 });
// Índice TTL para auto-destruição de mensagens expiradas
esquemaMensagem.index({ expiraEm: 1 }, { expireAfterSeconds: 0, sparse: true });

const Mensagem = mongoose.model('Mensagem', esquemaMensagem);

module.exports = Mensagem;
