/**
 * GhostTalk — Modal de Verificação de Fingerprint
 * Exibe o fingerprint criptográfico da conversa para que os participantes
 * possam confirmar que não houve interceptação (MITM).
 */

import { useState, useEffect } from 'react';
import { X, ShieldCheck, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { gerarFingerprintConversa, obterParDeChaves } from '../utils/criptografia';

export default function ModalFingerprint({ conversa, onFechar }) {
  const { usuario } = useAuth();
  const [fingerprint, setFingerprint] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const calcular = async () => {
      try {
        const chaves = obterParDeChaves();
        if (!chaves) {
          setErro('Chaves não encontradas neste dispositivo');
          return;
        }

        // Para conversa individual: fingerprint entre os dois participantes
        if (conversa.tipo === 'individual') {
          const outroParticipante = conversa.participantes?.find(
            (p) => (p.usuarioId?._id || p.usuarioId?.id) !== (usuario._id || usuario.id)
          );
          const chavePublicaOutro = outroParticipante?.usuarioId?.chavePublica;

          if (!chavePublicaOutro) {
            setErro('Chave pública do contato não disponível');
            return;
          }

          const fp = await gerarFingerprintConversa(chaves.chavePublica, chavePublicaOutro);
          setFingerprint(fp);
        } else {
          setErro('Fingerprint disponível apenas em conversas individuais');
        }
      } catch (e) {
        setErro('Erro ao calcular fingerprint');
      }
    };

    calcular();
  }, [conversa, usuario]);

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
          <div className="flex items-center justify-between p-5 border-b border-escuro-700">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-400" />
              <h2 className="font-semibold text-white">Verificar Segurança</h2>
            </div>
            <button
              onClick={onFechar}
              className="p-1.5 rounded-lg hover:bg-escuro-700 text-escuro-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {erro ? (
              <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                <p className="text-sm text-yellow-300">{erro}</p>
              </div>
            ) : fingerprint ? (
              <>
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium text-green-300">
                      Código de segurança da conversa
                    </span>
                  </div>
                  {/* Fingerprint formatado em blocos */}
                  <div className="font-mono text-sm text-white bg-escuro-900 rounded-lg p-3 text-center leading-relaxed tracking-wider break-all">
                    {fingerprint}
                  </div>
                </div>

                <div className="space-y-2 text-xs text-escuro-400">
                  <p className="font-medium text-escuro-300">Como verificar:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Peça ao seu contato para abrir este mesmo painel</li>
                    <li>Compare os códigos — eles devem ser idênticos</li>
                    <li>Se forem diferentes, a conversa pode ter sido interceptada</li>
                  </ol>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="w-6 h-6 border-2 border-fantasma-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-escuro-400 mt-2">Calculando fingerprint...</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
