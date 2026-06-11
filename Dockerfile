FROM node:22-alpine AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
COPY package.json pnpm-lock.yaml* ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod=false
COPY . .

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/src ./src
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/migrations ./migrations
EXPOSE 3000
# Run migrations before serving traffic, then start the server. We invoke node
# directly (not `pnpm run ...`) so the container never reaches for corepack/pnpm
# at startup — corepack would try to download pnpm from the npm registry on every
# boot, which fails in the runtime container and crash-loops the pod. All deps are
# already in node_modules from the build stage. node-pg-migrate is idempotent, so
# running it on every start is safe; a failed migration exits non-zero and the
# platform marks the deploy failed rather than serving a half-applied schema.
CMD ["sh", "-c", "node scripts/migrate.js && node src/index.js"]
