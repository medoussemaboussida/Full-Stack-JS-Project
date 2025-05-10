# Étape 1 : Build stage (construire l'application Node.js)
FROM node:18 AS build

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers package.json et package-lock.json pour installer les dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install
# Copier le reste des fichiers de l'application
COPY . .

# Étape 2 : Run stage (exécuter l'application)
FROM node:18-slim

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers construits depuis l'étape de build
COPY --from=build /app /app

# Exposer le port 8500 (port de ton application Node.js)
EXPOSE 5000

# Commande pour démarrer l'application
CMD ["node", "app.js"]