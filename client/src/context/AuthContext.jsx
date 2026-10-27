/**
 * GhostTalk — Contexto de Autenticação
 * Gerencia o estado global do usuário logado, tokens JWT e operações de auth.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { gerarParDeChaves, obterParDeChaves } from '../utils/criptografia';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

/**
 * Garante que o usuário tem chave pública registrada no servidor.
 * Chamada após login e verificação de sessão.
 */
async function garantirChavePublica(usuarioData, setUsuario) {
  const chavesLocais = obterParDeChaves();

  if (!chavesLocais) {
    // Dispositivo novo — gera um par de chaves e registra no servidor
    const { chavePublica } = gerarParDeChaves();
    try {
      await api.patch('/usuarios/perfil', { chavePublica });
      setUsuario((u) => ({ ...u, chavePublica }));
      console.info('[GhostTalk] Chave pública gerada e registrada:', chavePublica.slice(0, 16) + '...');
    } catch (e) {
      console.error('[GhostTalk] Falha ao registrar chave pública:', e.message);
    }
    return;
  }

  // Dispositivo já tem chaves — verifica se o servidor está atualizado
  if (!usuarioData.chavePublica || usuarioData.chavePublica !== chavesLocais.chavePublica) {
    try {
      await api.patch('/usuarios/perfil', { chavePublica: chavesLocais.chavePublica });
      setUsuario((u) => ({ ...u, chavePublica: chavesLocais.chavePublica }));
      console.info('[GhostTalk] Chave pública sincronizada com o servidor');
    } catch (e) {
      console.error('[GhostTalk] Falha ao sincronizar chave pública:', e.message);
    }
  }
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // ----------------------------------------------------------------
  // Inicialização: verifica se há sessão ativa e sincroniza chave
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
        // Garante chave pública sincronizada a cada carregamento da sessão
        await garantirChavePublica(data, setUsuario);
      } catch {
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
      chavePublica,
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

    if (data.requer2FA) return data;

    localStorage.setItem('ghosttalk_access_token', data.accessToken);
    localStorage.setItem('ghosttalk_refresh_token', data.refreshToken);
    setUsuario(data.usuario);

    // Garante chave pública após login
    await garantirChavePublica(data.usuario, setUsuario);

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

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return contexto;
}
