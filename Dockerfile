FROM mcr.microsoft.com/playwright:v1.42.1-jammy

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
ENV PORT=5000
EXPOSE 5000

CMD ["node", "index.js"]