FROM node:20-bookworm-slim AS development
WORKDIR /app
COPY app/package*.json ./
RUN npm install
COPY app/ ./
CMD ["node", "server.js"]

FROM node:20-bookworm-slim AS production
ENV NODE_ENV=production
WORKDIR /app
COPY app/package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY app/ ./
CMD ["node", "server.js"]
