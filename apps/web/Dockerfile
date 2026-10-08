FROM node:22-slim AS build
RUN npm i -g bun
WORKDIR /app
COPY package.json bun.lock* ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages ./packages
RUN bun install || true
COPY apps/web ./apps/web
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_NAME=Dibora
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME NEXT_TELEMETRY_DISABLED=1
RUN cd apps/web && npx next build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app /app
USER node
EXPOSE 3000
CMD ["sh", "-c", "cd apps/web && npx next start -p 3000"]
