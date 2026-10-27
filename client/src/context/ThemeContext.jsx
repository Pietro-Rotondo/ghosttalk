/**
 * GhostTalk — Contexto de Tema
 * Gerencia alternância entre dark mode (padrão) e light mode.
 */

import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Dark mode é o padrão conforme especificação
  const [tema, setTema] = useState(() => {
    return localStorage.getItem('ghosttalk_tema') || 'escuro';
  });

  useEffect(() => {
    const raiz = document.documentElement;
    if (tema === 'claro') {
      raiz.classList.remove('dark');
      raiz.classList.add('tema-claro');
    } else {
      raiz.classList.remove('tema-claro');
      raiz.classList.add('dark');
    }
    localStorage.setItem('ghosttalk_tema', tema);
  }, [tema]);

  const alternarTema = () => {
    setTema((anterior) => (anterior === 'escuro' ? 'claro' : 'escuro'));
  };

  return (
    <ThemeContext.Provider value={{ tema, alternarTema }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const contexto = useContext(ThemeContext);
  if (!contexto) throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  return contexto;
}
