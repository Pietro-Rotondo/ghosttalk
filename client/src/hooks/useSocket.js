/**
 * GhostTalk — Hook useSocket
 * Gerencia a conexão com o servidor Socket.IO.
 * Registra handlers para todos os eventos em tempo real.
 */

import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

let socketInstance = null; // Instância compartilhada (singleton)

/**
 * @param {boolean} conectar - Apenas UM chamador (PaginaChat) deve gerenciar a conexão.
 *   Os demais (ex.: AreaChat) passam `false` e só usam as funções de emissão.
 *   Antes, cada AreaChat montado abria mais um socket e vazava conexões.
 */
export function useSocket(conectar = true) {
  const { usuario } = useAuth();
  const {
    adicionarMensagem,
    atualizarDigitando,
    despacharMensagens,
  } = useChat();

  const socketRef = useRef(null);

  // ----------------------------------------------------------------
  // Conecta ao servidor quando o usuário está autenticado
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!conectar) return;

    if (!usuario) {
      // Desconecta se fez logout
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
      }
      return;
    }

    const token = localStorage.getItem('ghosttalk_access_token');
    if (!token) return;

    // Evita sockets duplicados (StrictMode/re-render): fecha o anterior antes de criar outro
    if (socketInstance) {
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
      socketInstance = null;
    }

    // Em produção conecta direto no backend; em desenvolvimento usa mesma origem (proxy Vite)
    const socketUrl = import.meta.env.VITE_API_URL
      ? `https://${import.meta.env.VITE_API_URL}`
      : window.location.origin;

    // Cria a conexão Socket.IO com autenticação JWT
    // `auth` como função: a cada (re)conexão envia o token ATUAL. Com um objeto fixo,
    // depois de 15 min o token expira e toda reconexão falha com "Token inválido".
    socketInstance = io(socketUrl, {
      auth: (cb) => cb({ token: localStorage.getItem('ghosttalk_access_token') }),
      reconnection: true,
      reconnectionAttempts: Infinity, // o Render hiberna/reinicia; nunca desiste
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socketInstance;

    // ----------------------------------------------------------------
    // Eventos do servidor
    // ----------------------------------------------------------------

    socketInstance.on('connect', () => {
      console.info('[GhostTalk] Socket conectado:', socketInstance.id);
    });

    socketInstance.on('connect_error', async (erro) => {
      console.error('[GhostTalk] Erro de conexão:', erro.message);
      // Token expirado/inválido: renova via REST (o interceptor do axios faz o refresh)
      // e o socket reconecta sozinho já com o token novo.
      if (/token/i.test(erro.message)) {
        try {
          await api.get('/usuarios/perfil');
        } catch {
          /* se o refresh falhar, o interceptor redireciona para o login */
        }
      }
    });

    // Nova mensagem recebida
    socketInstance.on('novaMensagem', (mensagem) => {
      adicionarMensagem(mensagem);
    });

    // Usuário está digitando
    socketInstance.on('usuarioDigitando', (dados) => {
      atualizarDigitando(dados);
    });

    // Mensagens marcadas como lidas por outro usuário
    // (antes era despachado um `statusEntrega` como FUNÇÃO — o React então quebrava
    // ao renderizar `statusEntrega.some(...)` e a tela ficava cinza)
    socketInstance.on('mensagensLidas', ({ conversaId, leitorId, lidoEm }) => {
      despacharMensagens({ tipo: 'MARCAR_LIDAS', conversaId, leitorId, lidoEm });
    });

    // Reação atualizada
    socketInstance.on('reacaoAtualizada', ({ mensagemId, reacoes, conversaId }) => {
      if (conversaId) {
        despacharMensagens({
          tipo: 'ATUALIZAR_MENSAGEM',
          conversaId,
          mensagemId,
          atualizacao: { reacoes },
        });
      }
    });

    return () => {
      if (socketInstance) {
        socketInstance.off('novaMensagem');
        socketInstance.off('usuarioDigitando');
        socketInstance.off('mensagensLidas');
        socketInstance.off('reacaoAtualizada');
      }
    };
  }, [conectar, usuario, adicionarMensagem, atualizarDigitando, despacharMensagens]);

  // ----------------------------------------------------------------
  // Funções para emitir eventos ao servidor
  // ----------------------------------------------------------------

  /**
   * Envia uma mensagem criptografada via Socket.IO.
   */
  const enviarMensagem = useCallback((dados) => {
    return new Promise((resolve, reject) => {
      if (!socketInstance?.connected) {
        reject(new Error('Não conectado ao servidor'));
        return;
      }
      socketInstance.emit('enviarMensagem', dados, (resposta) => {
        if (resposta?.erro) reject(new Error(resposta.erro));
        else resolve(resposta);
      });
    });
  }, []);

  /**
   * Emite evento de "estou digitando".
   */
  const emitirDigitando = useCallback((conversaId, digitando) => {
    socketInstance?.emit('digitando', { conversaId, digitando });
  }, []);

  /**
   * Marca mensagens de uma conversa como lidas.
   */
  const marcarComoLidas = useCallback((conversaId) => {
    socketInstance?.emit('marcarComoLidas', { conversaId });
  }, []);

  /**
   * Adiciona ou remove uma reação em uma mensagem.
   */
  const reagir = useCallback((mensagemId, emoji, conversaId) => {
    socketInstance?.emit('adicionarReacao', { mensagemId, emoji, conversaId });
  }, []);

  return {
    conectado: socketInstance?.connected || false,
    enviarMensagem,
    emitirDigitando,
    marcarComoLidas,
    reagir,
  };
}
