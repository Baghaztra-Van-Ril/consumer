# syntax=docker/dockerfile:1

ARG NODE_VERSION=20.18.0
ARG PORT=3010

FROM node:${NODE_VERSION}-slim AS base
WORKDIR /app

# Copy package config dan install deps
COPY package*.json ./
RUN npm install

# Copy semua source code ke image
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Set ENV
ENV NODE_ENV=production
ENV PORT=${PORT}
ENV HOST=0.0.0.0

# Expose port di container
EXPOSE ${PORT}

# Start command
CMD ["npm", "start"]
