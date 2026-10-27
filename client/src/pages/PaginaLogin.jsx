/**
 * GhostTalk — Página de Login
 * Interface de autenticação com suporte a 2FA.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, User, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function PaginaLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formulario, setFormulario] = useState({ nomeUsuario: '', senha: '' });
  const [codigoTotp, setCodigoTotp] = useState('');
  const [requer2FA, setRequer2FA] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCarregando(true);

    try {
      const dados = requer2FA
        ? { ...formulario, codigoTotp }
        : formulario;

      const resultado = await login(dados);

      if (resultado?.requer2FA) {
        setRequer2FA(true);
        toast('Informe o código do seu autenticador', { icon: '🔐' });
      } else {
        navigate('/chat');
      }
    } catch (erro) {
      const mensagem = erro.response?.data?.erro || 'Erro ao fazer login';
      toast.error(mensagem);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-escuro-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        {/* Logo e título */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">👻</div>
          <h1 className="text-3xl font-bold text-white mb-1">GhostTalk</h1>
          <p className="text-escuro-400 text-sm">Mensagens privadas com criptografia ponta a ponta</p>
        </div>

        {/* Card de login */}
        <div className="bg-escuro-800 rounded-2xl p-8 border border-escuro-700 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">
            {requer2FA ? 'Verificação em dois fatores' : 'Entrar na sua conta'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!requer2FA ? (
              <>
                {/* Campo nome de usuário */}
                <div>
                  <label className="block text-sm font-medium text-escuro-300 mb-1">
                    Nome de usuário
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-escuro-400" />
                    <input
                      type="text"
                      value={formulario.nomeUsuario}
                      onChange={(e) =>
                        setFormulario((f) => ({ ...f, nomeUsuario: e.target.value.toLowerCase() }))
                      }
                      placeholder="seu_usuario"
                      required
                      autoComplete="username"
                      className="campo-texto pl-9"
                    />
                  </div>
                </div>

                {/* Campo senha */}
                <div>
                  <label className="block text-sm font-medium text-escuro-300 mb-1">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-escuro-400" />
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      value={formulario.senha}
                      onChange={(e) =>
                        setFormulario((f) => ({ ...f, senha: e.target.value }))
                      }
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="campo-texto pl-9 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-escuro-400 hover:text-white"
                    >
                      {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Campo 2FA */
              <div>
                <label className="block text-sm font-medium text-escuro-300 mb-1">
                  Código do autenticador (6 dígitos)
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fantasma-400" />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={codigoTotp}
                    onChange={(e) => setCodigoTotp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    required
                    autoFocus
                    className="campo-texto pl-9 text-center text-xl tracking-widest font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setRequer2FA(false)}
                  className="mt-2 text-xs text-escuro-400 hover:text-white underline"
                >
                  ← Voltar
                </button>
              </div>
            )}

            {/* Botão de login */}
            <button
              type="submit"
              disabled={carregando}
              className="btn-primario w-full py-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {carregando ? 'Entrando...' : requer2FA ? 'Verificar' : 'Entrar'}
            </button>
          </form>

          {/* Link para cadastro */}
          <p className="mt-6 text-center text-sm text-escuro-400">
            Não tem conta?{' '}
            <Link to="/cadastro" className="text-fantasma-400 hover:text-fantasma-300 font-medium">
              Criar conta
            </Link>
          </p>
        </div>

        {/* Badge de segurança */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-escuro-500">
          <Lock className="w-3 h-3" />
          <span>Criptografia E2EE · Zero logs · Código aberto</span>
        </div>
      </motion.div>
    </div>
  );
}
