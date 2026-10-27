/**
 * GhostTalk — Indicador de Digitação
 * Animação de três pontinhos com nome dos usuários que estão digitando.
 */

import { motion } from 'framer-motion';

export default function IndicadorDigitando({ usuarios }) {
  if (!usuarios || usuarios.length === 0) return null;

  const texto =
    usuarios.length === 1
      ? `${usuarios[0].nomeUsuario} está digitando`
      : `${usuarios.map((u) => u.nomeUsuario).join(', ')} estão digitando`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="flex items-center gap-2 px-2 py-1"
    >
      {/* Bolha com pontinhos animados */}
      <div className="flex items-center gap-1 bg-escuro-700 px-3 py-2 rounded-2xl rounded-bl-sm">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="digitando-ponto w-1.5 h-1.5 rounded-full bg-escuro-300 inline-block"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
      <span className="text-xs text-escuro-500 italic">{texto}</span>
    </motion.div>
  );
}
