/**
 * GhostTalk — Cliente HTTP (Axios)
 * Configura interceptors para inclusão automática do JWT
 * e renovação transparente do access token quando expirado.
 */

import axios from 'axios';

// URL base da API — usa proxy em desenvolvimento
const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ----------------------------------------------------------------
// Interceptor de requisição: adiciona o Bearer token
// ----------------------------------------------------------------
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ghosttalk_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (erro) => Promise.reject(erro)
);

// ----------------------------------------------------------------
// Interceptor de resposta: renova o token automaticamente
// ----------------------------------------------------------------
let renovandoToken = false;
let filaRenovacao = [];

api.interceptors.response.use(
  (resposta) => resposta,
  async (erro) => {
    const requisicaoOriginal = erro.config;

    // Se o erro é de token expirado e ainda não tentamos renovar
    if (
      erro.response?.status === 401 &&
      erro.response?.data?.codigo === 'TOKEN_EXPIRADO' &&
      !requisicaoOriginal._renovado
    ) {
      requisicaoOriginal._renovado = true;

      // Se já está renovando, coloca na fila
      if (renovandoToken) {
        return new Promise((resolve, reject) => {
          filaRenovacao.push({ resolve, reject });
        }).then((novoToken) => {
          requisicaoOriginal.headers.Authorization = `Bearer ${novoToken}`;
          return api(requisicaoOriginal);
        });
      }

      renovandoToken = true;

      try {
        const refreshToken = localStorage.getItem('ghosttalk_refresh_token');
        if (!refreshToken) throw new Error('Sem refresh token');

        const { data } = await axios.post('/api/auth/refresh', { refreshToken });

        localStorage.setItem('ghosttalk_access_token', data.accessToken);
        localStorage.setItem('ghosttalk_refresh_token', data.refreshToken);

        // Processa a fila de requisições pendentes
        filaRenovacao.forEach(({ resolve }) => resolve(data.accessToken));
        filaRenovacao = [];

        requisicaoOriginal.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(requisicaoOriginal);
      } catch (erroRenovacao) {
        // Refresh falhou — desloga o usuário
        filaRenovacao.forEach(({ reject }) => reject(erroRenovacao));
        filaRenovacao = [];
        localStorage.removeItem('ghosttalk_access_token');
        localStorage.removeItem('ghosttalk_refresh_token');
        window.location.href = '/login';
        return Promise.reject(erroRenovacao);
      } finally {
        renovandoToken = false;
      }
    }

    return Promise.reject(erro);
  }
);

export default api;
