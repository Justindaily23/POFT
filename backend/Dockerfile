FROM node:22-alpine AS builder

# set working directory inside the container
WORKDIR /app


# Copy dependency manisfests first ( for layer caching )

COPY package*.json ./


# Install all the dependencies ( dev and production )
RUN npm ci

# Copy the rest of the backend source
COPY . .

# A dummy connection string so Prisma can safely generate its client
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" 

# IMPORTANT: Generate the Prisma client before building
RUN npx prisma generate

# Compile typescript to dist
RUN npm run build

#=====================================================
# STAGE 2
FROM node:22-alpine AS runner

WORKDIR /app
# Set production environment flags
ENV NODE_ENV=production
ENV PORT=3000

ENV DATABASE_URL=""

# Copy manifests and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the compiled JS code from stage 1
COPY --from=builder /app/dist ./dist

# Copy generated prisma files
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma


# Expose the port
EXPOSE 3000

# Start production server
CMD ["node", "dist/main.js"]