/**
 * GhostTalk — Política de origens permitidas (CORS)
 * Usada pelo Express e pelo Socket.IO para manter a mesma regra nos dois.
 */

const origensConfiguradas = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);

/**
 * Retorna true se a origem pode acessar a API.
 * Requisições sem header Origin (healthcheck do Render, curl, servidor-a-servidor)
 * não são requisições de navegador — CORS não se aplica a elas e não é um
 * mecanismo de autenticação, então são aceitas.
 */
function origemPermitida(origem) {
  if (!origem) return true;

  if (process.env.NODE_ENV === 'development' && origem.endsWith('.trycloudflare.com')) {
    return true;
  }

  // Qualquer subdomínio do Render (deploy do frontend)
  if (origem.endsWith('.onrender.com')) return true;

  return origensConfiguradas.includes(origem);
}

/**
 * Callback no formato esperado pela opção `origin` do pacote `cors` e do Socket.IO.
 * Origem negada NÃO gera erro (que viraria HTTP 500): apenas não recebe os headers CORS.
 */
function verificarOrigem(origem, callback) {
  callback(null, origemPermitida(origem));
}

module.exports = { origemPermitida, verificarOrigem, origensConfiguradas };
