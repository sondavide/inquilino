# ── Stage 1: build ─────────────────────────────────────────────────────────────
# node:20 (Debian) is required because jscanify depends on 'canvas',
# a native module that needs Python3 and C++ build tools to compile.
FROM node:20 AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: serve ─────────────────────────────────────────────────────────────
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
