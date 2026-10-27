/**
 * GhostTalk — Componente Avatar
 * Exibe foto de perfil ou iniciais coloridas como fallback.
 */

import { corDoAvatar, obterIniciais } from '../utils/formatacao';

const TAMANHOS = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
};

export default function Avatar({ nome, foto, tamanho = 'md', online = false, className = '' }) {
  const classesTamanho = TAMANHOS[tamanho] || TAMANHOS.md;
  const corFundo = corDoAvatar(nome);
  const iniciais = obterIniciais(nome);

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      {foto ? (
        <img
          src={foto}
          alt={nome || 'Avatar'}
          className={`${classesTamanho} rounded-full object-cover`}
          onError={(e) => {
            // Fallback para iniciais se a imagem falhar
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      ) : null}
      <div
        className={`
          ${classesTamanho} rounded-full
          flex items-center justify-center
          font-semibold text-white select-none
          ${foto ? 'hidden' : 'flex'}
        `}
        style={{ backgroundColor: corFundo }}
      >
        {iniciais}
      </div>

      {/* Indicador online */}
      {online && (
        <span
          className={`
            absolute bottom-0 right-0
            bg-green-500 border-2 border-escuro-900 rounded-full
            ${tamanho === 'xs' ? 'w-2 h-2' : tamanho === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'}
          `}
        />
      )}
    </div>
  );
}
