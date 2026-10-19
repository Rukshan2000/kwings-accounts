# Build context: repository root.  Also used for one-off migrations (packages/db/dist).
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
RUN npm ci -w @kwings/api -w @kwings/db --include-workspace-root

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/db packages/db
COPY apps/api apps/api
RUN npm run build -w @kwings/db && npm run build -w @kwings/api

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
RUN npm ci --omit=dev -w @kwings/api -w @kwings/db && npm cache clean --force
COPY --from=build /app/packages/db/dist packages/db/dist
COPY --from=build /app/apps/api/dist apps/api/dist
USER node
WORKDIR /app/apps/api
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1
CMD ["node", "dist/server.js"]
