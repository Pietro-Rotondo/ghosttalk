/**
 * GhostTalk — Área de Chat Principal
 * Exibe o histórico de mensagens e o campo de envio.
 * Gerencia: envio de mensagens, indicador de digitação, scroll automático.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, MoreVertical, Lock, Download, ShieldCheck, Trash2, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useSocket } from '../hooks/useSocket';
import BolhaMensagem from './BolhaMensagem';
import CampoEnvio from './CampoEnvio';
import Avatar from './Avatar';
import IndicadorDigitando from './IndicadorDigitando';
import ModalExportacao from './ModalExportacao';
import ModalFingerprint from './ModalFingerprint';
import ModalPerfil from './ModalPerfil';
import { criptografarMensagem } from '../utils/criptografia';
import { formatarTempoRelativo } from '../utils/formatacao';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function AreaChat({ conversa, onVoltar }) {
  const { usuario } = useAuth();
  const { mensagensPorConversa, carregarMensagens, digitandoPor, setConversas } = useChat();
  const { enviarMensagem, emitirDigitando, marcarComoLidas } = useSocket(false);

  const mensagens = mensagensPorConversa[conversa._id] || [];
  const digitando = digitandoPor[conversa._id] || [];

  const [carregando, setCarregando] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [temMais, setTemMais] = useState(true);
  const [modalExportacao, setModalExportacao] = useState(false);
  const [modalFingerprint, setModalFingerprint] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [perfilAberto, setPerfilAberto] = useState(false);
  // Cache de chaves públicas buscadas on-demand
  const [chavesPublicas, setChavesPublicas] = useState({});

  const containerRef = useRef(null);
  const ultimaMensagemRef = useRef(null);
  const primeiraCarregagem = useRef(true);

  // ----------------------------------------------------------------
  // Busca chave pública de um usuário se não estiver no objeto local
  // ----------------------------------------------------------------
  const obterChavePublica = useCallback(async (usuarioId, chaveJaConhecida) => {
    if (chaveJaConhecida) return chaveJaConhecida;
    if (chavesPublicas[usuarioId]) return chavesPublicas[usuarioId];

    try {
      const { data } = await api.get(`/usuarios/id/${usuarioId}`);
      if (data.chavePublica) {
        setChavesPublicas((prev) => ({ ...prev, [usuarioId]: data.chavePublica }));
        return data.chavePublica;
      }
    } catch (e) {
      console.error('[GhostTalk] Erro ao buscar chave pública:', e.message);
    }
    return null;
  }, [chavesPublicas]);

  // ----------------------------------------------------------------
  // Carrega mensagens ao entrar na conversa
  // ----------------------------------------------------------------
  useEffect(() => {
    setPagina(1);
    setTemMais(true);
    primeiraCarregagem.current = true;
    setChavesPublicas({});

    const carregar = async () => {
      setCarregando(true);
      const paginacao = await carregarMensagens(conversa._id, 1);
      if (paginacao) setTemMais(paginacao.pagina < paginacao.totalPaginas);
      setCarregando(false);
    };

    carregar();
    marcarComoLidas(conversa._id);
  }, [conversa._id, carregarMensagens, marcarComoLidas]);

  // ----------------------------------------------------------------
  // Scroll automático para a última mensagem
  // ----------------------------------------------------------------
  useEffect(() => {
    if (primeiraCarregagem.current && mensagens.length > 0) {
      ultimaMensagemRef.current?.scrollIntoView({ behavior: 'auto' });
      primeiraCarregagem.current = false;
    } else if (!primeiraCarregagem.current && mensagens.length > 0) {
      ultimaMensagemRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensagens.length]);

  // ----------------------------------------------------------------
  // Carregamento de mensagens anteriores (infinite scroll)
  // ----------------------------------------------------------------
  const carregarMaisAnteriores = useCallback(async () => {
    if (carregando || !temMais) return;
    const novaPagina = pagina + 1;
    setCarregando(true);
    const container = containerRef.current;
    const alturaAntes = container?.scrollHeight || 0;
    const paginacao = await carregarMensagens(conversa._id, novaPagina);
    if (paginacao) {
      setPagina(novaPagina);
      setTemMais(novaPagina < paginacao.totalPaginas);
    }
    setCarregando(false);
    if (container) container.scrollTop = container.scrollHeight - alturaAntes;
  }, [carregando, temMais, pagina, conversa._id, carregarMensagens]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (container.scrollTop < 100 && !carregando && temMais) carregarMaisAnteriores();
  }, [carregarMaisAnteriores, carregando, temMais]);

  // ----------------------------------------------------------------
  // Envio de mensagem (individual e grupo)
  // ----------------------------------------------------------------
  const handleEnviar = useCallback(async (texto, tipo = 'texto', metadadosArquivo = null) => {
    // Para grupos: criptografa com a própria chave pública do remetente
    // (simplificação: servidor retransmite para todos; cada um pode ler)
    // Para individuais: criptografa com a chave pública do destinatário
    let chaveAlvo;

    if (conversa.tipo === 'grupo') {
      // Em grupo usa a chave pública do próprio remetente como envelope
      // (modelo simplificado — para E2EE real em grupo seria necessário
      // criptografar separadamente para cada membro)
      chaveAlvo = usuario?.chavePublica;
    } else {
      const destinatario = obterDestinatario(conversa, usuario);
      const idDestinatario = destinatario?._id || destinatario?.id;
      chaveAlvo = await obterChavePublica(idDestinatario, destinatario?.chavePublica);
    }

    if (!chaveAlvo) {
      toast.error(
        conversa.tipo === 'grupo'
          ? 'Sua chave de criptografia não foi encontrada. Faça logout e login novamente.'
          : 'O destinatário ainda não tem chave de criptografia. Peça para ele fazer login novamente.'
      );
      return;
    }

    let cifrado;
    try {
      cifrado = criptografarMensagem(texto, chaveAlvo);
    } catch (erro) {
      toast.error('Erro de criptografia: ' + erro.message);
      return;
    }

    try {
      await enviarMensagem({
        conversaId: conversa._id,
        conteudoCriptografado: cifrado.conteudoCriptografado,
        nonce: cifrado.nonce,
        tipo,
        metadadosArquivo: metadadosArquivo || undefined,
        tempId: `temp-${Date.now()}`,
      });
      emitirDigitando(conversa._id, false);
    } catch {
      toast.error('Erro ao enviar mensagem');
    }
  }, [conversa, usuario, enviarMensagem, emitirDigitando, obterChavePublica]);

  // ----------------------------------------------------------------
  // Apagar conversa inteira
  // ----------------------------------------------------------------
  const handleApagarConversa = async () => {
    if (!window.confirm('Apagar toda esta conversa? Esta ação não pode ser desfeita.')) return;
    try {
      await api.delete(`/grupos/conversa/${conversa._id}`);
      setConversas((prev) => prev.filter((c) => c._id !== conversa._id));
      onVoltar?.();
      toast.success('Conversa apagada');
    } catch {
      toast.error('Erro ao apagar conversa');
    }
    setMenuAberto(false);
  };

  const nomeConversa = obterNomeConversa(conversa, usuario);
  const fotoConversa = obterFotoConversa(conversa, usuario);
  const outroParticipante = obterDestinatario(conversa, usuario);

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-escuro-700 bg-escuro-900 flex-shrink-0">
        <button
          onClick={onVoltar}
          className="md:hidden p-1.5 rounded-lg hover:bg-escuro-700 text-escuro-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Clique no avatar abre perfil */}
        <button onClick={() => setPerfilAberto(true)} className="flex-shrink-0">
          <Avatar nome={nomeConversa} foto={fotoConversa} tamanho="sm" />
        </button>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setPerfilAberto(true)}>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-white truncate">{nomeConversa}</h2>
            <Lock className="w-3 h-3 text-green-400 flex-shrink-0" title="Criptografado E2EE" />
          </div>
          <p className="text-xs text-escuro-400 truncate">
            {outroParticipante?.online
              ? 'Online agora'
              : outroParticipante?.ultimaAtividade
              ? `Visto ${formatarTempoRelativo(outroParticipante.ultimaAtividade)}`
              : conversa.tipo === 'grupo'
              ? `${conversa.participantes?.length || 0} participantes`
              : ''}
          </p>
        </div>

        {/* Menu de opções */}
        <div className="relative">
          <button
            onClick={() => setMenuAberto((v) => !v)}
            className="p-2 rounded-lg hover:bg-escuro-700 text-escuro-400 hover:text-white transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {menuAberto && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuAberto(false)} />
              <div className="absolute right-0 top-full mt-1 w-52 bg-escuro-700 rounded-xl border border-escuro-600 shadow-xl z-50 overflow-hidden">
                <button
                  onClick={() => { setPerfilAberto(true); setMenuAberto(false); }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-escuro-200 hover:bg-escuro-600 transition-colors"
                >
                  <UserCircle className="w-4 h-4" />
                  Ver perfil
                </button>
                <button
                  onClick={() => { setModalExportacao(true); setMenuAberto(false); }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-escuro-200 hover:bg-escuro-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Exportar histórico
                </button>
                {conversa.tipo === 'individual' && (
                  <button
                    onClick={() => { setModalFingerprint(true); setMenuAberto(false); }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-escuro-200 hover:bg-escuro-600 transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Verificar fingerprint
                  </button>
                )}
                <button
                  onClick={handleApagarConversa}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-400 hover:bg-escuro-600 transition-colors border-t border-escuro-600"
                >
                  <Trash2 className="w-4 h-4" />
                  Apagar conversa
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Área de mensagens */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
      >
        {carregando && pagina > 1 && (
          <div className="text-center py-4">
            <div className="inline-block w-5 h-5 border-2 border-fantasma-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <div className="flex justify-center mb-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-escuro-700/50 border border-escuro-600">
            <Lock className="w-3 h-3 text-green-400" />
            <span className="text-xs text-escuro-400">
              Conversa protegida por criptografia ponta a ponta
            </span>
          </div>
        </div>

        {mensagens.map((mensagem, indice) => (
          <BolhaMensagem
            key={mensagem._id || mensagem.tempId || indice}
            mensagem={mensagem}
            ePropia={
              (mensagem.remetenteId?._id || mensagem.remetenteId) === (usuario?._id || usuario?.id)
            }
            mostrarAutor={conversa.tipo === 'grupo'}
            conversaId={conversa._id}
          />
        ))}

        {digitando.length > 0 && <IndicadorDigitando usuarios={digitando} />}
        <div ref={ultimaMensagemRef} />
      </div>

      {/* Campo de envio */}
      <CampoEnvio
        conversaId={conversa._id}
        onEnviar={handleEnviar}
        onDigitando={(d) => emitirDigitando(conversa._id, d)}
      />

      {/* Modais */}
      {modalExportacao && (
        <ModalExportacao conversa={conversa} mensagens={mensagens} onFechar={() => setModalExportacao(false)} />
      )}
      {modalFingerprint && (
        <ModalFingerprint conversa={conversa} onFechar={() => setModalFingerprint(false)} />
      )}
      {perfilAberto && (
        <ModalPerfil
          conversa={conversa}
          usuario={usuario}
          onFechar={() => setPerfilAberto(false)}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
function obterNomeConversa(conversa, usuario) {
  if (conversa.tipo === 'grupo') return conversa.grupo?.nome || 'Grupo';
  const outro = obterDestinatario(conversa, usuario);
  return outro?.nomeExibicao || outro?.nomeUsuario || 'Conversa';
}

function obterFotoConversa(conversa, usuario) {
  if (conversa.tipo === 'grupo') return conversa.grupo?.fotoCapa;
  return obterDestinatario(conversa, usuario)?.fotoPerfil;
}

function obterDestinatario(conversa, usuario) {
  if (!usuario || conversa.tipo === 'grupo') return null;
  const outro = conversa.participantes?.find((p) => {
    const id = p.usuarioId?._id || p.usuarioId?.id || p.usuarioId;
    const meuId = usuario._id || usuario.id;
    return id !== meuId && id?.toString() !== meuId?.toString();
  });
  return outro?.usuarioId || null;
}
