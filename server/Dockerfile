# ============================================================
# GhostTalk — Dockerfile do Servidor (Node.js)
# Imagem base: Red Hat UBI9 minimal (conforme política de segurança IBM)
# ============================================================

FROM registry.redhat.io/ubi9/nodejs-20-minimal:latest

# Metadados
LABEL maintainer="GhostTalk" \
      description="Servidor backend do GhostTalk — mensagens seguras E2EE"

# Diretório de trabalho
WORKDIR /app

# Copia apenas os arquivos de dependências primeiro (cache do Docker)
COPY package*.json ./

# Instala dependências de produção
RUN npm ci --omit=dev

# Copia o restante do código-fonte
COPY . .

# Cria diretório de uploads
RUN mkdir -p uploads logs

# Garante que o usuário não-root padrão da imagem UBI tenha acesso
RUN chown -R 1001:1001 /app

# Usuário não-root (obrigatório por política de segurança)
USER 1001

# Porta exposta
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:4000/api/health || exit 1

# Comando de inicialização
CMD ["node", "src/index.js"]
