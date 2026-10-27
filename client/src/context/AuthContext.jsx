/**
 * GhostTalk — Contexto de Autenticação
 * Gerencia o estado global do usuário logado, tokens JWT e operações de auth.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { gerarParDeChaves, obterParDeChaves, removerChavesLocais } from '../utils/criptografia';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // ----------------------------------------------------------------
  // Inicialização: verifica se há sessão ativa
  // ----------------------------------------------------------------
  useEffect(() => {
    const verificarSessao = async () => {
      const token = localStorage.getItem('ghosttalk_access_token');
      if (!token) {
        setCarregando(false);
        return;
      }

      try {
        const { data } = await api.get('/usuarios/perfil');
        setUsuario(data);
      } catch {
        // Token inválido — limpa tudo
        localStorage.removeItem('ghosttalk_access_token');
        localStorage.removeItem('ghosttalk_refresh_token');
      } finally {
        setCarregando(false);
      }
    };

    verificarSessao();
  }, []);

  // ----------------------------------------------------------------
  // Cadastro
  // ----------------------------------------------------------------
  const cadastrar = useCallback(async (dados) => {
    // Gera par de chaves E2EE no dispositivo antes de cadastrar
    const { chavePublica } = gerarParDeChaves();

    const { data } = await api.post('/auth/cadastro', {
      ...dados,
      chavePublica, // Envia APENAS a chave pública ao servidor
    });

    localStorage.setItem('ghosttalk_access_token', data.accessToken);
    localStorage.setItem('ghosttalk_refresh_token', data.refreshToken);
    setUsuario(data.usuario);

    toast.success('Conta criada! Bem-vindo ao GhostTalk 👻');
    return data;
  }, []);

  // ----------------------------------------------------------------
  // Login
  // ----------------------------------------------------------------
  const login = useCallback(async (credenciais) => {
    const { data } = await api.post('/auth/login', credenciais);

    // Se requer 2FA, retorna flag sem logar
    if (data.requer2FA) return data;

    localStorage.setItem('ghosttalk_access_token', data.accessToken);
    localStorage.setItem('ghosttalk_refresh_token', data.refreshToken);
    setUsuario(data.usuario);

    // Garante que o par de chaves está gerado no dispositivo
    if (!obterParDeChaves()) {
      const { chavePublica } = gerarParDeChaves();
      // Atualiza a chave pública no servidor (novo dispositivo)
      await api.patch('/usuarios/perfil', { chavePublica });
    }

    return data;
  }, []);

  // ----------------------------------------------------------------
  // Logout
  // ----------------------------------------------------------------
  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('ghosttalk_refresh_token');
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // Ignora erro — faz logout local de qualquer forma
    }

    localStorage.removeItem('ghosttalk_access_token');
    localStorage.removeItem('ghosttalk_refresh_token');
    setUsuario(null);
  }, []);

  // ----------------------------------------------------------------
  // Logout de todos os dispositivos
  // ----------------------------------------------------------------
  const logoutTodosDispositivos = useCallback(async () => {
    try {
      await api.post('/auth/logout-todos');
    } catch {
      // Continua o logout local
    }
    localStorage.removeItem('ghosttalk_access_token');
    localStorage.removeItem('ghosttalk_refresh_token');
    setUsuario(null);
    toast.success('Sessão encerrada em todos os dispositivos');
  }, []);

  // ----------------------------------------------------------------
  // Atualizar perfil local
  // ----------------------------------------------------------------
  const atualizarUsuario = useCallback((dadosAtualizados) => {
    setUsuario((prev) => ({ ...prev, ...dadosAtualizados }));
  }, []);

  const valor = {
    usuario,
    carregando,
    cadastrar,
    login,
    logout,
    logoutTodosDispositivos,
    atualizarUsuario,
  };

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

/**
 * Hook para acessar o contexto de autenticação.
 */
export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return contexto;
}
