/**
 * GhostTalk — Página Principal de Chat
 * Layout responsivo: sidebar + área de chat no desktop,
 * navegação por abas no mobile.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { useSocket } from '../hooks/useSocket';
import Sidebar from '../components/Sidebar';
import AreaChat from '../components/AreaChat';
import TelaVazia from '../components/TelaVazia';

export default function PaginaChat() {
  const { conversaId } = useParams();
  const navigate = useNavigate();
  const { carregarConversas, conversas, setConversaAtiva, conversaAtiva } = useChat();
  const [abaMobile, setAbaMobile] = useState('conversas'); // 'conversas' | 'chat'

  // Inicializa o socket e carrega as conversas
  useSocket();

  useEffect(() => {
    carregarConversas();
  }, [carregarConversas]);

  // Sincroniza a conversa ativa com a URL
  useEffect(() => {
    if (conversaId && conversas.length > 0) {
      const conversa = conversas.find((c) => c._id === conversaId);
      if (conversa) {
        setConversaAtiva(conversa);
        setAbaMobile('chat');
      }
    } else if (!conversaId) {
      setConversaAtiva(null);
      setAbaMobile('conversas');
    }
  }, [conversaId, conversas, setConversaAtiva]);

  const handleSelecionarConversa = (conversa) => {
    setConversaAtiva(conversa);
    navigate(`/chat/${conversa._id}`);
    setAbaMobile('chat');
  };

  const handleVoltarMobile = () => {
    setAbaMobile('conversas');
    navigate('/chat');
  };

  return (
    <div className="flex h-screen bg-escuro-950 overflow-hidden">
      {/* ----------------------------------------------------------------
          DESKTOP: sidebar sempre visível + área de chat
          MOBILE: alterna entre sidebar e chat por aba
          ---------------------------------------------------------------- */}

      {/* Sidebar */}
      <aside
        className={`
          ${abaMobile === 'chat' ? 'hidden md:flex' : 'flex'}
          w-full md:w-80 lg:w-96 flex-shrink-0
          flex-col border-r border-escuro-700
          bg-escuro-900
        `}
      >
        <Sidebar
          conversas={conversas}
          conversaAtiva={conversaAtiva}
          onSelecionarConversa={handleSelecionarConversa}
        />
      </aside>

      {/* Área de chat */}
      <main
        className={`
          ${abaMobile === 'conversas' ? 'hidden md:flex' : 'flex'}
          flex-1 flex-col min-w-0 bg-escuro-800
        `}
      >
        {conversaAtiva ? (
          <AreaChat
            conversa={conversaAtiva}
            onVoltar={handleVoltarMobile}
          />
        ) : (
          <TelaVazia />
        )}
      </main>
    </div>
  );
}
