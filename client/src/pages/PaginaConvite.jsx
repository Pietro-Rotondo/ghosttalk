/**
 * GhostTalk — Página de Entrada em Sala Temporária via Convite
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Link2, Lock, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function PaginaConvite() {
  const { codigo } = useParams();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    // Redireciona para login se não autenticado, preservando o código de convite
    if (!usuario) {
      navigate(`/login?redirect=/convite/${codigo}`);
    }
  }, [usuario, codigo, navigate]);

  const entrarNaSala = async () => {
    setEntrando(true);
    try {
      const { data } = await api.post(`/grupos/entrar/${codigo}`);
      toast.success('Entrou na sala com sucesso!');
      navigate(`/chat/${data.conversa._id}`);
    } catch (erro) {
      const msg = erro.response?.data?.erro || 'Link inválido ou expirado';
      toast.error(msg);
      navigate('/chat');
    } finally {
      setEntrando(false);
    }
  };

  return (
    <div className="min-h-screen bg-escuro-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-escuro-800 rounded-2xl border border-escuro-700 p-8 text-center"
      >
        <div className="text-5xl mb-4">🔗</div>
        <h1 className="text-xl font-bold text-white mb-2">Convite para sala</h1>
        <p className="text-escuro-400 text-sm mb-2">
          Você foi convidado para uma sala de conversa temporária e segura.
        </p>
        <div className="flex items-center justify-center gap-1 text-xs text-escuro-500 mb-6">
          <Lock className="w-3 h-3" />
          <span>Criptografada ponta a ponta</span>
        </div>

        <button
          onClick={entrarNaSala}
          disabled={entrando || !usuario}
          className="btn-primario w-full py-3 flex items-center justify-center gap-2"
        >
          <LogIn className="w-4 h-4" />
          {entrando ? 'Entrando...' : 'Entrar na sala'}
        </button>

        <button
          onClick={() => navigate('/chat')}
          className="mt-3 w-full text-sm text-escuro-400 hover:text-white transition-colors"
        >
          Cancelar
        </button>
      </motion.div>
    </div>
  );
}
