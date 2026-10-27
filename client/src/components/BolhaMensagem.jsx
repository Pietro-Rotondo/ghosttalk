/**
 * GhostTalk — Componente Bolha de Mensagem
 * Renderiza uma mensagem individual com animação, metadados e ações.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCheck, Trash2, MoreHorizontal } from 'lucide-react';
import { formatarHoraMensagem } from '../utils/formatacao';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function BolhaMensagem({ mensagem, ePropia, mostrarAutor, conversaId }) {
  const { usuario } = useAuth();
  const { despacharMensagens } = useChat();
  const [menuAberto, setMenuAberto] = useState(false);

  const textoExibido = mensagem.apagada ? null : mensagem.textoDescriptografado || null;

  const handleApagarParaMim = async () => {
    try {
      await api.delete(`/mensagens/${mensagem._id}`);
      despacharMensagens({
        tipo: 'ATUALIZAR_MENSAGEM',
        conversaId,
        mensagemId: mensagem._id,
        atualizacao: { apagada: true, textoDescriptografado: null },
      });
    } catch {
      toast.error('Erro ao apagar mensagem');
    }
    setMenuAberto(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.15 }}
      className={`flex ${ePropia ? 'justify-end' : 'justify-start'} group mb-1`}
    >
      <div className={`max-w-[75%] ${ePropia ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Nome do autor (grupos) */}
        {mostrarAutor && !ePropia && (
          <span className="text-xs font-semibold text-fantasma-400 ml-1 mb-0.5">
            {mensagem.remetenteId?.nomeExibicao || mensagem.remetenteId?.nomeUsuario}
          </span>
        )}

        <div className="flex items-end gap-1">
          {/* Botão de ações (aparece no hover) */}
          {!mensagem.apagada && (
            <div className={`relative opacity-0 group-hover:opacity-100 transition-opacity ${ePropia ? 'order-first' : 'order-last'}`}>
              <button
                onClick={() => setMenuAberto((v) => !v)}
                className="p-1 rounded-full hover:bg-escuro-600 text-escuro-400 hover:text-white"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {menuAberto && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuAberto(false)} />
                  <div className={`absolute z-50 bg-escuro-700 border border-escuro-600 rounded-xl shadow-xl overflow-hidden w-44 ${ePropia ? 'right-0' : 'left-0'} bottom-full mb-1`}>
                    <button
                      onClick={handleApagarParaMim}
                      className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-red-400 hover:bg-escuro-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Apagar mensagem
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Bolha */}
          <div
            className={`
              relative px-4 py-2 rounded-2xl shadow-md
              ${ePropia
                ? 'bg-fantasma-600 text-white rounded-br-md'
                : 'bg-escuro-700 text-escuro-100 rounded-bl-md'
              }
            `}
          >
            {mensagem.apagada ? (
              <div className="flex items-center gap-2 opacity-60 italic">
                <Trash2 className="w-3.5 h-3.5" />
                <span className="text-sm">Mensagem apagada</span>
              </div>
            ) : mensagem.tipo === 'imagem' && mensagem.metadadosArquivo?.url ? (
              <div className="space-y-1">
                <img
                  src={mensagem.metadadosArquivo.url}
                  alt={mensagem.metadadosArquivo.nome || 'Imagem'}
                  className="max-w-full rounded-xl max-h-64 object-cover cursor-pointer"
                  onClick={() => window.open(mensagem.metadadosArquivo.url, '_blank')}
                />
                <p className="text-xs opacity-60">{mensagem.metadadosArquivo.nome}</p>
              </div>
            ) : (mensagem.tipo === 'video') && mensagem.metadadosArquivo?.url ? (
              <video
                src={mensagem.metadadosArquivo.url}
                controls
                className="max-w-full rounded-xl max-h-48"
              />
            ) : mensagem.tipo === 'audio' && mensagem.metadadosArquivo?.url ? (
              <audio src={mensagem.metadadosArquivo.url} controls className="w-full max-w-xs" />
            ) : mensagem.tipo === 'arquivo' && mensagem.metadadosArquivo?.url ? (
              <a
                href={mensagem.metadadosArquivo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm underline opacity-80 hover:opacity-100"
              >
                📎 {mensagem.metadadosArquivo.nome || 'Baixar arquivo'}
              </a>
            ) : textoExibido ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{textoExibido}</p>
            ) : (
              <div className="flex items-center gap-2 opacity-50">
                <span className="text-xs">🔒</span>
                <span className="text-xs italic">Mensagem criptografada</span>
              </div>
            )}

            {/* Horário e status */}
            <div className={`flex items-center gap-1 mt-1 ${ePropia ? 'justify-end' : 'justify-start'}`}>
              <span className="text-xs opacity-60">
                {formatarHoraMensagem(mensagem.createdAt)}
              </span>
              {ePropia && <StatusLeitura mensagem={mensagem} />}
            </div>
          </div>
        </div>

        {/* Reações */}
        {mensagem.reacoes?.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${ePropia ? 'justify-end' : 'justify-start'}`}>
            {agruparReacoes(mensagem.reacoes).map(({ emoji, quantidade }) => (
              <span
                key={emoji}
                className="bg-escuro-700 border border-escuro-600 rounded-full px-2 py-0.5 text-xs"
              >
                {emoji} {quantidade > 1 && quantidade}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StatusLeitura({ mensagem }) {
  const foiLida = mensagem.statusEntrega?.some((s) => s.lido);
  const foiEntregue = mensagem.statusEntrega?.some((s) => s.entregue);
  if (foiLida) return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
  if (foiEntregue) return <CheckCheck className="w-3.5 h-3.5 opacity-60" />;
  return <Check className="w-3.5 h-3.5 opacity-40" />;
}

function agruparReacoes(reacoes) {
  const mapa = {};
  reacoes.forEach((r) => { mapa[r.emoji] = (mapa[r.emoji] || 0) + 1; });
  return Object.entries(mapa).map(([emoji, quantidade]) => ({ emoji, quantidade }));
}
