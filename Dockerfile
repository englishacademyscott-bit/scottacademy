FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

FROM deps AS runner
WORKDIR /app
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://academia:academia@db:5432/academia?schema=public"
ENV AUTH_SECRET="build-secret-with-at-least-thirty-two-characters"
ENV AUTH_TRUST_HOST="true"
ENV APP_URL="http://localhost:3000"
RUN npx prisma generate && npm run build

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
EXPOSE 3000
CMD ["npm", "run", "start"]
