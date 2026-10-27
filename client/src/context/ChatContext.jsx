/**
 * GhostTalk — Contexto de Chat
 * Gerencia conversas, mensagens e estado global do chat.
 * Integra com o hook useSocket para eventos em tempo real.
 */

import { createContext, useContext, useState, useCallback, useReducer } from 'react';
import api from '../utils/api';
import { descriptografarMensagem } from '../utils/criptografia';

const ChatContext = createContext(null);

// ----------------------------------------------------------------
// Reducer para gerenciamento de mensagens por conversa
// ----------------------------------------------------------------
function mensagensReducer(estado, acao) {
  switch (acao.tipo) {
    case 'DEFINIR_MENSAGENS': {
      return {
        ...estado,
        [acao.conversaId]: acao.mensagens,
      };
    }
    case 'ADICIONAR_MENSAGEM': {
      const anteriores = estado[acao.conversaId] || [];
      // Evita duplicatas pelo ID ou tempId
      const jáExiste = anteriores.some(
        (m) => m._id === acao.mensagem._id || (acao.mensagem.tempId && m.tempId === acao.mensagem.tempId)
      );
      if (jáExiste) return estado;
      return {
        ...estado,
        [acao.conversaId]: [...anteriores, acao.mensagem],
      };
    }
    case 'ATUALIZAR_MENSAGEM': {
      const lista = estado[acao.conversaId] || [];
      return {
        ...estado,
        [acao.conversaId]: lista.map((m) =>
          m._id === acao.mensagemId || m.tempId === acao.tempId
            ? { ...m, ...acao.atualizacao }
            : m
        ),
      };
    }
    case 'ADICIONAR_MENSAGENS_ANTERIORES': {
      const atuais = estado[acao.conversaId] || [];
      return {
        ...estado,
        [acao.conversaId]: [...acao.mensagens, ...atuais],
      };
    }
    default:
      return estado;
  }
}

export function ChatProvider({ children }) {
  const [conversas, setConversas] = useState([]);
  const [conversaAtiva, setConversaAtiva] = useState(null);
  const [carregandoConversas, setCarregandoConversas] = useState(false);
  const [mensagensPorConversa, despacharMensagens] = useReducer(mensagensReducer, {});
  const [digitandoPor, setDigitandoPor] = useState({}); // { conversaId: [{ usuarioId, nomeUsuario }] }

  // ----------------------------------------------------------------
  // Carrega lista de conversas do usuário
  // ----------------------------------------------------------------
  const carregarConversas = useCallback(async () => {
    setCarregandoConversas(true);
    try {
      const { data } = await api.get('/grupos/conversas');
      setConversas(data.conversas);
    } catch (erro) {
      console.error('Erro ao carregar conversas:', erro.message);
    } finally {
      setCarregandoConversas(false);
    }
  }, []);

  // ----------------------------------------------------------------
  // Carrega histórico de mensagens de uma conversa (com descriptografia)
  // ----------------------------------------------------------------
  const carregarMensagens = useCallback(async (conversaId, pagina = 1) => {
    try {
      const { data } = await api.get(`/mensagens/${conversaId}`, {
        params: { pagina, limite: 50 },
      });

      // Descriptografa cada mensagem localmente
      const mensagensDescriptografadas = data.mensagens.map((msg) => {
        const chavePublicaRemetente = msg.remetenteId?.chavePublica;
        let textoDescriptografado = null;

        if (chavePublicaRemetente && !msg.apagada) {
          textoDescriptografado = descriptografarMensagem(
            msg.conteudoCriptografado,
            msg.nonce,
            chavePublicaRemetente
          );
        }

        return { ...msg, textoDescriptografado };
      });

      if (pagina === 1) {
        despacharMensagens({
          tipo: 'DEFINIR_MENSAGENS',
          conversaId,
          mensagens: mensagensDescriptografadas,
        });
      } else {
        despacharMensagens({
          tipo: 'ADICIONAR_MENSAGENS_ANTERIORES',
          conversaId,
          mensagens: mensagensDescriptografadas,
        });
      }

      return data.paginacao;
    } catch (erro) {
      console.error('Erro ao carregar mensagens:', erro.message);
      return null;
    }
  }, []);

  // ----------------------------------------------------------------
  // Adiciona nova mensagem recebida via Socket.IO
  // ----------------------------------------------------------------
  const adicionarMensagem = useCallback((mensagem) => {
    const chavePublicaRemetente = mensagem.remetenteId?.chavePublica;
    let textoDescriptografado = null;

    if (chavePublicaRemetente && !mensagem.apagada) {
      textoDescriptografado = descriptografarMensagem(
        mensagem.conteudoCriptografado,
        mensagem.nonce,
        chavePublicaRemetente
      );
    }

    despacharMensagens({
      tipo: 'ADICIONAR_MENSAGEM',
      conversaId: mensagem.conversaId,
      mensagem: { ...mensagem, textoDescriptografado },
    });

    // Atualiza a última mensagem na lista de conversas
    setConversas((anterior) =>
      anterior.map((c) =>
        c._id === mensagem.conversaId
          ? { ...c, ultimaMensagem: mensagem, updatedAt: mensagem.createdAt }
          : c
      )
    );
  }, []);

  // ----------------------------------------------------------------
  // Atualiza estado de digitação
  // ----------------------------------------------------------------
  const atualizarDigitando = useCallback(({ conversaId, usuarioId, nomeUsuario, digitando }) => {
    setDigitandoPor((anterior) => {
      const lista = anterior[conversaId] || [];
      if (digitando) {
        const jáEstá = lista.some((u) => u.usuarioId === usuarioId);
        if (jáEstá) return anterior;
        return { ...anterior, [conversaId]: [...lista, { usuarioId, nomeUsuario }] };
      } else {
        return {
          ...anterior,
          [conversaId]: lista.filter((u) => u.usuarioId !== usuarioId),
        };
      }
    });
  }, []);

  const valor = {
    conversas,
    setConversas,
    conversaAtiva,
    setConversaAtiva,
    carregandoConversas,
    carregarConversas,
    mensagensPorConversa,
    carregarMensagens,
    adicionarMensagem,
    digitandoPor,
    atualizarDigitando,
    despacharMensagens,
  };

  return <ChatContext.Provider value={valor}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const contexto = useContext(ChatContext);
  if (!contexto) throw new Error('useChat deve ser usado dentro de um ChatProvider');
  return contexto;
}
