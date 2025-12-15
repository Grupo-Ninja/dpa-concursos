# frontEnd/Dockerfile

FROM node:18-alpine

WORKDIR /app

# Copiar apenas os package.json primeiro (para aproveitar cache do Docker)
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar o restante do código
COPY . .

# Expor a porta padrão do Vite
EXPOSE 5173

# O comando roda o dev server expondo para a rede do Docker (--host)
CMD ["npm", "run", "dev", "--", "--host"]