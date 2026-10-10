FROM oven/bun:1.2 AS base
WORKDIR /app
COPY package.json bun.lock* ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages ./packages
RUN bun install --frozen-lockfile || bun install
COPY apps/api ./apps/api
ENV NODE_ENV=production
EXPOSE 8787
USER bun
HEALTHCHECK --interval=30s --timeout=3s CMD bun -e "fetch('http://localhost:8787/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "-c", "bun run --cwd packages/database ensure-contact-inbox && bun apps/api/src/index.ts"]
