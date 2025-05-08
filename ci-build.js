// Script pour le build CI
const app = require('./app');

// Vérifier si nous sommes en mode CI build
const isCiBuild = process.argv.includes('--ci-build');

if (isCiBuild) {
  console.log('Exécution en mode CI build');
  
  // Simuler un démarrage de l'application
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`Application démarrée sur le port ${PORT} en mode CI`);
    
    // Attendre 5 secondes puis terminer le processus
    console.log('Vérification de la construction réussie, arrêt dans 5 secondes...');
    setTimeout(() => {
      console.log('Build CI réussi!');
      server.close(() => {
        process.exit(0);
      });
    }, 5000);
  });
}

module.exports = isCiBuild;
