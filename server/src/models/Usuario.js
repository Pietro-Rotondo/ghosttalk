/**
 * GhostTalk — Modelo de Usuário (MongoDB / Mongoose)
 * Define o esquema do usuário com todos os campos necessários
 * para autenticação, perfil e configurações de privacidade.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12; // Custo do bcrypt — mínimo 12 conforme requisitos de segurança

const esquemaUsuario = new mongoose.Schema(
  {
    // Nome de usuário único, usado para login e identificação
    nomeUsuario: {
      type: String,
      required: [true, 'Nome de usuário é obrigatório'],
      trim: true,
      lowercase: true,
      minlength: [3, 'Nome de usuário deve ter no mínimo 3 caracteres'],
      maxlength: [30, 'Nome de usuário deve ter no máximo 30 caracteres'],
      match: [
        /^[a-z0-9_.-]+$/,
        'Nome de usuário pode conter apenas letras minúsculas, números, _, . e -',
      ],
    },

    // E-mail opcional — usado apenas para recuperação de conta
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'E-mail inválido'],
    },

    // Senha armazenada como hash bcrypt — NUNCA em texto puro
    senhaHash: {
      type: String,
      required: true,
      select: false, // Nunca retorna a senha em consultas padrão
    },

    // Nome de exibição customizável (diferente do nomeUsuario)
    nomeExibicao: {
      type: String,
      trim: true,
      maxlength: [50, 'Nome de exibição deve ter no máximo 50 caracteres'],
    },

    // Status personalizado do usuário
    status: {
      type: String,
      default: 'Disponível',
      maxlength: [100, 'Status deve ter no máximo 100 caracteres'],
    },

    // URL da foto de perfil
    fotoPerfil: {
      type: String,
      default: null,
    },

    // Chave pública do usuário para criptografia E2EE
    // A chave privada NUNCA é enviada ao servidor
    chavePublica: {
      type: String,
      default: null,
    },

    // Configuração de 2FA com TOTP
    doisFatores: {
      ativo: { type: Boolean, default: false },
      segredo: { type: String, select: false }, // Segredo TOTP nunca retornado por padrão
      backupCodes: { type: [String], select: false },
    },

    // Lista de refresh tokens válidos (suporta múltiplos dispositivos)
    refreshTokens: {
      type: [
        {
          token: String,
          dispositivo: String,
          criadoEm: { type: Date, default: Date.now },
          expiresAt: Date,
        },
      ],
      select: false,
    },

    // Configurações de privacidade do usuário
    privacidade: {
      perfilInvisivel: { type: Boolean, default: false },
      mostrarStatus: { type: Boolean, default: true },
      mostrarFotoPerfil: { type: Boolean, default: true },
    },

    // Preferências de interface
    preferencias: {
      tema: { type: String, enum: ['escuro', 'claro'], default: 'escuro' },
      idiomaNotificacoes: { type: String, default: 'pt-BR' },
    },

    // Indica se o usuário está online (atualizado pelo Socket.IO)
    online: { type: Boolean, default: false },

    // Data/hora da última atividade
    ultimaAtividade: { type: Date, default: Date.now },

    // Usuário está ativo (false = conta desativada)
    ativo: { type: Boolean, default: true },
  },
  {
    timestamps: true, // Cria automaticamente createdAt e updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----------------------------------------------------------------
// Hook: hash da senha antes de salvar
// ----------------------------------------------------------------
esquemaUsuario.pre('save', async function (proximo) {
  // Só faz o hash se a senha foi modificada
  if (!this.isModified('senhaHash')) return proximo();

  try {
    this.senhaHash = await bcrypt.hash(this.senhaHash, SALT_ROUNDS);
    proximo();
  } catch (erro) {
    proximo(erro);
  }
});

// ----------------------------------------------------------------
// Método de instância: verifica se a senha está correta
// ----------------------------------------------------------------
esquemaUsuario.methods.verificarSenha = async function (senhaTexto) {
  return bcrypt.compare(senhaTexto, this.senhaHash);
};

// ----------------------------------------------------------------
// Método de instância: retorna dados públicos do perfil
// ----------------------------------------------------------------
esquemaUsuario.methods.toPerfilPublico = function () {
  return {
    id: this._id,
    nomeUsuario: this.nomeUsuario,
    nomeExibicao: this.nomeExibicao || this.nomeUsuario,
    status: this.status,
    fotoPerfil: this.fotoPerfil,
    chavePublica: this.chavePublica,
    online: this.online,
    ultimaAtividade: this.ultimaAtividade,
  };
};

// Índices para buscas eficientes (definidos apenas aqui para evitar duplicatas)
esquemaUsuario.index({ nomeUsuario: 1 }, { unique: true });
esquemaUsuario.index({ email: 1 }, { unique: true, sparse: true });

const Usuario = mongoose.model('Usuario', esquemaUsuario);

module.exports = Usuario;
