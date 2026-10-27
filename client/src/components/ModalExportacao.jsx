/**
 * GhostTalk — Modal de Exportação de Histórico
 * Permite exportar o histórico da conversa nos formatos JSON, TXT e HTML
 * com criptografia opcional por senha.
 */

import { useState } from 'react';
import { X, Download, FileJson, FileText, FileCode, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { exportarComoJSON, exportarComoTXT, exportarComoHTML } from '../utils/exportacao';
import toast from 'react-hot-toast';

export default function ModalExportacao({ conversa, mensagens, onFechar }) {
  const { usuario } = useAuth();
  const [formato, setFormato] = useState('json');
  const [criptografar, setCriptografar] = useState(false);
  const [senha, setSenha] = useState('');
  const [exportando, setExportando] = useState(false);

  const formatos = [
    { id: 'json', label: 'JSON', descricao: 'Estruturado, ideal para importação', icon: FileJson },
    { id: 'txt', label: 'TXT', descricao: 'Texto simples, fácil de ler', icon: FileText },
    { id: 'html', label: 'HTML', descricao: 'Formatado com visual do chat', icon: FileCode },
  ];

  const handleExportar = async () => {
    if (criptografar && !senha.trim()) {
      toast.error('Informe uma senha para criptografar o arquivo');
      return;
    }

    setExportando(true);
    const nomeUsuario = usuario?.nomeExibicao || usuario?.nomeUsuario;
    const senhaCripto = criptografar ? senha : null;

    try {
      switch (formato) {
        case 'json':
          await exportarComoJSON(conversa, mensagens, nomeUsuario, senhaCripto);
          break;
        case 'txt':
          await exportarComoTXT(conversa, mensagens, nomeUsuario, senhaCripto);
          break;
        case 'html':
          await exportarComoHTML(conversa, mensagens, nomeUsuario, senhaCripto);
          break;
      }
      toast.success('Histórico exportado com sucesso!');
      onFechar();
    } catch (erro) {
      toast.error('Erro ao exportar: ' + erro.message);
    } finally {
      setExportando(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onFechar}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-escuro-800 rounded-2xl border border-escuro-700 shadow-2xl"
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between p-5 border-b border-escuro-700">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-fantasma-400" />
              <h2 className="font-semibold text-white">Exportar histórico</h2>
            </div>
            <button
              onClick={onFechar}
              className="p-1.5 rounded-lg hover:bg-escuro-700 text-escuro-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Seleção de formato */}
            <div>
              <label className="block text-sm font-medium text-escuro-300 mb-3">
                Formato de exportação
              </label>
              <div className="grid grid-cols-3 gap-2">
                {formatos.map(({ id, label, descricao, icon: Icone }) => (
                  <button
                    key={id}
                    onClick={() => setFormato(id)}
                    className={`
                      flex flex-col items-center gap-2 p-3 rounded-xl border transition-all
                      ${formato === id
                        ? 'border-fantasma-500 bg-fantasma-600/10 text-fantasma-300'
                        : 'border-escuro-600 hover:border-escuro-500 text-escuro-400 hover:text-white'
                      }
                    `}
                  >
                    <Icone className="w-5 h-5" />
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-escuro-500">
                {formatos.find((f) => f.id === formato)?.descricao}
              </p>
            </div>

            {/* Opção de criptografia */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setCriptografar((v) => !v)}
                  className={`
                    relative w-10 h-6 rounded-full transition-colors
                    ${criptografar ? 'bg-fantasma-600' : 'bg-escuro-600'}
                  `}
                >
                  <div
                    className={`
                      absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                      ${criptografar ? 'translate-x-4' : 'translate-x-0.5'}
                    `}
                  />
                </div>
                <div>
                  <span className="text-sm font-medium text-white flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-fantasma-400" />
                    Criptografar arquivo
                  </span>
                  <p className="text-xs text-escuro-500">Protege o arquivo com uma senha</p>
                </div>
              </label>

              {criptografar && (
                <motion.input
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Senha para criptografar"
                  className="campo-texto"
                />
              )}
            </div>

            {/* Informações */}
            <div className="bg-escuro-700/50 rounded-xl p-3 text-xs text-escuro-400 space-y-1">
              <p>📦 {mensagens.filter((m) => !m.apagada).length} mensagem(s) serão exportadas</p>
              <p>🔒 Apenas mensagens descriptografadas localmente serão incluídas</p>
            </div>

            {/* Botão exportar */}
            <button
              onClick={handleExportar}
              disabled={exportando}
              className="btn-primario w-full py-3 disabled:opacity-50"
            >
              {exportando ? 'Exportando...' : `Baixar como ${formato.toUpperCase()}`}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
