/**
 * GhostTalk — Modelo de Conversa (MongoDB / Mongoose)
 * Representa tanto conversas individuais (1-a-1) quanto grupos.
 */

const mongoose = require('mongoose');

const esquemaConversa = new mongoose.Schema(
  {
    // Tipo de conversa: individual ou grupo
    tipo: {
      type: String,
      enum: ['individual', 'grupo'],
      required: true,
    },

    // Lista de participantes
    participantes: [
      {
        usuarioId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Usuario',
          required: true,
        },
        // Papel no grupo: membro ou administrador
        papel: {
          type: String,
          enum: ['membro', 'administrador'],
          default: 'membro',
        },
        // Data de entrada no grupo
        entradaEm: { type: Date, default: Date.now },
        // Membro foi silenciado por um administrador
        silenciado: { type: Boolean, default: false },
        // Notificações silenciadas pelo próprio usuário
        notificacoesSilenciadas: { type: Boolean, default: false },
        _id: false,
      },
    ],

    // Campos exclusivos de grupos
    grupo: {
      nome: { type: String, trim: true, maxlength: 100 },
      descricao: { type: String, trim: true, maxlength: 500 },
      fotoCapa: { type: String, default: null },
    },

    // Última mensagem (cache para exibição na lista de conversas)
    ultimaMensagem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mensagem',
      default: null,
    },

    // Fingerprint criptográfico da conversa para verificação de integridade E2EE
    // Exibido para os participantes confirmarem que não há interceptação
    fingerprintConversa: {
      type: String,
      default: null,
    },

    // Configuração de auto-destruição padrão para novas mensagens nesta conversa
    autoDestruicaoPadrao: {
      type: Number, // Duração em segundos (0 = desabilitado)
      default: 0,
    },

    // Sala temporária (gerada por link de convite com expiração)
    temporaria: {
      ativa: { type: Boolean, default: false },
      codigoConvite: { type: String, default: null },
      expiraEm: { type: Date, default: null },
      destruirAposUso: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Índice para buscar conversas de um usuário específico
esquemaConversa.index({ 'participantes.usuarioId': 1 });
// Índice para buscar sala temporária por código de convite
esquemaConversa.index({ 'temporaria.codigoConvite': 1 }, { sparse: true });

const Conversa = mongoose.model('Conversa', esquemaConversa);

module.exports = Conversa;
