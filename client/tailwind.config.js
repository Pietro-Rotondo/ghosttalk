/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class', // Suporte a dark/light mode via classe CSS
  theme: {
    extend: {
      fontFamily: {
        // Fontes modernas conforme especificação visual
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Paleta GhostTalk — dark mode como padrão
        fantasma: {
          50:  '#f0f0ff',
          100: '#e0e0ff',
          200: '#c4b5fd',
          300: '#a78bfa',
          400: '#8b5cf6',
          500: '#7c3aed',  // Roxo principal
          600: '#6d28d9',
          700: '#5b21b6',
          800: '#4c1d95',
          900: '#2e1065',
          950: '#1a0a3d',
        },
        // Tons escuros para fundos
        escuro: {
          50:  '#f8f9fa',
          100: '#e9ecef',
          200: '#dee2e6',
          300: '#adb5bd',
          400: '#6c757d',
          500: '#495057',
          600: '#343a40',
          700: '#2b2d31',  // Sidebar
          800: '#1e1f22',  // Fundo principal
          900: '#141517',  // Mais escuro
          950: '#0d0e10',  // Preto grafite
        },
        // Acentos vibrantes
        neon: {
          verde: '#39ff14',
          roxo: '#bf5fff',
          ciano: '#00ffff',
        },
      },
      animation: {
        'entrada-mensagem': 'entradaMensagem 0.2s ease-out',
        'pulsar-suave': 'pulsarSuave 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.15s ease-out',
      },
      keyframes: {
        entradaMensagem: {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        pulsarSuave: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
