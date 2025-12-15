# frontEnd/Dockerfile

FROM node:18-alpine

WORKDIR /app

# Argumento de build para a URL da API (necessário para Vite)
ARG VITE_API_URL=http://localhost:8090
ENV VITE_API_URL=$VITE_API_URL

# Hosts permitidos pelo Vite
ARG VITE_ALLOWED_HOSTS=localhost
ENV VITE_ALLOWED_HOSTS=$VITE_ALLOWED_HOSTS

# Copiar apenas os package.json primeiro (para aproveitar cache do Docker)
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar o restante do código
COPY . .

# Expor a porta padrão do Vite
EXPOSE 3000

# O comando roda o dev server expondo para a rede do Docker (--host)
CMD ["npm", "run", "dev", "--", "--host"]