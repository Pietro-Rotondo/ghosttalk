/**
 * GhostTalk — Hook useSocket
 * Gerencia a conexão com o servidor Socket.IO.
 * Registra handlers para todos os eventos em tempo real.
 */

import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

let socketInstance = null; // Instância compartilhada (singleton)

export function useSocket() {
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

    // Cria a conexão Socket.IO com autenticação JWT
    socketInstance = io(window.location.origin, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socketInstance;

    // ----------------------------------------------------------------
    // Eventos do servidor
    // ----------------------------------------------------------------

    socketInstance.on('connect', () => {
      console.info('[GhostTalk] Socket conectado:', socketInstance.id);
    });

    socketInstance.on('connect_error', (erro) => {
      console.error('[GhostTalk] Erro de conexão:', erro.message);
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
    socketInstance.on('mensagensLidas', ({ conversaId, leitorId, lidoEm }) => {
      despacharMensagens({
        tipo: 'ATUALIZAR_MENSAGEM',
        conversaId,
        atualizacao: {
          'statusEntrega': (anterior) =>
            (anterior || []).map((s) =>
              s.usuarioId === leitorId ? { ...s, lido: true, lidoEm } : s
            ),
        },
      });
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
  }, [usuario, adicionarMensagem, atualizarDigitando, despacharMensagens]);

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
