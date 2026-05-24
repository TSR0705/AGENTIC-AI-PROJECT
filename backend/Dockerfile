# Stage 1: Build environment
FROM node:22-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci

# Stage 2: Production runtime environment
FROM node:22-alpine AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production

# Copy configuration files and dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source code and node modules
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY . .

# Secure container: Run as unprivileged non-root user
USER node

# Expose server port
EXPOSE 3000

# Health check using native Node.js fetch (Node 22 native support)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/').then(r => r.status === 200 ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Boot instruction
CMD [ "node", "server.js" ]
