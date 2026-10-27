/**
 * GhostTalk — Tela de Carregamento
 * Exibida enquanto a sessão está sendo verificada.
 */

export default function CarregandoTela() {
  return (
    <div className="min-h-screen bg-escuro-950 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4">👻</div>
        <div className="w-8 h-8 border-2 border-fantasma-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-escuro-400 text-sm mt-4">Carregando GhostTalk...</p>
      </div>
    </div>
  );
}
