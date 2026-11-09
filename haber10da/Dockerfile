# Çok aşamalı (multi-stage) imaj: derleme araçları son imaja girmez, imaj küçük ve güvenli kalır.

# 1. aşama: yalnızca üretim bağımlılıkları
FROM node:22-alpine AS bagimliliklar
WORKDIR /uygulama
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# 2. aşama: çalışma imajı
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /uygulama

# Kök kullanıcıyla çalışma: konteyner ele geçirilirse zarar sınırlı kalsın
RUN addgroup -S haber && adduser -S haber -G haber

COPY --from=bagimliliklar /uygulama/node_modules ./node_modules
COPY --chown=haber:haber package.json openapi.yaml ./
COPY --chown=haber:haber drizzle ./drizzle
COPY --chown=haber:haber src ./src
COPY --chown=haber:haber public ./public

USER haber
EXPOSE 3000

# Orkestratör (Docker, Kubernetes) konteynerin sağlığını buradan izler
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/saglik || exit 1

CMD ["node", "src/server.js"]
