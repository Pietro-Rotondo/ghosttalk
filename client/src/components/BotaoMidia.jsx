/**
 * GhostTalk — Componente de Upload de Mídia
 * Suporte a imagens, vídeos, áudios e arquivos.
 * No plano gratuito do Render, arquivos são armazenados temporariamente.
 */

import { useRef, useState } from 'react';
import { Paperclip, Image, Film, Music, FileText, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const TIPOS_ACEITOS = {
  'image/*': { icone: Image, label: 'Imagem' },
  'video/*': { icone: Film, label: 'Vídeo' },
  'audio/*': { icone: Music, label: 'Áudio' },
  'application/pdf,text/*': { icone: FileText, label: 'Arquivo' },
};

const MAX_TAMANHO = 5 * 1024 * 1024; // 5 MB

export default function BotaoMidia({ onEnviarMidia, disabled }) {
  const inputRef = useRef(null);
  const [enviando, setEnviando] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleArquivo = async (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    if (arquivo.size > MAX_TAMANHO) {
      toast.error('Arquivo muito grande. Máximo: 5 MB');
      return;
    }

    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append('arquivo', arquivo);

      const { data } = await api.post('/upload/arquivo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Determina o tipo de mídia
      let tipo = 'arquivo';
      if (arquivo.type.startsWith('image/')) tipo = 'imagem';
      else if (arquivo.type.startsWith('video/')) tipo = 'video';
      else if (arquivo.type.startsWith('audio/')) tipo = 'audio';

      await onEnviarMidia({
        url: data.url,
        nome: arquivo.name,
        tamanho: arquivo.size,
        mimeType: arquivo.type,
      }, tipo);

      toast.success('Mídia enviada!');
    } catch {
      toast.error('Erro ao enviar arquivo. Tente novamente.');
    } finally {
      setEnviando(false);
      // Reset input para permitir reenvio do mesmo arquivo
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,audio/*,application/pdf,text/*"
        onChange={handleArquivo}
        className="hidden"
        disabled={enviando || disabled}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={enviando || disabled}
        className="p-2.5 rounded-xl hover:bg-escuro-700 text-escuro-400 hover:text-white transition-colors flex-shrink-0 mb-0.5 disabled:opacity-40"
        title="Enviar arquivo (máx. 5 MB)"
      >
        {enviando ? (
          <div className="w-5 h-5 border-2 border-fantasma-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Paperclip className="w-5 h-5" />
        )}
      </button>
    </>
  );
}
