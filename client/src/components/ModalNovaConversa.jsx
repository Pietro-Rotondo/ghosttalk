/**
 * GhostTalk — Modal de Nova Conversa
 * Busca usuários e inicia conversa individual ou cria grupo.
 */

import { useState, useCallback } from 'react';
import { X, Search, Users, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '../context/ChatContext';
import { useNavigate } from 'react-router-dom';
import Avatar from './Avatar';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function ModalNovaConversa({ onFechar }) {
  const { carregarConversas } = useChat();
  const navigate = useNavigate();

  const [aba, setAba] = useState('individual'); // 'individual' | 'grupo'
  const [termoBusca, setTermoBusca] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [selecionados, setSelecionados] = useState([]);
  const [nomeGrupo, setNomeGrupo] = useState('');
  const [criando, setCriando] = useState(false);

  // ----------------------------------------------------------------
  // Busca usuários
  // ----------------------------------------------------------------
  const buscarUsuarios = useCallback(async (termo) => {
    setTermoBusca(termo);
    if (termo.length < 2) {
      setResultados([]);
      return;
    }

    setBuscando(true);
    try {
      const { data } = await api.get('/usuarios/buscar', { params: { q: termo } });
      setResultados(data.usuarios);
    } catch {
      toast.error('Erro ao buscar usuários');
    } finally {
      setBuscando(false);
    }
  }, []);

  // ----------------------------------------------------------------
  // Inicia conversa individual
  // ----------------------------------------------------------------
  const iniciarConversa = async (usuario) => {
    setCriando(true);
    try {
      const { data } = await api.post('/grupos/individual', {
        destinatarioId: usuario._id || usuario.id,
      });
      await carregarConversas();
      navigate(`/chat/${data.conversa._id}`);
      onFechar();
    } catch {
      toast.error('Erro ao iniciar conversa');
    } finally {
      setCriando(false);
    }
  };

  // ----------------------------------------------------------------
  // Cria grupo
  // ----------------------------------------------------------------
  const criarGrupo = async () => {
    if (!nomeGrupo.trim()) {
      toast.error('Informe o nome do grupo');
      return;
    }
    if (selecionados.length === 0) {
      toast.error('Adicione pelo menos um participante');
      return;
    }

    setCriando(true);
    try {
      const { data } = await api.post('/grupos', {
        nome: nomeGrupo,
        participantesIds: selecionados.map((u) => u._id || u.id),
      });
      await carregarConversas();
      navigate(`/chat/${data.conversa._id}`);
      onFechar();
    } catch {
      toast.error('Erro ao criar grupo');
    } finally {
      setCriando(false);
    }
  };

  const toggleSelecionar = (usuario) => {
    setSelecionados((prev) =>
      prev.some((u) => (u._id || u.id) === (usuario._id || usuario.id))
        ? prev.filter((u) => (u._id || u.id) !== (usuario._id || usuario.id))
        : [...prev, usuario]
    );
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onFechar}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-escuro-800 rounded-2xl border border-escuro-700 shadow-2xl overflow-hidden"
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between p-5 border-b border-escuro-700">
            <h2 className="font-semibold text-white text-lg">Nova conversa</h2>
            <button
              onClick={onFechar}
              className="p-1.5 rounded-lg hover:bg-escuro-700 text-escuro-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Abas */}
          <div className="flex border-b border-escuro-700">
            {[
              { id: 'individual', label: 'Individual', icon: MessageCircle },
              { id: 'grupo', label: 'Grupo', icon: Users },
            ].map(({ id, label, icon: Icone }) => (
              <button
                key={id}
                onClick={() => setAba(id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors
                  ${aba === id
                    ? 'text-fantasma-400 border-b-2 border-fantasma-400'
                    : 'text-escuro-400 hover:text-white'
                  }`}
              >
                <Icone className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-4">
            {/* Campo de busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-escuro-400" />
              <input
                type="text"
                value={termoBusca}
                onChange={(e) => buscarUsuarios(e.target.value)}
                placeholder="Buscar por nome de usuário..."
                autoFocus
                className="campo-texto pl-9"
              />
            </div>

            {/* Nome do grupo (apenas na aba grupo) */}
            {aba === 'grupo' && (
              <input
                type="text"
                value={nomeGrupo}
                onChange={(e) => setNomeGrupo(e.target.value)}
                placeholder="Nome do grupo"
                maxLength={100}
                className="campo-texto"
              />
            )}

            {/* Participantes selecionados (grupo) */}
            {aba === 'grupo' && selecionados.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selecionados.map((u) => (
                  <div
                    key={u._id || u.id}
                    className="flex items-center gap-1.5 bg-fantasma-600/20 border border-fantasma-500/30 rounded-full px-3 py-1"
                  >
                    <span className="text-xs text-fantasma-300">
                      {u.nomeExibicao || u.nomeUsuario}
                    </span>
                    <button
                      onClick={() => toggleSelecionar(u)}
                      className="text-fantasma-400 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Resultados da busca */}
            <div className="max-h-60 overflow-y-auto space-y-1">
              {buscando ? (
                <div className="text-center py-4 text-escuro-400 text-sm">Buscando...</div>
              ) : resultados.length > 0 ? (
                resultados.map((u) => {
                  const selecionado = selecionados.some(
                    (s) => (s._id || s.id) === (u._id || u.id)
                  );
                  return (
                    <button
                      key={u._id || u.id}
                      onClick={() =>
                        aba === 'individual' ? iniciarConversa(u) : toggleSelecionar(u)
                      }
                      disabled={criando}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors
                        ${selecionado
                          ? 'bg-fantasma-600/20 border border-fantasma-500/30'
                          : 'hover:bg-escuro-700'
                        }`}
                    >
                      <Avatar nome={u.nomeExibicao || u.nomeUsuario} foto={u.fotoPerfil} tamanho="sm" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-white">
                          {u.nomeExibicao || u.nomeUsuario}
                        </p>
                        <p className="text-xs text-escuro-400">@{u.nomeUsuario}</p>
                      </div>
                    </button>
                  );
                })
              ) : termoBusca.length >= 2 ? (
                <div className="text-center py-4 text-escuro-400 text-sm">
                  Nenhum usuário encontrado
                </div>
              ) : null}
            </div>

            {/* Botão criar grupo */}
            {aba === 'grupo' && (
              <button
                onClick={criarGrupo}
                disabled={criando || selecionados.length === 0 || !nomeGrupo.trim()}
                className="btn-primario w-full py-3 disabled:opacity-50"
              >
                {criando ? 'Criando...' : 'Criar grupo'}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
