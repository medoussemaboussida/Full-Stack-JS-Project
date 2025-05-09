pipeline {
  agent any

   environment {
        NEXUS_URL = 'http://192.168.50.4:8081/repository/npm-hosted/'
        NEXUS_USERNAME = 'admin'
        NEXUS_PASSWORD = 'nexus'
    }

  stages {
    stage('Install dependencies') {
      steps {
        script {
          sh 'npm install'

        }
      }
    }

stage('Unit Test') {
      steps {
        script {
          // Install cross-env for environment variables
          sh 'npm install cross-env --save-dev'

          // Set executable permissions for Jest and other binaries
          sh 'chmod -R +x node_modules/.bin/'

          // Create environment file for tests
          sh 'echo "USE_MOCK_MONGO=true" > .env.test'

          // Reset test file to ensure clean state
          sh 'npm run test:reset'

          // Run tests with mock MongoDB and increased timeout
          sh 'USE_MOCK_MONGO=true CI=true npm run test:mock -- --testTimeout=60000 --forceExit --detectOpenHandles'
        }
      }
    }

    stage('Build application') {
      steps {
        timeout(time: 1, unit: 'MINUTES') {
          script {
            // Tuer tous les processus node existants pour éviter les conflits
            sh 'pkill -f node || true'
            sh 'pkill -f nodemon || true'

            sh 'chmod -R +x node_modules/.bin/'

            // Vérifier si le port 5000 est déjà utilisé et le libérer si nécessaire
            sh 'lsof -ti:5000 | xargs kill -9 || true'

            // Utiliser le script de build CI minimal qui ne démarre pas l'application complète
            sh 'node ci-build.js'

            echo 'Build completed successfully'
          }
        }
      }
      post {
        always {
          // Toujours nettoyer les processus à la fin
          script {
            // Tuer tous les processus node et nodemon
            sh 'pkill -f node || true'
            sh 'pkill -f nodemon || true'

            // Libérer le port 5000
            sh 'lsof -ti:5000 | xargs kill -9 || true'

            echo 'Cleanup completed'
          }
        }
      }
    }
    stage('SonarQube Analysis') {
      steps {
        script {
          def scannerHome = tool 'scanner'
          withSonarQubeEnv {
            sh "${scannerHome}/bin/sonar-scanner"
          }
        }
      }
    }
    // Building Docker images
stage('Building images (node and mongo)') {
steps{
script {
sh('docker-compose build')
}
}
}

  }
}