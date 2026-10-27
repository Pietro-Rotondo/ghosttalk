/**
 * GhostTalk — Error Boundary
 * Sem ele, qualquer exceção durante a renderização desmonta a árvore React
 * inteira e o usuário vê só uma tela vazia/cinza. Aqui mostramos uma tela de
 * recuperação em vez disso.
 */

import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    console.error('[GhostTalk] Erro de renderização:', erro, info?.componentStack);
  }

  render() {
    if (!this.state.erro) return this.props.children;

    return (
      <div className="min-h-screen bg-escuro-950 flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="text-5xl mb-4">👻</div>
          <h1 className="text-white text-lg font-semibold mb-2">Algo deu errado</h1>
          <p className="text-escuro-400 text-sm mb-6">
            Ocorreu um erro inesperado ao exibir esta tela. Suas mensagens continuam seguras.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => this.setState({ erro: null })}
              className="px-4 py-2 rounded-lg bg-escuro-700 hover:bg-escuro-600 text-white text-sm"
            >
              Tentar novamente
            </button>
            <button
              onClick={() => window.location.assign('/chat')}
              className="px-4 py-2 rounded-lg bg-fantasma-600 hover:bg-fantasma-500 text-white text-sm"
            >
              Recarregar app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
