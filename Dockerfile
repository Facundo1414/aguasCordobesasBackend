FROM node:18-alpine as node

WORKDIR /app

# Instala Chromium y Puppeteer
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

# Configuración para Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copia el código fuente y las dependencias
COPY package*.json ./
RUN npm ci

# Copia el resto del código
COPY . .

# Expone el puerto de NestJS
EXPOSE 3000

# Inicia la aplicación
CMD ["npm", "start"]
