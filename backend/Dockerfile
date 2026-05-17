FROM node:22-alpine AS builder

# set working directory inside the container
WORKDIR /app

# Copy dependency manisfests first ( for layer caching )

COPY package*.json ./

# Install all the dependencies ( dev and production )
RUN npm ci

# Copy the rest of the backend source
COPY . .

# IMPORTANT: Generate the Prisma client before building
RUN npx prisma generate

# Compile typescript to dist
RUN npm run build