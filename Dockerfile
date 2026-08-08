# The builder runs on the machine's own architecture: dist/ is just files, identical
# whatever it was built on, so only the nginx layer below differs per architecture
FROM --platform=$BUILDPLATFORM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Shown in the UI next to the server's version: --build-arg APP_VERSION=$(git describe --tags)
ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION
# Leave empty for the default same-origin setup (/api, proxied by nginx below).
# Set it only when the API is served from another origin, eg. https://api.example.com
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

FROM nginx:alpine

# Substituted into nginx.conf.template by the nginx entrypoint at container start
ENV WEB_PORT=1401
ENV API_UPSTREAM=http://api:8000

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 1401
