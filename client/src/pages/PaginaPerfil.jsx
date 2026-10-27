/**
 * GhostTalk — Página de Perfil do Usuário
 * Permite editar foto, nome de exibição, status e configurações de privacidade.
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Save, User, Globe, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function PaginaPerfil() {
  const { usuario, atualizarUsuario } = useAuth();
  const navigate = useNavigate();
  const inputFotoRef = useRef(null);

  const [formulario, setFormulario] = useState({
    nomeExibicao: usuario?.nomeExibicao || '',
    status: usuario?.status || '',
  });
  const [privacidade, setPrivacidade] = useState(
    usuario?.privacidade || { perfilInvisivel: false, mostrarStatus: true }
  );
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const handleFotoChange = async (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    if (arquivo.size > 5 * 1024 * 1024) {
      toast.error('Foto muito grande. Máximo: 5 MB');
      return;
    }

    setEnviandoFoto(true);
    const formData = new FormData();
    formData.append('foto', arquivo);

    try {
      const { data } = await api.post('/upload/foto-perfil', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      atualizarUsuario({ fotoPerfil: data.url });
      toast.success('Foto atualizada!');
    } catch {
      toast.error('Erro ao fazer upload da foto');
    } finally {
      setEnviandoFoto(false);
    }
  };

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const { data } = await api.patch('/usuarios/perfil', {
        nomeExibicao: formulario.nomeExibicao,
        status: formulario.status,
        privacidade,
      });
      atualizarUsuario(data);
      toast.success('Perfil atualizado!');
    } catch {
      toast.error('Erro ao salvar perfil');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-escuro-950 p-4">
      <div className="max-w-xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-escuro-700 text-escuro-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-white">Meu Perfil</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Foto de perfil */}
          <div className="bg-escuro-800 rounded-2xl p-6 border border-escuro-700 text-center">
            <div className="relative inline-block mb-4">
              <Avatar
                nome={usuario?.nomeExibicao || usuario?.nomeUsuario}
                foto={usuario?.fotoPerfil}
                tamanho="xl"
              />
              <button
                onClick={() => inputFotoRef.current?.click()}
                disabled={enviandoFoto}
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-fantasma-600 hover:bg-fantasma-500 text-white transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input
                ref={inputFotoRef}
                type="file"
                accept="image/*"
                onChange={handleFotoChange}
                className="hidden"
              />
            </div>

            <h2 className="font-bold text-white text-lg">
              {usuario?.nomeExibicao || usuario?.nomeUsuario}
            </h2>
            <p className="text-escuro-400 text-sm">@{usuario?.nomeUsuario}</p>

            {enviandoFoto && (
              <p className="text-xs text-fantasma-400 mt-2">Enviando foto...</p>
            )}
          </div>

          {/* Informações editáveis */}
          <div className="bg-escuro-800 rounded-2xl p-6 border border-escuro-700 space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-fantasma-400" />
              Informações
            </h3>

            <div>
              <label className="block text-sm text-escuro-300 mb-1">Nome de exibição</label>
              <input
                type="text"
                value={formulario.nomeExibicao}
                onChange={(e) => setFormulario((f) => ({ ...f, nomeExibicao: e.target.value }))}
                placeholder="Como você quer ser chamado"
                maxLength={50}
                className="campo-texto"
              />
            </div>

            <div>
              <label className="block text-sm text-escuro-300 mb-1">Status</label>
              <input
                type="text"
                value={formulario.status}
                onChange={(e) => setFormulario((f) => ({ ...f, status: e.target.value }))}
                placeholder="Disponível, Ocupado..."
                maxLength={100}
                className="campo-texto"
              />
            </div>
          </div>

          {/* Privacidade */}
          <div className="bg-escuro-800 rounded-2xl p-6 border border-escuro-700 space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-fantasma-400" />
              Privacidade
            </h3>

            {[
              {
                campo: 'perfilInvisivel',
                label: 'Perfil invisível',
                descricao: 'Outros usuários não podem encontrar seu perfil',
              },
              {
                campo: 'mostrarStatus',
                label: 'Mostrar status',
                descricao: 'Exibir seu status para outros usuários',
              },
            ].map(({ campo, label, descricao }) => (
              <label key={campo} className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="text-xs text-escuro-400">{descricao}</p>
                </div>
                <div
                  onClick={() =>
                    setPrivacidade((p) => ({ ...p, [campo]: !p[campo] }))
                  }
                  className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${
                    privacidade[campo] ? 'bg-fantasma-600' : 'bg-escuro-600'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      privacidade[campo] ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </div>
              </label>
            ))}
          </div>

          {/* Botão salvar */}
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="btn-primario w-full py-3 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
