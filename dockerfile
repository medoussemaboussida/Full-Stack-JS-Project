# Étape 1 : utiliser une image officielle Node.js
FROM node:18

# Étape 2 : définir le dossier de travail dans le conteneur
WORKDIR /app

# Étape 3 : copier les fichiers package.json et package-lock.json
COPY package*.json ./

# Étape 4 : installer les dépendances
RUN npm install

# Étape 5 : copier le reste des fichiers du projet
COPY . .

# Étape 6 : exposer le port (ex : 5000 si ton app écoute sur ce port)
EXPOSE 5000

# Étape 7 : lancer l'application
CMD ["npm", "start"]
