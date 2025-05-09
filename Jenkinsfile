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

    // stage('Build application') {
    //   steps {
    //     script {
    //       sh 'chmod -R +x node_modules/.bin/'
    //       sh 'npm run build-dev'
          
          
    //     }
    //   }
    // }
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