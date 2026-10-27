/**
 * GhostTalk — Utilitário de Exportação de Histórico
 * Exporta conversas nos formatos JSON, TXT e HTML.
 * O arquivo exportado pode ser opcionalmente criptografado com senha.
 */

import { criptografarComSenha } from './criptografia';
import { formatarDataCompleta } from './formatacao';

/**
 * Prepara os dados de uma conversa para exportação.
 *
 * @param {object} conversa - Objeto da conversa
 * @param {Array} mensagens - Array de mensagens descriptografadas
 * @param {string} nomeUsuarioAtual - Nome do usuário logado
 * @returns {object} Dados estruturados para exportação
 */
function prepararDadosExportacao(conversa, mensagens, nomeUsuarioAtual) {
  return {
    metadados: {
      app: 'GhostTalk',
      versao: '1.0.0',
      exportadoEm: new Date().toISOString(),
      exportadoPor: nomeUsuarioAtual,
      conversa: {
        id: conversa._id,
        tipo: conversa.tipo,
        nome:
          conversa.tipo === 'grupo'
            ? conversa.grupo?.nome
            : conversa.participantes
                .map((p) => p.usuarioId?.nomeExibicao || p.usuarioId?.nomeUsuario)
                .filter((n) => n !== nomeUsuarioAtual)
                .join(', '),
        totalMensagens: mensagens.length,
      },
    },
    mensagens: mensagens.map((m) => ({
      id: m._id,
      remetente: m.remetenteId?.nomeExibicao || m.remetenteId?.nomeUsuario || 'Desconhecido',
      conteudo: m.textoDescriptografado || '[mensagem criptografada]',
      tipo: m.tipo,
      enviadaEm: m.createdAt,
      editada: m.editada || false,
      apagada: m.apagada || false,
    })),
  };
}

// ----------------------------------------------------------------
// Exportação em JSON
// ----------------------------------------------------------------

/**
 * Exporta o histórico em formato JSON estruturado.
 */
export async function exportarComoJSON(conversa, mensagens, nomeUsuarioAtual, senha = null) {
  const dados = prepararDadosExportacao(conversa, mensagens, nomeUsuarioAtual);
  let conteudo = JSON.stringify(dados, null, 2);

  if (senha) {
    conteudo = await criptografarComSenha(conteudo, senha);
    baixarArquivo(conteudo, `ghosttalk-${Date.now()}.json.enc`, 'text/plain');
  } else {
    baixarArquivo(conteudo, `ghosttalk-${Date.now()}.json`, 'application/json');
  }
}

// ----------------------------------------------------------------
// Exportação em TXT
// ----------------------------------------------------------------

/**
 * Exporta o histórico em formato texto legível.
 */
export async function exportarComoTXT(conversa, mensagens, nomeUsuarioAtual, senha = null) {
  const dados = prepararDadosExportacao(conversa, mensagens, nomeUsuarioAtual);

  const linhas = [
    `========================================`,
    `GhostTalk — Exportação de Conversa`,
    `========================================`,
    `Exportado em: ${formatarDataCompleta(dados.metadados.exportadoEm)}`,
    `Exportado por: ${dados.metadados.exportadoPor}`,
    `Conversa: ${dados.metadados.conversa.nome}`,
    `Total de mensagens: ${dados.metadados.conversa.totalMensagens}`,
    `========================================`,
    '',
    ...dados.mensagens.map((m) => {
      if (m.apagada) return `[${formatarDataCompleta(m.enviadaEm)}] ${m.remetente}: [mensagem apagada]`;
      return `[${formatarDataCompleta(m.enviadaEm)}] ${m.remetente}: ${m.conteudo}`;
    }),
    '',
    '--- Fim do histórico ---',
  ];

  let conteudo = linhas.join('\n');

  if (senha) {
    conteudo = await criptografarComSenha(conteudo, senha);
    baixarArquivo(conteudo, `ghosttalk-${Date.now()}.txt.enc`, 'text/plain');
  } else {
    baixarArquivo(conteudo, `ghosttalk-${Date.now()}.txt`, 'text/plain');
  }
}

// ----------------------------------------------------------------
// Exportação em HTML
// ----------------------------------------------------------------

/**
 * Exporta o histórico em formato HTML com visual do chat.
 */
export async function exportarComoHTML(conversa, mensagens, nomeUsuarioAtual, senha = null) {
  const dados = prepararDadosExportacao(conversa, mensagens, nomeUsuarioAtual);

  const mensagensHTML = dados.mensagens
    .map((m) => {
      const ePropia = m.remetente === nomeUsuarioAtual;
      const alinhamento = ePropia ? 'flex-end' : 'flex-start';
      const corFundo = ePropia ? '#7c3aed' : '#2b2d31';
      const conteudo = m.apagada ? '<em style="opacity:0.6">[mensagem apagada]</em>' : escapeHtml(m.conteudo);

      return `
      <div style="display:flex;justify-content:${alinhamento};margin-bottom:8px;">
        <div style="max-width:70%;background:${corFundo};color:#fff;padding:8px 12px;border-radius:12px;font-size:14px;">
          ${!ePropia ? `<div style="font-size:11px;font-weight:600;color:#a78bfa;margin-bottom:4px;">${escapeHtml(m.remetente)}</div>` : ''}
          <div>${conteudo}</div>
          <div style="font-size:10px;opacity:0.6;text-align:right;margin-top:4px;">${formatarDataCompleta(m.enviadaEm)}</div>
        </div>
      </div>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GhostTalk — ${escapeHtml(dados.metadados.conversa.nome || 'Histórico')}</title>
  <style>
    body { font-family: Inter, system-ui, sans-serif; background:#1e1f22; color:#dcddde; margin:0; padding:20px; }
    .cabecalho { background:#2b2d31; border-radius:12px; padding:16px; margin-bottom:20px; border:1px solid #3f4147; }
    .chat { max-width:700px; margin:0 auto; }
    h1 { font-size:18px; color:#a78bfa; margin:0 0 8px; }
    p { font-size:13px; color:#96989d; margin:2px 0; }
  </style>
</head>
<body>
  <div class="chat">
    <div class="cabecalho">
      <h1>👻 GhostTalk — Histórico de Conversa</h1>
      <p>Conversa: <strong>${escapeHtml(dados.metadados.conversa.nome || '')}</strong></p>
      <p>Exportado em: ${formatarDataCompleta(dados.metadados.exportadoEm)}</p>
      <p>Total de mensagens: ${dados.metadados.conversa.totalMensagens}</p>
    </div>
    ${mensagensHTML}
  </div>
</body>
</html>`;

  if (senha) {
    const htmlCriptografado = await criptografarComSenha(html, senha);
    baixarArquivo(htmlCriptografado, `ghosttalk-${Date.now()}.html.enc`, 'text/plain');
  } else {
    baixarArquivo(html, `ghosttalk-${Date.now()}.html`, 'text/html');
  }
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/**
 * Cria e dispara o download de um arquivo no navegador.
 */
function baixarArquivo(conteudo, nomeArquivo, tipo) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escapa caracteres especiais HTML para prevenir XSS no arquivo exportado.
 */
function escapeHtml(texto) {
  if (!texto) return '';
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
