/**
 * GhostTalk — Modal de Perfil
 * Exibe perfil de outro usuário ou info de grupo, com ações de gerenciamento.
 */

import { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Crown, UserMinus, Edit2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from './Avatar';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatarTempoRelativo } from '../utils/formatacao';
import { useChat } from '../context/ChatContext';
import { useNavigate } from 'react-router-dom';

export default function ModalPerfil({ conversa, usuario, onFechar }) {
  const { carregarConversas, setConversas } = useChat();
  const navigate = useNavigate();
  const [dadosGrupo, setDadosGrupo] = useState(null);
  const [editandoGrupo, setEditandoGrupo] = useState(false);
  const [nomeGrupo, setNomeGrupo] = useState('');
  const [descricaoGrupo, setDescricaoGrupo] = useState('');
  const [salvando, setSalvando] = useState(false);

  const ehGrupo = conversa.tipo === 'grupo';
  const meuPapel = conversa.participantes?.find(
    (p) => (p.usuarioId?._id || p.usuarioId?.id || p.usuarioId) === (usuario?._id || usuario?.id)
  )?.papel;
  const souAdmin = meuPapel === 'administrador';

  // Para conversa individual, pega o outro participante
  const outroParticipante = !ehGrupo
    ? conversa.participantes?.find((p) => {
        const id = p.usuarioId?._id || p.usuarioId?.id || p.usuarioId;
        const meuId = usuario?._id || usuario?.id;
        return id !== meuId && id?.toString() !== meuId?.toString();
      })?.usuarioId
    : null;

  useEffect(() => {
    if (ehGrupo) {
      setNomeGrupo(conversa.grupo?.nome || '');
      setDescricaoGrupo(conversa.grupo?.descricao || '');
    }
  }, [conversa, ehGrupo]);

  // ----------------------------------------------------------------
  // Salvar edição do grupo
  // ----------------------------------------------------------------
  const salvarGrupo = async () => {
    if (!nomeGrupo.trim()) { toast.error('Nome do grupo é obrigatório'); return; }
    setSalvando(true);
    try {
      await api.patch(`/grupos/${conversa._id}`, { nome: nomeGrupo, descricao: descricaoGrupo });
      await carregarConversas();
      setEditandoGrupo(false);
      toast.success('Grupo atualizado!');
    } catch {
      toast.error('Erro ao salvar grupo');
    } finally {
      setSalvando(false);
    }
  };

  // ----------------------------------------------------------------
  // Promover / rebaixar admin
  // ----------------------------------------------------------------
  const alterarAdmin = async (participanteId, promover) => {
    try {
      await api.patch(`/grupos/${conversa._id}/admin`, { participanteId, promover });
      await carregarConversas();
      toast.success(promover ? 'Usuário promovido a admin' : 'Admin rebaixado a membro');
    } catch {
      toast.error('Erro ao alterar admin');
    }
  };

  // ----------------------------------------------------------------
  // Remover participante do grupo
  // ----------------------------------------------------------------
  const removerParticipante = async (participanteId) => {
    if (!window.confirm('Remover este participante do grupo?')) return;
    try {
      await api.delete(`/grupos/${conversa._id}/participante/${participanteId}`);
      await carregarConversas();
      toast.success('Participante removido');
    } catch {
      toast.error('Erro ao remover participante');
    }
  };

  // ----------------------------------------------------------------
  // Excluir grupo
  // ----------------------------------------------------------------
  const excluirGrupo = async () => {
    if (!window.confirm('Excluir este grupo permanentemente?')) return;
    try {
      await api.delete(`/grupos/${conversa._id}`);
      setConversas((prev) => prev.filter((c) => c._id !== conversa._id));
      navigate('/chat');
      onFechar();
      toast.success('Grupo excluído');
    } catch {
      toast.error('Erro ao excluir grupo');
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onFechar}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-md bg-escuro-800 rounded-t-2xl sm:rounded-2xl border border-escuro-700 shadow-2xl max-h-[85vh] overflow-y-auto"
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between p-5 border-b border-escuro-700 sticky top-0 bg-escuro-800 z-10">
            <h2 className="font-semibold text-white">
              {ehGrupo ? 'Informações do grupo' : 'Perfil'}
            </h2>
            <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-escuro-700 text-escuro-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5">
            {ehGrupo ? (
              /* ---- GRUPO ---- */
              <div className="space-y-5">
                {/* Avatar e nome */}
                <div className="text-center">
                  <Avatar nome={conversa.grupo?.nome} foto={conversa.grupo?.fotoCapa} tamanho="xl" className="mx-auto mb-3" />

                  {editandoGrupo ? (
                    <div className="space-y-2">
                      <input
                        value={nomeGrupo}
                        onChange={(e) => setNomeGrupo(e.target.value)}
                        className="campo-texto text-center font-bold text-lg"
                        placeholder="Nome do grupo"
                        maxLength={100}
                      />
                      <textarea
                        value={descricaoGrupo}
                        onChange={(e) => setDescricaoGrupo(e.target.value)}
                        className="campo-texto text-sm resize-none"
                        placeholder="Descrição (opcional)"
                        rows={2}
                        maxLength={500}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setEditandoGrupo(false)} className="btn-secundario flex-1 text-sm">Cancelar</button>
                        <button onClick={salvarGrupo} disabled={salvando} className="btn-primario flex-1 text-sm">
                          {salvando ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-2">
                        <h3 className="text-xl font-bold text-white">{conversa.grupo?.nome}</h3>
                        {souAdmin && (
                          <button onClick={() => setEditandoGrupo(true)} className="p-1 text-escuro-400 hover:text-white">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {conversa.grupo?.descricao && (
                        <p className="text-sm text-escuro-400 mt-1">{conversa.grupo.descricao}</p>
                      )}
                      <p className="text-xs text-escuro-500 mt-1">{conversa.participantes?.length} participantes</p>
                    </>
                  )}
                </div>

                {/* Lista de participantes */}
                <div>
                  <h4 className="text-sm font-semibold text-escuro-300 mb-3">Participantes</h4>
                  <div className="space-y-1">
                    {conversa.participantes?.map((p) => {
                      const u = p.usuarioId;
                      const pId = u?._id || u?.id;
                      const ehEu = pId === (usuario?._id || usuario?.id);
                      const ehAdmin = p.papel === 'administrador';
                      return (
                        <div key={pId} className="flex items-center gap-3 p-2 rounded-xl hover:bg-escuro-700 transition-colors">
                          <Avatar nome={u?.nomeExibicao || u?.nomeUsuario} foto={u?.fotoPerfil} tamanho="sm" online={u?.online} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium text-white truncate">
                                {u?.nomeExibicao || u?.nomeUsuario}
                                {ehEu && <span className="text-escuro-400 font-normal"> (você)</span>}
                              </span>
                              {ehAdmin && <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
                            </div>
                            <p className="text-xs text-escuro-500">@{u?.nomeUsuario}</p>
                          </div>
                          {/* Ações de admin sobre outros membros */}
                          {souAdmin && !ehEu && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => alterarAdmin(pId, !ehAdmin)}
                                className="p-1.5 rounded-lg text-escuro-400 hover:text-yellow-400 hover:bg-escuro-600 transition-colors"
                                title={ehAdmin ? 'Rebaixar' : 'Promover a admin'}
                              >
                                {ehAdmin ? <UserMinus className="w-3.5 h-3.5" /> : <Crown className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => removerParticipante(pId)}
                                className="p-1.5 rounded-lg text-escuro-400 hover:text-red-400 hover:bg-escuro-600 transition-colors"
                                title="Remover do grupo"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Ações do grupo */}
                {souAdmin && (
                  <button
                    onClick={excluirGrupo}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600/10 border border-red-500/30 text-red-400 text-sm hover:bg-red-600/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir grupo
                  </button>
                )}
              </div>
            ) : (
              /* ---- PERFIL INDIVIDUAL ---- */
              <div className="text-center space-y-4">
                <Avatar
                  nome={outroParticipante?.nomeExibicao || outroParticipante?.nomeUsuario}
                  foto={outroParticipante?.fotoPerfil}
                  tamanho="xl"
                  online={outroParticipante?.online}
                  className="mx-auto"
                />
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {outroParticipante?.nomeExibicao || outroParticipante?.nomeUsuario}
                  </h3>
                  <p className="text-escuro-400 text-sm">@{outroParticipante?.nomeUsuario}</p>
                </div>

                {outroParticipante?.status && (
                  <div className="bg-escuro-700/50 rounded-xl px-4 py-3">
                    <p className="text-sm text-escuro-300 italic">"{outroParticipante.status}"</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-escuro-700/50 rounded-xl p-3 text-center">
                    <p className="text-xs text-escuro-500 mb-1">Status</p>
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${outroParticipante?.online ? 'bg-green-500' : 'bg-escuro-500'}`} />
                      <span className="text-white font-medium">
                        {outroParticipante?.online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  {!outroParticipante?.online && outroParticipante?.ultimaAtividade && (
                    <div className="bg-escuro-700/50 rounded-xl p-3 text-center">
                      <p className="text-xs text-escuro-500 mb-1">Última vez</p>
                      <p className="text-white font-medium text-xs">
                        {formatarTempoRelativo(outroParticipante.ultimaAtividade)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
