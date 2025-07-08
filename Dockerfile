# --- Multi-stage build for smaller production image ---
# Stage 1: Build and compile
FROM node:20-alpine AS builder

WORKDIR /app/backend

COPY package*.json ./
RUN npm install

COPY . .

# Prisma akan menghasilkan binary engine untuk target yang ditentukan di schema.prisma
RUN npx prisma generate

RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine AS runner

WORKDIR /app/backend

COPY --from=builder /app/backend/package*.json ./
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma

# Pastikan dependensi OpenSSL terinstal di Alpine
# Ini untuk library yang dibutuhkan runtime Prisma Engine
RUN apk add --no-cache openssl libstdc++ ca-certificates

# Hanya install Prisma CLI sebagai runtime dependency (tidak perlu generate lagi di sini)
RUN npm install prisma --omit=dev --no-fund --no-audit --ignore-scripts

EXPOSE 4444
CMD ["npm", "start"]
