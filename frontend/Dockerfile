FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY public ./public
COPY src ./src

EXPOSE 3000

CMD ["npm", "start"]
