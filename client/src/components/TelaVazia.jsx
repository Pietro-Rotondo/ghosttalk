/**
 * GhostTalk — Tela Vazia (nenhuma conversa selecionada)
 * Exibida no desktop quando nenhuma conversa está ativa.
 */

import { Ghost, Lock, Shield } from 'lucide-react';

export default function TelaVazia() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="text-8xl mb-6 animate-pulse-suave select-none">👻</div>

      <h2 className="text-2xl font-bold text-white mb-2">GhostTalk</h2>
      <p className="text-escuro-400 max-w-sm leading-relaxed mb-8">
        Selecione uma conversa na barra lateral ou inicie uma nova conversa para começar a trocar mensagens.
      </p>

      {/* Badges de recursos de segurança */}
      <div className="flex flex-wrap justify-center gap-3">
        {[
          { icon: Lock, texto: 'Criptografia E2EE' },
          { icon: Shield, texto: 'Sem rastreamento' },
          { icon: Ghost, texto: 'Perfis anônimos' },
        ].map(({ icon: Icone, texto }) => (
          <div
            key={texto}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-escuro-700/50 border border-escuro-600 text-sm text-escuro-400"
          >
            <Icone className="w-3.5 h-3.5 text-fantasma-400" />
            {texto}
          </div>
        ))}
      </div>
    </div>
  );
}
