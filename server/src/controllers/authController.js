/**
 * GhostTalk — Controller de Autenticação
 * Gerencia cadastro, login, refresh de tokens e 2FA.
 * Segurança: bcrypt (salt ≥ 12), JWT de curta duração + refresh rotativo.
 */

const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const Usuario = require('../models/Usuario');
const logger = require('../utils/logger');

// ----------------------------------------------------------------
// Helpers para geração de tokens
// ----------------------------------------------------------------

/**
 * Gera um access token JWT de curta duração (15 minutos por padrão).
 */
function gerarAccessToken(usuarioId) {
  return jwt.sign(
    { usuarioId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

/**
 * Gera um refresh token JWT de longa duração.
 * Inclui um jti (ID único) para possibilitar revogação individual.
 */
function gerarRefreshToken(usuarioId) {
  const jti = uuidv4();
  const token = jwt.sign(
    { usuarioId, jti },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { token, jti };
}

/**
 * Calcula a data de expiração do refresh token a partir do payload JWT.
 */
function calcularExpiracaoRefresh(token) {
  const payload = jwt.decode(token);
  return new Date(payload.exp * 1000);
}

// ----------------------------------------------------------------
// Cadastro de novo usuário
// ----------------------------------------------------------------
async function cadastrar(req, res) {
  try {
    const { nomeUsuario, senha, email, nomeExibicao, chavePublica } = req.body;

    // Verifica se o nome de usuário já existe
    const usuarioExistente = await Usuario.findOne({ nomeUsuario: nomeUsuario.toLowerCase() });
    if (usuarioExistente) {
      return res.status(409).json({ erro: 'Nome de usuário já está em uso' });
    }

    // Verifica se o e-mail já existe (se fornecido)
    if (email) {
      const emailExistente = await Usuario.findOne({ email: email.toLowerCase() });
      if (emailExistente) {
        return res.status(409).json({ erro: 'E-mail já está em uso' });
      }
    }

    // Cria o usuário — a senha será hasheada pelo hook pre('save') do modelo
    const novoUsuario = new Usuario({
      nomeUsuario,
      senhaHash: senha, // Será hasheada automaticamente
      email: email || undefined,
      nomeExibicao: nomeExibicao || nomeUsuario,
      chavePublica: chavePublica || null,
    });

    await novoUsuario.save();

    // Gera tokens para login automático após o cadastro
    const accessToken = gerarAccessToken(novoUsuario._id);
    const { token: refreshToken, jti } = gerarRefreshToken(novoUsuario._id);

    // Salva o refresh token vinculado ao dispositivo
    const dispositivoInfo = req.headers['user-agent'] || 'desconhecido';
    await Usuario.findByIdAndUpdate(novoUsuario._id, {
      $push: {
        refreshTokens: {
          token: refreshToken,
          dispositivo: dispositivoInfo.substring(0, 200),
          expiresAt: calcularExpiracaoRefresh(refreshToken),
        },
      },
    });

    logger.info(`Novo usuário cadastrado: ${nomeUsuario}`);

    res.status(201).json({
      mensagem: 'Conta criada com sucesso',
      accessToken,
      refreshToken,
      usuario: novoUsuario.toPerfilPublico(),
    });
  } catch (erro) {
    logger.error('Erro no cadastro:', erro.message);
    res.status(500).json({ erro: 'Erro ao criar conta' });
  }
}

// ----------------------------------------------------------------
// Login
// ----------------------------------------------------------------
async function login(req, res) {
  try {
    const { nomeUsuario, senha, codigoTotp } = req.body;

    // Busca usuário incluindo a senha (campo select: false por padrão)
    const usuario = await Usuario.findOne({
      nomeUsuario: nomeUsuario.toLowerCase(),
    }).select('+senhaHash +doisFatores.ativo +doisFatores.segredo +refreshTokens');

    if (!usuario || !usuario.ativo) {
      // Mensagem genérica para não revelar se o usuário existe
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    // Verifica a senha
    const senhaCorreta = await usuario.verificarSenha(senha);
    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    // Verifica 2FA se estiver ativo
    if (usuario.doisFatores.ativo) {
      if (!codigoTotp) {
        return res.status(200).json({
          requer2FA: true,
          mensagem: 'Informe o código do autenticador',
        });
      }

      const codigoValido = authenticator.verify({
        token: codigoTotp,
        secret: usuario.doisFatores.segredo,
      });

      if (!codigoValido) {
        return res.status(401).json({ erro: 'Código 2FA inválido' });
      }
    }

    // Gera novos tokens
    const accessToken = gerarAccessToken(usuario._id);
    const { token: refreshToken } = gerarRefreshToken(usuario._id);

    // Remove refresh tokens expirados e adiciona o novo
    const agora = new Date();
    const dispositivoInfo = req.headers['user-agent'] || 'desconhecido';

    await Usuario.findByIdAndUpdate(usuario._id, {
      $pull: { refreshTokens: { expiresAt: { $lt: agora } } },
    });

    await Usuario.findByIdAndUpdate(usuario._id, {
      $push: {
        refreshTokens: {
          token: refreshToken,
          dispositivo: dispositivoInfo.substring(0, 200),
          expiresAt: calcularExpiracaoRefresh(refreshToken),
        },
      },
      $set: { ultimaAtividade: agora },
    });

    logger.info(`Login realizado: ${nomeUsuario}`);

    res.json({
      accessToken,
      refreshToken,
      usuario: usuario.toPerfilPublico(),
    });
  } catch (erro) {
    logger.error('Erro no login:', erro.message);
    res.status(500).json({ erro: 'Erro ao realizar login' });
  }
}

// ----------------------------------------------------------------
// Refresh de Access Token
// ----------------------------------------------------------------
async function refreshToken(req, res) {
  try {
    const { refreshToken: tokenRecebido } = req.body;

    if (!tokenRecebido) {
      return res.status(401).json({ erro: 'Refresh token ausente' });
    }

    let payload;
    try {
      payload = jwt.verify(tokenRecebido, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ erro: 'Refresh token inválido ou expirado' });
    }

    // Verifica se o refresh token existe na lista do usuário (prevenção de reutilização)
    const usuario = await Usuario.findById(payload.usuarioId).select('+refreshTokens');

    if (!usuario) {
      return res.status(401).json({ erro: 'Usuário não encontrado' });
    }

    const tokenSalvo = usuario.refreshTokens.find((t) => t.token === tokenRecebido);
    if (!tokenSalvo) {
      // Token não encontrado — possível reutilização após revogação
      // Revoga todos os tokens do usuário como medida de segurança
      await Usuario.findByIdAndUpdate(payload.usuarioId, {
        $set: { refreshTokens: [] },
      });
      logger.warn(`Possível reutilização de refresh token detectada para usuário: ${payload.usuarioId}`);
      return res.status(401).json({ erro: 'Sessão inválida. Faça login novamente.' });
    }

    // Gera novos tokens (rotação de refresh token)
    const novoAccessToken = gerarAccessToken(usuario._id);
    const { token: novoRefreshToken } = gerarRefreshToken(usuario._id);

    // Substitui o refresh token antigo pelo novo
    await Usuario.findByIdAndUpdate(usuario._id, {
      $pull: { refreshTokens: { token: tokenRecebido } },
    });
    await Usuario.findByIdAndUpdate(usuario._id, {
      $push: {
        refreshTokens: {
          token: novoRefreshToken,
          dispositivo: tokenSalvo.dispositivo,
          expiresAt: calcularExpiracaoRefresh(novoRefreshToken),
        },
      },
    });

    res.json({
      accessToken: novoAccessToken,
      refreshToken: novoRefreshToken,
    });
  } catch (erro) {
    logger.error('Erro ao renovar token:', erro.message);
    res.status(500).json({ erro: 'Erro ao renovar sessão' });
  }
}

// ----------------------------------------------------------------
// Logout (dispositivo atual)
// ----------------------------------------------------------------
async function logout(req, res) {
  try {
    const { refreshToken: tokenRecebido } = req.body;

    if (tokenRecebido) {
      // Remove apenas o refresh token do dispositivo atual
      await Usuario.findByIdAndUpdate(req.usuarioId, {
        $pull: { refreshTokens: { token: tokenRecebido } },
      });
    }

    res.json({ mensagem: 'Logout realizado com sucesso' });
  } catch (erro) {
    logger.error('Erro no logout:', erro.message);
    res.status(500).json({ erro: 'Erro ao realizar logout' });
  }
}

// ----------------------------------------------------------------
// Logout remoto (todos os dispositivos)
// ----------------------------------------------------------------
async function logoutTodosdispositivos(req, res) {
  try {
    await Usuario.findByIdAndUpdate(req.usuarioId, {
      $set: { refreshTokens: [] },
    });

    logger.info(`Logout de todos os dispositivos: ${req.usuarioId}`);
    res.json({ mensagem: 'Sessão encerrada em todos os dispositivos' });
  } catch (erro) {
    logger.error('Erro no logout global:', erro.message);
    res.status(500).json({ erro: 'Erro ao encerrar sessões' });
  }
}

// ----------------------------------------------------------------
// Configurar 2FA — Passo 1: Gerar QR Code
// ----------------------------------------------------------------
async function configurar2FA(req, res) {
  try {
    const segredo = authenticator.generateSecret();
    const nomeServico = 'GhostTalk';
    const uri = authenticator.keyuri(req.usuario.nomeUsuario, nomeServico, segredo);

    // Gera QR Code em base64 para exibir no frontend
    const qrCodeBase64 = await qrcode.toDataURL(uri);

    // Salva o segredo temporariamente (ainda não ativado)
    await Usuario.findByIdAndUpdate(req.usuarioId, {
      $set: {
        'doisFatores.segredo': segredo,
        'doisFatores.ativo': false,
      },
    });

    res.json({
      segredo,
      qrCode: qrCodeBase64,
      instrucao: 'Escaneie o QR Code no seu autenticador (ex: Google Authenticator) e confirme com um código TOTP',
    });
  } catch (erro) {
    logger.error('Erro ao configurar 2FA:', erro.message);
    res.status(500).json({ erro: 'Erro ao configurar autenticação em dois fatores' });
  }
}

// ----------------------------------------------------------------
// Configurar 2FA — Passo 2: Verificar e Ativar
// ----------------------------------------------------------------
async function ativar2FA(req, res) {
  try {
    const { codigoTotp } = req.body;

    const usuario = await Usuario.findById(req.usuarioId).select(
      '+doisFatores.segredo +doisFatores.ativo'
    );

    if (!usuario.doisFatores.segredo) {
      return res.status(400).json({ erro: 'Configure o 2FA antes de ativar' });
    }

    const codigoValido = authenticator.verify({
      token: codigoTotp,
      secret: usuario.doisFatores.segredo,
    });

    if (!codigoValido) {
      return res.status(400).json({ erro: 'Código inválido. Verifique o horário do seu dispositivo.' });
    }

    await Usuario.findByIdAndUpdate(req.usuarioId, {
      $set: { 'doisFatores.ativo': true },
    });

    logger.info(`2FA ativado para usuário: ${req.usuarioId}`);
    res.json({ mensagem: 'Autenticação em dois fatores ativada com sucesso' });
  } catch (erro) {
    logger.error('Erro ao ativar 2FA:', erro.message);
    res.status(500).json({ erro: 'Erro ao ativar 2FA' });
  }
}

// ----------------------------------------------------------------
// Desativar 2FA
// ----------------------------------------------------------------
async function desativar2FA(req, res) {
  try {
    const { senha } = req.body;

    const usuario = await Usuario.findById(req.usuarioId).select('+senhaHash');
    const senhaCorreta = await usuario.verificarSenha(senha);

    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'Senha incorreta' });
    }

    await Usuario.findByIdAndUpdate(req.usuarioId, {
      $set: {
        'doisFatores.ativo': false,
        'doisFatores.segredo': null,
      },
    });

    res.json({ mensagem: 'Autenticação em dois fatores desativada' });
  } catch (erro) {
    logger.error('Erro ao desativar 2FA:', erro.message);
    res.status(500).json({ erro: 'Erro ao desativar 2FA' });
  }
}

module.exports = {
  cadastrar,
  login,
  refreshToken,
  logout,
  logoutTodosdispositivos,
  configurar2FA,
  ativar2FA,
  desativar2FA,
};
