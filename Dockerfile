FROM node:20-alpine AS deps

# System libs required by sharp, pdf2pic, and node-canvas fallback
RUN apk add --no-cache \
    graphicsmagick \
    imagemagick \
    vips-dev \
    vips \
    cairo-dev \
    pango-dev \
    giflib-dev \
    librsvg-dev \
    python3 \
    make \
    g++ \
    ttf-dejavu

WORKDIR /app

COPY package*.json ./
RUN npm ci --include=dev

# ---- runtime stage ----
FROM node:20-alpine

RUN apk add --no-cache \
    graphicsmagick \
    imagemagick \
    vips \
    cairo \
    pango \
    giflib \
    librsvg \
    ttf-dejavu \
    tini \
    dumb-init

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

# Data directory for SQLite (mount as volume in Dockploy)
RUN mkdir -p /data && chown -R node:node /data /app
USER node

ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data

EXPOSE 3000

VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/v1/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
