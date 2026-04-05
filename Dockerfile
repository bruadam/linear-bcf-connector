FROM node:22-alpine AS base

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .

# Build Next.js
RUN npm run build

# Copy static assets into standalone bundle
RUN cp -r .next/static .next/standalone/.next/static && \
    cp -r public .next/standalone/public

EXPOSE ${PORT:-3000}

ENV NODE_ENV=production

CMD ["sh", "-c", "npx prisma migrate deploy && node .next/standalone/server.js"]
