/**
 * GhostTalk — Componente raiz da aplicação
 * Configura providers, rotas e tema global.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ChatProvider } from './context/ChatContext';
import PaginaLogin from './pages/PaginaLogin';
import PaginaCadastro from './pages/PaginaCadastro';
import PaginaChat from './pages/PaginaChat';
import PaginaPerfil from './pages/PaginaPerfil';
import PaginaConfiguracoes from './pages/PaginaConfiguracoes';
import PaginaConvite from './pages/PaginaConvite';
import CarregandoTela from './components/CarregandoTela';
import ErrorBoundary from './components/ErrorBoundary';

/**
 * Rota protegida — redireciona para login se não autenticado.
 */
function RotaProtegida({ children }) {
  const { usuario, carregando } = useAuth();

  if (carregando) return <CarregandoTela />;
  if (!usuario) return <Navigate to="/login" replace />;

  return children;
}

/**
 * Rota pública — redireciona para chat se já autenticado.
 */
function RotaPublica({ children }) {
  const { usuario, carregando } = useAuth();

  if (carregando) return <CarregandoTela />;
  if (usuario) return <Navigate to="/chat" replace />;

  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ChatProvider>
          <BrowserRouter>
            <Routes>
              {/* Rota raiz redireciona para chat */}
              <Route path="/" element={<Navigate to="/chat" replace />} />

              {/* Rotas públicas */}
              <Route
                path="/login"
                element={
                  <RotaPublica>
                    <PaginaLogin />
                  </RotaPublica>
                }
              />
              <Route
                path="/cadastro"
                element={
                  <RotaPublica>
                    <PaginaCadastro />
                  </RotaPublica>
                }
              />

              {/* Sala de convite — acessível sem login */}
              <Route path="/convite/:codigo" element={<PaginaConvite />} />

              {/* Rotas protegidas — o ErrorBoundary local isola falhas do chat
                  sem derrubar o restante do app */}
              <Route
                path="/chat"
                element={
                  <RotaProtegida>
                    <ErrorBoundary>
                      <PaginaChat />
                    </ErrorBoundary>
                  </RotaProtegida>
                }
              />
              <Route
                path="/chat/:conversaId"
                element={
                  <RotaProtegida>
                    <ErrorBoundary>
                      <PaginaChat />
                    </ErrorBoundary>
                  </RotaProtegida>
                }
              />
              <Route
                path="/perfil"
                element={
                  <RotaProtegida>
                    <PaginaPerfil />
                  </RotaProtegida>
                }
              />
              <Route
                path="/configuracoes"
                element={
                  <RotaProtegida>
                    <PaginaConfiguracoes />
                  </RotaProtegida>
                }
              />

              {/* 404 */}
              <Route path="*" element={<Navigate to="/chat" replace />} />
            </Routes>
          </BrowserRouter>

          {/* Notificações toast globais */}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#2b2d31',
                color: '#dcddde',
                border: '1px solid #3f4147',
                borderRadius: '8px',
                fontSize: '14px',
              },
              success: {
                iconTheme: { primary: '#7c3aed', secondary: '#fff' },
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#fff' },
              },
            }}
          />
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
