FROM node:20-bookworm-slim

WORKDIR /app

# Healthcheck için wget yükle
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --only=production

COPY src ./src
COPY scripts ./scripts

EXPOSE 5070

CMD ["node", "src/server.cjs"]


