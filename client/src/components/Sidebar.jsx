/**
 * GhostTalk — Sidebar de Conversas
 * Lista todas as conversas do usuário com busca e status.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Settings, User, LogOut, Ghost, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import ModalNovaConversa from './ModalNovaConversa';
import { truncar, formatarHoraMensagem } from '../utils/formatacao';
import { motion, AnimatePresence } from 'framer-motion';

export default function Sidebar({ conversas, conversaAtiva, onSelecionarConversa }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [termoBusca, setTermoBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);

  // Filtra conversas pelo termo de busca
  const conversasFiltradas = conversas.filter((c) => {
    const nome = obterNomeConversa(c, usuario);
    return nome.toLowerCase().includes(termoBusca.toLowerCase());
  });

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho da sidebar */}
      <div className="p-4 border-b border-escuro-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">👻</span>
            <span className="font-bold text-white text-lg">GhostTalk</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setModalAberto(true)}
              className="p-2 rounded-lg hover:bg-escuro-700 text-escuro-400 hover:text-white transition-colors"
              title="Nova conversa"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/configuracoes')}
              className="p-2 rounded-lg hover:bg-escuro-700 text-escuro-400 hover:text-white transition-colors"
              title="Configurações"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Campo de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-escuro-400" />
          <input
            type="text"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            placeholder="Buscar conversas..."
            className="campo-texto pl-9 py-2"
          />
        </div>
      </div>

      {/* Lista de conversas */}
      <div className="flex-1 overflow-y-auto py-2">
        <AnimatePresence>
          {conversasFiltradas.length === 0 ? (
            <div className="text-center py-12 text-escuro-500">
              <Ghost className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {termoBusca ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
              </p>
              {!termoBusca && (
                <button
                  onClick={() => setModalAberto(true)}
                  className="mt-3 text-fantasma-400 hover:text-fantasma-300 text-sm underline"
                >
                  Iniciar uma conversa
                </button>
              )}
            </div>
          ) : (
            conversasFiltradas.map((conversa) => (
              <ItemConversa
                key={conversa._id}
                conversa={conversa}
                usuario={usuario}
                ativo={conversaAtiva?._id === conversa._id}
                onClick={() => onSelecionarConversa(conversa)}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Perfil do usuário na parte inferior */}
      <div className="p-3 border-t border-escuro-700 flex items-center gap-3">
        <button
          onClick={() => navigate('/perfil')}
          className="flex items-center gap-3 flex-1 min-w-0 hover:bg-escuro-700 rounded-lg p-1.5 transition-colors"
        >
          <Avatar
            nome={usuario?.nomeExibicao || usuario?.nomeUsuario}
            foto={usuario?.fotoPerfil}
            tamanho="sm"
            online
          />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-white truncate">
              {usuario?.nomeExibicao || usuario?.nomeUsuario}
            </p>
            <p className="text-xs text-escuro-400 truncate">{usuario?.status}</p>
          </div>
        </button>
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-escuro-700 text-escuro-500 hover:text-red-400 transition-colors"
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Modal de nova conversa */}
      {modalAberto && <ModalNovaConversa onFechar={() => setModalAberto(false)} />}
    </div>
  );
}

// ----------------------------------------------------------------
// Componente: item de conversa na lista
// ----------------------------------------------------------------
function ItemConversa({ conversa, usuario, ativo, onClick }) {
  const nome = obterNomeConversa(conversa, usuario);
  const foto = obterFotoConversa(conversa, usuario);
  const outroParticipante = obterOutroParticipante(conversa, usuario);
  const ultimaMsgTexto = obterTextoUltimaMensagem(conversa);
  const horario = conversa.ultimaMensagem?.createdAt
    ? formatarHoraMensagem(conversa.ultimaMensagem.createdAt)
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClick}
      className={`item-conversa mx-2 ${ativo ? 'ativo' : ''}`}
    >
      <div className="relative flex-shrink-0">
        <Avatar nome={nome} foto={foto} tamanho="md" />
        {/* Indicador online */}
        {outroParticipante?.online && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-escuro-900" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white truncate">{nome}</span>
          {horario && (
            <span className="text-xs text-escuro-400 flex-shrink-0 ml-2">{horario}</span>
          )}
        </div>
        <p className="text-xs text-escuro-400 truncate mt-0.5">{ultimaMsgTexto}</p>
      </div>
    </motion.div>
  );
}

// ----------------------------------------------------------------
// Helpers para obter dados de exibição de uma conversa
// ----------------------------------------------------------------
function obterNomeConversa(conversa, usuarioAtual) {
  if (conversa.tipo === 'grupo') return conversa.grupo?.nome || 'Grupo';
  const outro = obterOutroParticipante(conversa, usuarioAtual);
  return outro?.nomeExibicao || outro?.nomeUsuario || 'Conversa';
}

function obterFotoConversa(conversa, usuarioAtual) {
  if (conversa.tipo === 'grupo') return conversa.grupo?.fotoCapa;
  const outro = obterOutroParticipante(conversa, usuarioAtual);
  return outro?.fotoPerfil;
}

function obterOutroParticipante(conversa, usuarioAtual) {
  if (!usuarioAtual || conversa.tipo === 'grupo') return null;
  const outro = conversa.participantes?.find(
    (p) => (p.usuarioId?._id || p.usuarioId) !== usuarioAtual._id &&
            (p.usuarioId?._id || p.usuarioId) !== usuarioAtual.id
  );
  return outro?.usuarioId || null;
}

function obterTextoUltimaMensagem(conversa) {
  if (!conversa.ultimaMensagem) return 'Nenhuma mensagem ainda';
  if (conversa.ultimaMensagem.apagada) return '🚫 Mensagem apagada';
  return '🔒 Mensagem criptografada';
}
