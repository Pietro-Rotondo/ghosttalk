/**
 * GhostTalk — Contexto de Chat
 * Gerencia conversas, mensagens e estado global do chat.
 * Integra com o hook useSocket para eventos em tempo real.
 */

import { createContext, useContext, useState, useCallback, useReducer, useRef } from 'react';
import api from '../utils/api';
import { descriptografarMensagem } from '../utils/criptografia';

const ChatContext = createContext(null);

/**
 * Descriptografa uma mensagem tentando as chaves públicas candidatas.
 * - Mensagem recebida: abre com a chave pública do remetente.
 * - Mensagem enviada por mim (1-a-1): foi cifrada para o destinatário,
 *   então abre com a chave pública do outro participante.
 */
function descriptografarComFallback(msg, conversa) {
  if (msg.apagada) return null;

  const candidatas = [
    msg.remetenteId?.chavePublica,
    ...(conversa?.participantes || []).map((p) => p.usuarioId?.chavePublica),
  ].filter(Boolean);

  for (const chave of new Set(candidatas)) {
    const texto = descriptografarMensagem(msg.conteudoCriptografado, msg.nonce, chave);
    if (texto !== null) return texto;
  }
  return null;
}

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
  const conversasRef = useRef(conversas);
  conversasRef.current = conversas;
  // Expõe setConversas para que AreaChat possa remover conversa localmente
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
      const conversa = conversasRef.current.find((c) => c._id === conversaId);
      const mensagensDescriptografadas = data.mensagens.map((msg) => ({
        ...msg,
        textoDescriptografado: descriptografarComFallback(msg, conversa),
      }));

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
    const conversa = conversasRef.current.find((c) => c._id === mensagem.conversaId);
    const textoDescriptografado = descriptografarComFallback(mensagem, conversa);

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
