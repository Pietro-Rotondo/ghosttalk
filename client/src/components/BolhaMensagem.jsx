/**
 * GhostTalk — Componente Bolha de Mensagem
 * Renderiza uma mensagem individual com animação e metadados.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCheck, Trash2, Reply, SmilePlus, Pin } from 'lucide-react';
import { formatarHoraMensagem } from '../utils/formatacao';

export default function BolhaMensagem({ mensagem, ePropia, mostrarAutor }) {
  const [mostrarReacoes, setMostrarReacoes] = useState(false);

  const textoExibido = mensagem.apagada
    ? null
    : mensagem.textoDescriptografado || null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.15 }}
      className={`flex ${ePropia ? 'justify-end' : 'justify-start'} group mb-1`}
    >
      <div className={`max-w-[75%] ${ePropia ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Nome do autor (apenas em grupos) */}
        {mostrarAutor && !ePropia && (
          <span className="text-xs font-semibold text-fantasma-400 ml-1 mb-0.5">
            {mensagem.remetenteId?.nomeExibicao || mensagem.remetenteId?.nomeUsuario}
          </span>
        )}

        {/* Mensagem fixada */}
        {mensagem.fixada && (
          <div className="flex items-center gap-1 text-xs text-yellow-400 mb-1 ml-1">
            <Pin className="w-3 h-3" />
            <span>Fixada</span>
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
          {/* Mensagem apagada */}
          {mensagem.apagada ? (
            <div className="flex items-center gap-2 opacity-60 italic">
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-sm">Mensagem apagada</span>
            </div>
          ) : textoExibido ? (
            /* Texto descriptografado */
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {textoExibido}
            </p>
          ) : (
            /* Não foi possível descriptografar */
            <div className="flex items-center gap-2 opacity-50">
              <span className="text-xs">🔒</span>
              <span className="text-xs italic">Mensagem criptografada</span>
            </div>
          )}

          {/* Metadados: horário e status de leitura */}
          <div className={`flex items-center gap-1 mt-1 ${ePropia ? 'justify-end' : 'justify-start'}`}>
            <span className="text-xs opacity-60">
              {formatarHoraMensagem(mensagem.createdAt)}
            </span>
            {ePropia && <StatusLeitura mensagem={mensagem} />}
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

/**
 * Ícone de status de leitura/entrega.
 */
function StatusLeitura({ mensagem }) {
  const foiLida = mensagem.statusEntrega?.some((s) => s.lido);
  const foiEntregue = mensagem.statusEntrega?.some((s) => s.entregue);

  if (foiLida) {
    return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
  }
  if (foiEntregue) {
    return <CheckCheck className="w-3.5 h-3.5 opacity-60" />;
  }
  return <Check className="w-3.5 h-3.5 opacity-40" />;
}

/**
 * Agrupa reações iguais contando o total.
 */
function agruparReacoes(reacoes) {
  const mapa = {};
  reacoes.forEach((r) => {
    mapa[r.emoji] = (mapa[r.emoji] || 0) + 1;
  });
  return Object.entries(mapa).map(([emoji, quantidade]) => ({ emoji, quantidade }));
}
