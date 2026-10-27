# ============================================================
# GhostTalk — Dockerfile do Cliente (React/Vite)
# Stage 1: build | Stage 2: servir com Nginx
# ============================================================

# ----- Stage 1: Build -----
FROM registry.redhat.io/ubi9/nodejs-20-minimal:latest AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build da aplicação React
RUN npm run build

# ----- Stage 2: Servidor estático (Nginx) -----
FROM registry.redhat.io/ubi9/nginx-120:latest

# Copia o build gerado pelo Vite
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuração do Nginx para SPA (Single Page Application)
# Redireciona todas as rotas para index.html
COPY nginx.conf /etc/nginx/nginx.conf

# Usuário não-root
USER 1001

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
