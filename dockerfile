# Étape 1 : Build stage (construire les dépendances)
FROM node:18 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Étape 2 : Run stage (exécuter l'application)
FROM node:18-slim
WORKDIR /app
COPY --from=build /app/package*.json ./
COPY --from=build /app/app.js ./
COPY --from=build /app/src ./src
RUN npm install --production
EXPOSE 5000
CMD ["node", "app.js"]