/**
 * GhostTalk — Página de Configurações
 * Tema, segurança (2FA), logout global e gerenciamento de sessões.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sun, Moon, Shield, LogOut, Smartphone, Key, QrCode } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function PaginaConfiguracoes() {
  const { usuario, logoutTodosDispositivos } = useAuth();
  const { tema, alternarTema } = useTheme();
  const navigate = useNavigate();

  const [qrCode2FA, setQrCode2FA] = useState(null);
  const [codTotp, setCodTotp] = useState('');
  const [configurando2FA, setConfigurando2FA] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const iniciarConfiguracao2FA = async () => {
    setCarregando(true);
    try {
      const { data } = await api.post('/auth/2fa/configurar');
      setQrCode2FA(data.qrCode);
      setConfigurando2FA(true);
    } catch {
      toast.error('Erro ao configurar 2FA');
    } finally {
      setCarregando(false);
    }
  };

  const ativar2FA = async () => {
    if (codTotp.length !== 6) {
      toast.error('Informe o código de 6 dígitos');
      return;
    }
    setCarregando(true);
    try {
      await api.post('/auth/2fa/ativar', { codigoTotp: codTotp });
      toast.success('2FA ativado com sucesso!');
      setQrCode2FA(null);
      setConfigurando2FA(false);
      setCodTotp('');
    } catch (erro) {
      toast.error(erro.response?.data?.erro || 'Código inválido');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-escuro-950 p-4">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-escuro-700 text-escuro-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-white">Configurações</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Aparência */}
          <section className="bg-escuro-800 rounded-2xl p-5 border border-escuro-700">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              {tema === 'escuro' ? (
                <Moon className="w-4 h-4 text-fantasma-400" />
              ) : (
                <Sun className="w-4 h-4 text-yellow-400" />
              )}
              Aparência
            </h2>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-white">Tema</p>
                <p className="text-xs text-escuro-400">
                  Atualmente: {tema === 'escuro' ? 'Escuro' : 'Claro'}
                </p>
              </div>
              <button
                onClick={alternarTema}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-escuro-700 hover:bg-escuro-600 text-sm text-white transition-colors"
              >
                {tema === 'escuro' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {tema === 'escuro' ? 'Claro' : 'Escuro'}
              </button>
            </label>
          </section>

          {/* Segurança — 2FA */}
          <section className="bg-escuro-800 rounded-2xl p-5 border border-escuro-700">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-fantasma-400" />
              Segurança
            </h2>

            {!configurando2FA ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">
                    Autenticação em dois fatores (2FA)
                  </p>
                  <p className="text-xs text-escuro-400">
                    Proteção extra com Google Authenticator
                  </p>
                </div>
                <button
                  onClick={iniciarConfiguracao2FA}
                  disabled={carregando}
                  className="btn-secundario flex items-center gap-2 text-xs"
                >
                  <Key className="w-3.5 h-3.5" />
                  Configurar
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-escuro-300">
                  Escaneie o QR Code no Google Authenticator ou outro app TOTP:
                </p>
                {qrCode2FA && (
                  <div className="flex justify-center">
                    <img
                      src={qrCode2FA}
                      alt="QR Code 2FA"
                      className="w-48 h-48 rounded-xl border-4 border-white"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs text-escuro-300">
                    Código de verificação (6 dígitos)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={codTotp}
                    onChange={(e) => setCodTotp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="campo-texto text-center text-xl tracking-widest font-mono"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setConfigurando2FA(false); setQrCode2FA(null); }}
                    className="btn-secundario flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={ativar2FA}
                    disabled={carregando || codTotp.length !== 6}
                    className="btn-primario flex-1"
                  >
                    {carregando ? 'Ativando...' : 'Ativar 2FA'}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Sessões */}
          <section className="bg-escuro-800 rounded-2xl p-5 border border-escuro-700">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-fantasma-400" />
              Sessões
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Encerrar todas as sessões</p>
                <p className="text-xs text-escuro-400">
                  Desconecta de todos os dispositivos simultaneamente
                </p>
              </div>
              <button
                onClick={async () => {
                  await logoutTodosDispositivos();
                  navigate('/login');
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-sm transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair de tudo
              </button>
            </div>
          </section>

          {/* Informações do app */}
          <section className="bg-escuro-800 rounded-2xl p-5 border border-escuro-700">
            <div className="text-center text-escuro-500 text-xs space-y-1">
              <p className="text-2xl mb-2">👻</p>
              <p className="font-medium text-escuro-400">GhostTalk v1.0.0</p>
              <p>Criptografia: TweetNaCl (Curve25519-XSalsa20-Poly1305)</p>
              <p>Código aberto · Sem rastreamento · Zero logs</p>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
