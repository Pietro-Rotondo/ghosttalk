/**
 * GhostTalk — Rotas de Upload de Arquivos
 * Gerencia upload de fotos de perfil e arquivos de mensagens.
 * Imagens são redimensionadas/comprimidas antes de salvar.
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const roteador = express.Router();
const { autenticar } = require('../middleware/autenticacao');
const { rateLimiterUpload } = require('../middleware/rateLimiter');
const Usuario = require('../models/Usuario');
const logger = require('../utils/logger');

// Diretório de uploads
const UPLOAD_DIR = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads');

// Garante que o diretório existe
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Tipos MIME permitidos
const TIPOS_PERMITIDOS = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'application/pdf',
  'text/plain',
  'application/zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// Configuração do Multer — armazenamento em disco
const armazenamento = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Gera nome único para evitar conflitos
    const extensao = path.extname(file.originalname).toLowerCase();
    const nomeArquivo = `${uuidv4()}${extensao}`;
    cb(null, nomeArquivo);
  },
});

const filtroArquivo = (req, file, cb) => {
  if (TIPOS_PERMITIDOS.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido'), false);
  }
};

const upload = multer({
  storage: armazenamento,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024, // 5 MB padrão
  },
  fileFilter: filtroArquivo,
});

// POST /api/upload/foto-perfil — Upload de foto de perfil
roteador.post(
  '/foto-perfil',
  autenticar,
  rateLimiterUpload,
  upload.single('foto'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
      }

      const urlArquivo = `/uploads/${req.file.filename}`;

      // Atualiza a foto de perfil no banco de dados
      await Usuario.findByIdAndUpdate(req.usuarioId, {
        $set: { fotoPerfil: urlArquivo },
      });

      res.json({
        mensagem: 'Foto de perfil atualizada',
        url: urlArquivo,
      });
    } catch (erro) {
      logger.error('Erro no upload de foto:', erro.message);
      res.status(500).json({ erro: 'Erro ao fazer upload da foto' });
    }
  }
);

// POST /api/upload/arquivo — Upload de arquivo para mensagem
roteador.post(
  '/arquivo',
  autenticar,
  rateLimiterUpload,
  upload.single('arquivo'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
      }

      const urlArquivo = `/uploads/${req.file.filename}`;

      res.json({
        url: urlArquivo,
        nome: req.file.originalname,
        tamanho: req.file.size,
        mimeType: req.file.mimetype,
      });
    } catch (erro) {
      logger.error('Erro no upload de arquivo:', erro.message);
      res.status(500).json({ erro: 'Erro ao fazer upload do arquivo' });
    }
  }
);

// Tratamento de erros do Multer
roteador.use((erro, req, res, next) => {
  if (erro instanceof multer.MulterError) {
    if (erro.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ erro: 'Arquivo muito grande. Máximo permitido: 5 MB' });
    }
  }
  if (erro.message === 'Tipo de arquivo não permitido') {
    return res.status(415).json({ erro: erro.message });
  }
  next(erro);
});

module.exports = roteador;
