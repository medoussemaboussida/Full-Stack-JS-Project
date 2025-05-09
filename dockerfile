# Étape 1 : Build stage
FROM node:18 AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Étape 2 : Run stage
FROM node:18-slim

WORKDIR /app

COPY --from=build /app /app

EXPOSE 5000

CMD ["node", "app.js"]
