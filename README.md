# 👻 GhostTalk — Mensagens Privadas com Criptografia Ponta a Ponta

> **Aplicativo de mensagens seguro, privado e anônimo — nenhuma mensagem pode ser lida pelo servidor.**

[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-cyan)](https://tailwindcss.com)
[![Licença MIT](https://img.shields.io/badge/Licença-MIT-purple)](LICENSE)

---

## 📋 Índice

1. [O que é o GhostTalk](#-o-que-é-o-ghosttalk)
2. [Funcionalidades](#-funcionalidades)
3. [Modelo de Segurança](#-modelo-de-segurança)
4. [Stack Tecnológica](#-stack-tecnológica)
5. [Estrutura do Projeto](#-estrutura-do-projeto)
6. [Instalação e Execução Local](#-instalação-e-execução-local)
7. [Configuração com Docker](#-configuração-com-docker)
8. [Deploy em Produção](#-deploy-em-produção)
9. [Variáveis de Ambiente](#-variáveis-de-ambiente)
10. [API Reference](#-api-reference)
11. [Sugestões de Melhorias Futuras](#-sugestões-de-melhorias-futuras)

---

## 🎯 O que é o GhostTalk

O **GhostTalk** é um aplicativo de mensagens focado em **privacidade total e anonimato**. Diferente de outros serviços, o GhostTalk implementa **criptografia ponta a ponta (E2EE)** de forma que **nem o servidor tem acesso ao conteúdo das mensagens**.

### Princípios fundamentais

| Princípio | Implementação |
|---|---|
| 🔒 **E2EE obrigatório** | Toda mensagem é criptografada no cliente antes de ser enviada |
| 👻 **Anonimato** | Cadastro sem e-mail obrigatório; perfil invisível disponível |
| 📊 **Zero logs** | Nenhum IP, analytics ou rastreador no servidor |
| 🗝️ **Chaves locais** | A chave privada do usuário NUNCA é enviada ao servidor |
| ⏰ **Auto-destruição** | Mensagens podem ser configuradas para se apagarem automaticamente |

---

## ✨ Funcionalidades

### Autenticação e Sessão
- ✅ Cadastro com nome de usuário único (e-mail opcional)
- ✅ Login protegido com bcrypt (salt rounds ≥ 12) + JWT
- ✅ Access token de curta duração (15min) + refresh token rotativo (7 dias)
- ✅ Sessão sincronizada entre múltiplos dispositivos
- ✅ Logout remoto de todos os dispositivos
- ✅ Autenticação em dois fatores (2FA/TOTP) com QR Code

### Perfil do Usuário
- ✅ Upload de foto de perfil
- ✅ Nome de exibição customizável
- ✅ Status personalizado
- ✅ Perfil invisível para não aparecer em buscas
- ✅ Configurações granulares de privacidade

### Mensagens em Tempo Real
- ✅ Chat individual (1-a-1) e grupos
- ✅ Indicador de digitação em tempo real ("fulano está digitando...")
- ✅ Confirmações de entrega (✓) e leitura (✓✓)
- ✅ Suporte a texto, imagens e arquivos
- ✅ Reações com emojis nas mensagens
- ✅ Mensagens com auto-destruição configurável
- ✅ Carregamento paginado do histórico (infinite scroll)
- ✅ Animações suaves de entrada de mensagens

### Criptografia E2EE
- ✅ **TweetNaCl.js** — biblioteca auditada (Curve25519-XSalsa20-Poly1305)
- ✅ Par de chaves gerado localmente no dispositivo do usuário
- ✅ Chave privada NUNCA enviada ao servidor
- ✅ Nonce único por mensagem (prevenção de replay)
- ✅ Fingerprint criptográfico para verificação de integridade
- ✅ Exportação de backup criptografado com senha (PBKDF2-SHA256)

### Exportação de Histórico
- ✅ Exportação em **JSON** (estruturado)
- ✅ Exportação em **TXT** (legível)
- ✅ Exportação em **HTML** (visual do chat)
- ✅ Criptografia opcional do arquivo com senha definida pelo usuário
- ✅ Proteção contra XSS no HTML exportado

### Interface
- ✅ Dark mode nativo como padrão (com opção de light mode)
- ✅ Layout responsivo: desktop (sidebar + chat) e mobile (abas)
- ✅ Design moderno com glassmorphism e animações suaves (Framer Motion)
- ✅ Picker de emojis integrado
- ✅ Avatar com iniciais coloridas como fallback

### Salas Temporárias
- ✅ Link de convite com expiração configurável
- ✅ Destruição automática da sala após uso (opcional)
- ✅ Sala com criptografia E2EE como qualquer outra conversa

---

## 🔐 Modelo de Segurança

### Criptografia de Mensagens (E2EE)

```
REMETENTE                          SERVIDOR                        DESTINATÁRIO
    │                                  │                                │
    │  1. Gera nonce aleatório          │                                │
    │  2. Criptografa com:              │                                │
    │     - Chave pública destinatário  │                                │
    │     - Chave privada local         │                                │
    │  3. Envia apenas o blob cifrado ──▶ Armazena blob cifrado          │
    │                                  │ (não consegue ler)             │
    │                                  │──── Retransmite blob ──────────▶│
    │                                  │                      4. Descriptografa com:
    │                                  │                         - Chave pública remetente
    │                                  │                         - Chave privada local
```

### Algoritmos Utilizados

| Uso | Algoritmo |
|---|---|
| Criptografia de mensagens | Curve25519-XSalsa20-Poly1305 (NaCl `box`) |
| Hash de senha | bcrypt (salt rounds = 12) |
| Tokens JWT | HS256 |
| KDF para backup | PBKDF2-SHA256 (100.000 iterações) |
| Fingerprint | SHA-256 |

### Requisitos de Segurança Implementados

- [x] Rate limiting: 5 tentativas de login/minuto por IP
- [x] Headers de segurança (Helmet.js)
- [x] CORS restritivo (somente domínios autorizados)
- [x] Sanitização de inputs (express-validator)
- [x] Senhas nunca em texto puro (bcrypt salt ≥ 12)
- [x] JWT de curta duração (15min) + refresh token rotativo
- [x] Secrets sempre em `.env`, nunca hardcoded
- [x] Servidor escuta em `127.0.0.1` (não `0.0.0.0`)
- [x] Logs sem dados sensíveis (Winston)
- [x] Erros genéricos em produção (sem vazamento de stack trace)
- [x] Containers executando como usuário não-root

---

## 🛠️ Stack Tecnológica

### Backend
| Tecnologia | Versão | Uso |
|---|---|---|
| Node.js | 20+ | Runtime |
| Express | 4.x | Framework HTTP |
| Socket.IO | 4.x | WebSocket |
| Mongoose | 8.x | ODM MongoDB |
| bcryptjs | 2.x | Hash de senhas |
| jsonwebtoken | 9.x | Autenticação JWT |
| otplib | 12.x | TOTP/2FA |
| Helmet | 7.x | Headers de segurança |
| express-rate-limit | 7.x | Rate limiting |
| Winston | 3.x | Logging |

### Frontend
| Tecnologia | Versão | Uso |
|---|---|---|
| React | 18 | Framework UI |
| Vite | 5 | Build tool |
| TailwindCSS | 3 | Estilização |
| TweetNaCl.js | 1.x | Criptografia E2EE |
| Socket.IO Client | 4.x | WebSocket |
| Framer Motion | 11 | Animações |
| React Router | 6 | Roteamento |
| Axios | 1.x | HTTP Client |
| Zustand | 4.x | Estado global |
| date-fns | 3.x | Formatação de datas |

---

## 📁 Estrutura do Projeto

```
ghosttalk/
├── client/                          # Frontend React/Vite
│   ├── src/
│   │   ├── components/              # Componentes reutilizáveis
│   │   │   ├── AreaChat.jsx         # Área principal do chat
│   │   │   ├── Avatar.jsx           # Avatar com fallback de iniciais
│   │   │   ├── BolhaMensagem.jsx    # Bolha de mensagem individual
│   │   │   ├── CampoEnvio.jsx       # Campo de digitação e envio
│   │   │   ├── CarregandoTela.jsx   # Splash screen
│   │   │   ├── IndicadorDigitando.jsx # Animação "está digitando"
│   │   │   ├── ModalExportacao.jsx  # Exportar histórico
│   │   │   ├── ModalFingerprint.jsx # Verificar integridade E2EE
│   │   │   ├── ModalNovaConversa.jsx # Iniciar/criar conversa
│   │   │   ├── Sidebar.jsx          # Lista de conversas
│   │   │   └── TelaVazia.jsx        # Tela sem conversa selecionada
│   │   ├── context/
│   │   │   ├── AuthContext.jsx      # Estado de autenticação
│   │   │   ├── ChatContext.jsx      # Estado do chat e mensagens
│   │   │   └── ThemeContext.jsx     # Dark/light mode
│   │   ├── hooks/
│   │   │   └── useSocket.js         # Hook de conexão Socket.IO
│   │   ├── pages/
│   │   │   ├── PaginaLogin.jsx      # Tela de login + 2FA
│   │   │   ├── PaginaCadastro.jsx   # Tela de cadastro
│   │   │   ├── PaginaChat.jsx       # Layout principal do chat
│   │   │   ├── PaginaConvite.jsx    # Entrada em sala temporária
│   │   │   ├── PaginaConfiguracoes.jsx # Configurações e 2FA
│   │   │   └── PaginaPerfil.jsx     # Edição de perfil
│   │   ├── utils/
│   │   │   ├── api.js               # Cliente Axios com interceptors JWT
│   │   │   ├── criptografia.js      # E2EE com TweetNaCl + exportação
│   │   │   ├── exportacao.js        # Exportação JSON/TXT/HTML
│   │   │   └── formatacao.js        # Data, texto, cores
│   │   ├── styles/
│   │   │   └── global.css           # TailwindCSS + tokens de design
│   │   ├── App.jsx                  # Rotas e providers
│   │   └── main.jsx                 # Ponto de entrada React
│   ├── Dockerfile                   # Build multi-stage + Nginx
│   ├── nginx.conf                   # Configuração Nginx para SPA
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/                          # Backend Node.js
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js    # Cadastro, login, 2FA, tokens
│   │   │   └── mensagensController.js # CRUD de mensagens E2EE
│   │   ├── middleware/
│   │   │   ├── autenticacao.js      # Verificação JWT
│   │   │   └── rateLimiter.js       # Rate limiting por rota
│   │   ├── models/
│   │   │   ├── Conversa.js          # Schema de conversa/grupo
│   │   │   ├── Mensagem.js          # Schema de mensagem (blob cifrado)
│   │   │   └── Usuario.js           # Schema de usuário + bcrypt
│   │   ├── routes/
│   │   │   ├── auth.js              # /api/auth/*
│   │   │   ├── grupos.js            # /api/grupos/*
│   │   │   ├── mensagens.js         # /api/mensagens/*
│   │   │   ├── upload.js            # /api/upload/*
│   │   │   └── usuarios.js          # /api/usuarios/*
│   │   ├── socket/
│   │   │   └── socketManager.js     # Eventos Socket.IO em tempo real
│   │   ├── utils/
│   │   │   ├── bancoDeDados.js      # Conexão MongoDB
│   │   │   ├── limpeza.js           # Limpeza de dados expirados
│   │   │   └── logger.js            # Winston (sem dados sensíveis)
│   │   ├── app.js                   # Configuração Express + middlewares
│   │   └── index.js                 # Ponto de entrada do servidor
│   ├── Dockerfile                   # Imagem Red Hat UBI9
│   ├── .env.example                 # Variáveis de ambiente documentadas
│   └── package.json
│
├── docker-compose.yml               # Orquestração completa
├── .gitignore
└── README.md                        # Este arquivo
```

---

## 🚀 Instalação e Execução Local

### Pré-requisitos

- Node.js 20+
- MongoDB 7+ (local ou Atlas)
- npm ou yarn

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/ghosttalk.git
cd ghosttalk
```

### 2. Configure o servidor

```bash
cd server

# Copie as variáveis de ambiente
cp .env.example .env

# Edite o .env com seus valores
nano .env   # ou use seu editor preferido

# Instale as dependências
npm install

# Inicie em modo desenvolvimento
npm run dev
```

### 3. Configure o cliente

```bash
cd ../client

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

### 4. Acesse o aplicativo

Abra [http://localhost:5173](http://localhost:5173) no navegador.

> O cliente Vite faz proxy automático das requisições `/api` para o servidor na porta 4000.

---

## 🐳 Configuração com Docker

### Execução completa com um único comando

```bash
cd ghosttalk

# Cria o arquivo de variáveis de ambiente
cp server/.env.example .env

# IMPORTANTE: Edite o .env e defina senhas seguras antes de continuar
nano .env

# Inicia todos os serviços
docker compose up --build
```

O Docker Compose sobe:
- **MongoDB** na porta 27017
- **Servidor** na porta 4000
- **Cliente** na porta 5173

### Comandos úteis

```bash
# Ver logs em tempo real
docker compose logs -f

# Reiniciar apenas o servidor
docker compose restart servidor

# Parar tudo e remover containers
docker compose down

# Parar e remover também os volumes (apaga os dados!)
docker compose down -v
```

---

## ☁️ Deploy em Produção

### Opção 1: Railway

1. Crie uma conta em [railway.app](https://railway.app)
2. Crie um novo projeto e conecte ao seu repositório GitHub
3. Adicione um banco de dados MongoDB no Railway
4. Configure as variáveis de ambiente (veja seção abaixo)
5. O Railway detecta automaticamente o `Dockerfile` e faz o deploy

```bash
# Instale o CLI do Railway (opcional)
npm install -g @railway/cli

# Login e deploy
railway login
railway up
```

### Opção 2: Render

1. Crie uma conta em [render.com](https://render.com)
2. **Backend**: New Web Service → conecte o repositório → Root Directory: `server`
3. **Frontend**: New Static Site → Root Directory: `client` → Build: `npm run build` → Publish: `dist`
4. **MongoDB**: Use [MongoDB Atlas](https://www.mongodb.com/atlas) (gratuito até 512 MB)

### Opção 3: Fly.io

```bash
# Instale o CLI do Fly
curl -L https://fly.io/install.sh | sh

# Deploy do servidor
cd server
fly launch
fly secrets set JWT_SECRET="sua-chave-secreta-aqui"
fly secrets set MONGODB_URI="sua-uri-mongodb"
fly deploy

# Deploy do cliente
cd ../client
fly launch
fly deploy
```

### HTTPS em Produção (Let's Encrypt com Nginx)

```bash
# Instale o Certbot
sudo apt install certbot python3-certbot-nginx

# Obtenha o certificado
sudo certbot --nginx -d seudominio.com

# Renova automaticamente (adicione ao cron)
echo "0 12 * * * root certbot renew --quiet" | sudo tee /etc/cron.d/certbot-renew
```

---

## 🔧 Variáveis de Ambiente

Crie o arquivo `server/.env` com base em `server/.env.example`:

| Variável | Descrição | Padrão |
|---|---|---|
| `PORT` | Porta do servidor | `4000` |
| `NODE_ENV` | Ambiente (`development` / `production`) | `development` |
| `MONGODB_URI` | URI de conexão MongoDB | — |
| `JWT_SECRET` | Segredo para access token (**altere em produção!**) | — |
| `JWT_EXPIRES_IN` | Validade do access token | `15m` |
| `JWT_REFRESH_SECRET` | Segredo para refresh token (**diferente do JWT_SECRET!**) | — |
| `JWT_REFRESH_EXPIRES_IN` | Validade do refresh token | `7d` |
| `CLIENT_URL` | URL do frontend (para CORS) | `http://localhost:5173` |
| `UPLOAD_DIR` | Diretório de uploads | `uploads` |
| `MAX_FILE_SIZE` | Tamanho máximo de upload (bytes) | `5242880` (5 MB) |
| `LOGIN_MAX_ATTEMPTS` | Tentativas máximas de login | `5` |
| `LOGIN_WINDOW_MS` | Janela de rate limiting (ms) | `60000` (1 min) |
| `CLEANUP_INTERVAL_MS` | Intervalo de limpeza automática (ms) | `3600000` (1h) |

> ⚠️ **NUNCA** comite o arquivo `.env` no repositório. Ele está no `.gitignore`.

---

## 📡 API Reference

### Autenticação

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/auth/cadastro` | Cadastrar novo usuário |
| `POST` | `/api/auth/login` | Fazer login |
| `POST` | `/api/auth/refresh` | Renovar access token |
| `POST` | `/api/auth/logout` | Logout do dispositivo atual |
| `POST` | `/api/auth/logout-todos` | Logout de todos os dispositivos |
| `POST` | `/api/auth/2fa/configurar` | Gerar QR Code para 2FA |
| `POST` | `/api/auth/2fa/ativar` | Ativar 2FA com código TOTP |
| `POST` | `/api/auth/2fa/desativar` | Desativar 2FA |

### Usuários

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/usuarios/perfil` | Perfil do usuário logado |
| `PATCH` | `/api/usuarios/perfil` | Atualizar perfil |
| `GET` | `/api/usuarios/buscar?q=nome` | Buscar usuários |
| `GET` | `/api/usuarios/:nomeUsuario` | Perfil público |

### Conversas e Grupos

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/grupos/conversas` | Listar conversas |
| `POST` | `/api/grupos/individual` | Iniciar conversa 1-a-1 |
| `POST` | `/api/grupos` | Criar grupo |
| `POST` | `/api/grupos/convite` | Gerar link de convite |
| `POST` | `/api/grupos/entrar/:codigo` | Entrar em sala por convite |
| `PATCH` | `/api/grupos/:id/auto-destruicao` | Configurar auto-destruição |

### Mensagens

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/mensagens/:conversaId` | Histórico paginado |
| `POST` | `/api/mensagens` | Enviar mensagem (REST fallback) |
| `PATCH` | `/api/mensagens/:id/lidas` | Marcar como lidas |
| `DELETE` | `/api/mensagens/:id` | Apagar mensagem |
| `PATCH` | `/api/mensagens/:id/fixar` | Fixar/desafixar |
| `POST` | `/api/mensagens/:id/reacao` | Reagir com emoji |

### WebSocket (Socket.IO)

| Evento (emitir) | Descrição |
|---|---|
| `enviarMensagem` | Envia mensagem criptografada |
| `digitando` | Indica digitação |
| `marcarComoLidas` | Marca mensagens como lidas |
| `adicionarReacao` | Adiciona/remove reação |

| Evento (receber) | Descrição |
|---|---|
| `novaMensagem` | Nova mensagem chegou |
| `usuarioDigitando` | Alguém está digitando |
| `mensagensLidas` | Mensagens foram lidas |
| `reacaoAtualizada` | Reações de uma mensagem foram atualizadas |
| `usuarioOnline` / `usuarioOffline` | Status de presença |

---

## 🔮 Sugestões de Melhorias Futuras

### Segurança e Privacidade
- **Ratchet de dupla catraca (Double Ratchet)**: Implementar o protocolo usado pelo Signal para perfect forward secrecy em nível de mensagem
- **Prova de conhecimento zero**: Autenticação sem revelar a senha diretamente ao servidor (SRP - Secure Remote Password)
- **Onion routing**: Suporte nativo a roteamento Tor para máximo anonimato
- **Self-destructing accounts**: Conta que se apaga automaticamente após período de inatividade

### Funcionalidades
- **Chamadas de voz/vídeo**: WebRTC com E2EE (baseado em DTLS-SRTP)
- **Stickers e GIFs**: Integração com Giphy ou pacotes próprios
- **Modo incógnito de sessão**: Navegar sem registrar histórico localmente
- **Notas privadas criptografadas**: Seção de bloco de notas para o próprio usuário
- **Importação de backup**: Restaurar conversas a partir de arquivo exportado
- **Notificações push**: Web Push API para notificações mesmo com app fechado
- **Auditoria local**: Log de acessos no próprio dispositivo do usuário
- **Tradução automática**: Traduzir mensagens in-loco preservando criptografia
- **Mensagens agendadas**: Programar envio para horário específico

### Infraestrutura
- **Federação**: Protocolo descentralizado (estilo Matrix/ActivityPub)
- **Servidor auto-hospedável**: Script de instalação em um clique para VPS própria
- **Sincronização de chaves**: Exportar/importar o par de chaves entre dispositivos de forma segura
- **Auditoria de código**: Contratação de auditoria de segurança independente
- **App mobile nativo**: React Native com as mesmas garantias de E2EE

### Performance
- **Service Workers**: Cache offline e sincronização em segundo plano
- **Paginação virtual**: Renderizar apenas as mensagens visíveis na tela (virtualização)
- **CDN para mídia**: Armazenar arquivos de mídia em CDN com URLs assinadas de curta duração
- **Compressão de imagens**: Redimensionamento server-side ou no cliente antes do upload

---

## 📄 Licença

Este projeto está licenciado sob a [Licença MIT](LICENSE).

---

## 🙏 Créditos

- **TweetNaCl.js** — Implementação auditada da biblioteca NaCl de criptografia
- **Signal Protocol** — Inspiração para o modelo de criptografia E2EE
- **Framer Motion** — Animações fluidas no React
- **TailwindCSS** — Estilização utilitária moderna

---

<div align="center">
  <p>👻 <strong>GhostTalk</strong> — Mensagens que existem apenas para quem deve vê-las.</p>
  <p><em>Código aberto · Sem rastreamento · Criptografado de ponta a ponta</em></p>
</div>
