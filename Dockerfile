# Stage 1: Install dependencies & generate prisma client
FROM node:20-alpine AS builder

WORKDIR /app/consumer

COPY package*.json ./
RUN npm install

COPY . .

# Generate prisma client
RUN npx prisma generate

# Stage 2: Production runtime
FROM node:20-alpine AS runner

WORKDIR /app/consumer

COPY --from=builder /app/consumer/package*.json ./
COPY --from=builder /app/consumer/node_modules ./node_modules
COPY --from=builder /app/consumer/src ./src
COPY --from=builder /app/consumer/prisma ./prisma

# Install runtime dependencies (kalo butuh openssl buat prisma)
RUN apk add --no-cache openssl libstdc++ ca-certificates

EXPOSE 3010

CMD ["npm", "start"]
