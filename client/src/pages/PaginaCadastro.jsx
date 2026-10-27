/**
 * GhostTalk — Página de Cadastro
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, User, Mail, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// Critérios de força da senha
const CRITERIOS_SENHA = [
  { regex: /.{8,}/, texto: 'Mínimo 8 caracteres' },
  { regex: /[A-Z]/, texto: 'Uma letra maiúscula' },
  { regex: /[a-z]/, texto: 'Uma letra minúscula' },
  { regex: /[0-9]/, texto: 'Um número' },
];

export default function PaginaCadastro() {
  const { cadastrar } = useAuth();
  const navigate = useNavigate();

  const [formulario, setFormulario] = useState({
    nomeUsuario: '',
    senha: '',
    confirmarSenha: '',
    email: '',
    nomeExibicao: '',
  });
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const criteriosOk = CRITERIOS_SENHA.map((c) => c.regex.test(formulario.senha));
  const senhaForte = criteriosOk.every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!senhaForte) {
      toast.error('A senha não atende aos requisitos de segurança');
      return;
    }
    if (formulario.senha !== formulario.confirmarSenha) {
      toast.error('As senhas não coincidem');
      return;
    }

    setCarregando(true);
    try {
      await cadastrar({
        nomeUsuario: formulario.nomeUsuario,
        senha: formulario.senha,
        email: formulario.email || undefined,
        nomeExibicao: formulario.nomeExibicao || undefined,
      });
      navigate('/chat');
    } catch (erro) {
      toast.error(erro.response?.data?.erro || 'Erro ao criar conta');
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
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">👻</div>
          <h1 className="text-3xl font-bold text-white mb-1">GhostTalk</h1>
          <p className="text-escuro-400 text-sm">Crie sua conta anônima e segura</p>
        </div>

        <div className="bg-escuro-800 rounded-2xl p-8 border border-escuro-700 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">Criar nova conta</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome de usuário */}
            <div>
              <label className="block text-sm font-medium text-escuro-300 mb-1">
                Nome de usuário <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-escuro-400" />
                <input
                  type="text"
                  value={formulario.nomeUsuario}
                  onChange={(e) =>
                    setFormulario((f) => ({
                      ...f,
                      nomeUsuario: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''),
                    }))
                  }
                  placeholder="seu_usuario"
                  required
                  minLength={3}
                  maxLength={30}
                  className="campo-texto pl-9"
                />
              </div>
              <p className="mt-1 text-xs text-escuro-500">
                Apenas letras minúsculas, números, _, . e -
              </p>
            </div>

            {/* Nome de exibição (opcional) */}
            <div>
              <label className="block text-sm font-medium text-escuro-300 mb-1">
                Nome de exibição{' '}
                <span className="text-escuro-500 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={formulario.nomeExibicao}
                onChange={(e) =>
                  setFormulario((f) => ({ ...f, nomeExibicao: e.target.value }))
                }
                placeholder="Como você quer ser chamado"
                maxLength={50}
                className="campo-texto"
              />
            </div>

            {/* E-mail (opcional) */}
            <div>
              <label className="block text-sm font-medium text-escuro-300 mb-1">
                E-mail{' '}
                <span className="text-escuro-500 font-normal">(opcional, para recuperação)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-escuro-400" />
                <input
                  type="email"
                  value={formulario.email}
                  onChange={(e) =>
                    setFormulario((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="email@opcional.com"
                  className="campo-texto pl-9"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-escuro-300 mb-1">
                Senha <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-escuro-400" />
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={formulario.senha}
                  onChange={(e) =>
                    setFormulario((f) => ({ ...f, senha: e.target.value }))
                  }
                  placeholder="Senha forte"
                  required
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

              {/* Critérios de força da senha */}
              {formulario.senha && (
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {CRITERIOS_SENHA.map((c, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-1 text-xs ${
                        criteriosOk[i] ? 'text-green-400' : 'text-escuro-500'
                      }`}
                    >
                      <CheckCircle className="w-3 h-3" />
                      {c.texto}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirmar senha */}
            <div>
              <label className="block text-sm font-medium text-escuro-300 mb-1">
                Confirmar senha <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={formulario.confirmarSenha}
                onChange={(e) =>
                  setFormulario((f) => ({ ...f, confirmarSenha: e.target.value }))
                }
                placeholder="Repita a senha"
                required
                className={`campo-texto ${
                  formulario.confirmarSenha &&
                  formulario.senha !== formulario.confirmarSenha
                    ? 'border-red-500'
                    : ''
                }`}
              />
              {formulario.confirmarSenha && formulario.senha !== formulario.confirmarSenha && (
                <p className="mt-1 text-xs text-red-400">As senhas não coincidem</p>
              )}
            </div>

            <button
              type="submit"
              disabled={carregando || !senhaForte}
              className="btn-primario w-full py-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {carregando ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-escuro-400">
            Já tem conta?{' '}
            <Link to="/login" className="text-fantasma-400 hover:text-fantasma-300 font-medium">
              Fazer login
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
