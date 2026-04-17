# Smithery / self-host Dockerfile for cipher-x402-mcp.
# Multi-stage: build TypeScript with full devDeps, then ship a slim runtime.

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* tsconfig.json ./
RUN npm ci --no-audit --no-fund
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Only production deps in the final image.
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=builder /app/dist ./dist

# Default entrypoint = stdio transport (what Smithery + Claude Desktop expect).
# Override with `docker run ... node dist/http.js` for HTTP mode on port 8080.
EXPOSE 8080
CMD ["node", "dist/stdio.js"]
