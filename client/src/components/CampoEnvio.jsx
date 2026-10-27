/**
 * GhostTalk — Campo de Envio de Mensagens
 * Input com suporte a emoji, digitação em múltiplas linhas e envio com Enter.
 */

import { useState, useRef, useCallback } from 'react';
import { Send, Smile, Paperclip } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

export default function CampoEnvio({ conversaId, onEnviar, onDigitando }) {
  const [texto, setTexto] = useState('');
  const [emojiAberto, setEmojiAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef(null);
  const timerDigitandoRef = useRef(null);

  // ----------------------------------------------------------------
  // Gerencia indicador de digitação (throttled)
  // ----------------------------------------------------------------
  const handleTextoChange = useCallback(
    (e) => {
      const novoTexto = e.target.value;
      setTexto(novoTexto);

      // Emite "está digitando"
      if (novoTexto.length > 0) {
        onDigitando?.(true);

        // Para de emitir após 3 segundos de inatividade
        clearTimeout(timerDigitandoRef.current);
        timerDigitandoRef.current = setTimeout(() => {
          onDigitando?.(false);
        }, 3000);
      } else {
        onDigitando?.(false);
        clearTimeout(timerDigitandoRef.current);
      }
    },
    [onDigitando]
  );

  // ----------------------------------------------------------------
  // Envio da mensagem
  // ----------------------------------------------------------------
  const handleEnviar = useCallback(async () => {
    const textoLimpo = texto.trim();
    if (!textoLimpo || enviando) return;

    setEnviando(true);
    setTexto('');
    onDigitando?.(false);
    clearTimeout(timerDigitandoRef.current);

    try {
      await onEnviar(textoLimpo, 'texto');
    } catch {
      // Restaura o texto em caso de erro
      setTexto(textoLimpo);
    } finally {
      setEnviando(false);
      inputRef.current?.focus();
    }
  }, [texto, enviando, onEnviar, onDigitando]);

  // ----------------------------------------------------------------
  // Atalhos de teclado
  // ----------------------------------------------------------------
  const handleKeyDown = useCallback(
    (e) => {
      // Enter envia; Shift+Enter cria nova linha
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleEnviar();
      }
      if (e.key === 'Escape') {
        setEmojiAberto(false);
      }
    },
    [handleEnviar]
  );

  // ----------------------------------------------------------------
  // Inserção de emoji
  // ----------------------------------------------------------------
  const handleEmoji = useCallback((emojiData) => {
    setTexto((t) => t + emojiData.emoji);
    setEmojiAberto(false);
    inputRef.current?.focus();
  }, []);

  return (
    <div className="px-4 py-3 border-t border-escuro-700 bg-escuro-900 flex-shrink-0">
      {/* Picker de emoji */}
      {emojiAberto && (
        <div className="absolute bottom-20 right-4 z-50">
          <EmojiPicker
            onEmojiClick={handleEmoji}
            theme="dark"
            searchPlaceholder="Buscar emoji..."
            lazyLoadEmojis
            height={380}
            width={320}
          />
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Botão de emoji */}
        <button
          onClick={() => setEmojiAberto((v) => !v)}
          className="p-2.5 rounded-xl hover:bg-escuro-700 text-escuro-400 hover:text-white transition-colors flex-shrink-0 mb-0.5"
          title="Emojis"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Área de texto */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={texto}
            onChange={handleTextoChange}
            onKeyDown={handleKeyDown}
            placeholder="Mensagem criptografada..."
            rows={1}
            className="
              w-full px-4 py-3 rounded-2xl
              bg-escuro-700 border border-escuro-600 text-escuro-100
              placeholder-escuro-500 resize-none
              focus:outline-none focus:border-fantasma-500 focus:ring-1 focus:ring-fantasma-500
              transition-colors duration-150
              text-sm leading-relaxed
              max-h-32 overflow-y-auto
            "
            style={{
              // Auto-resize baseado no conteúdo
              height: 'auto',
              minHeight: '44px',
            }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
            }}
          />
        </div>

        {/* Botão enviar */}
        <button
          onClick={handleEnviar}
          disabled={!texto.trim() || enviando}
          className="
            p-2.5 rounded-xl flex-shrink-0 mb-0.5
            bg-fantasma-600 hover:bg-fantasma-500 text-white
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all duration-150 active:scale-95
          "
          title="Enviar mensagem (Enter)"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* Dica de atalho */}
      <p className="text-xs text-escuro-600 text-center mt-1">
        Enter para enviar · Shift+Enter para nova linha
      </p>
    </div>
  );
}
