pipeline {
  agent any
  stages {
    stage('Install dependencies') {
      steps {
        script {
     sh 'rm -rf node_modules package-lock.json' // Nettoie tout
          sh 'npm install'
          sh 'npm rebuild bcrypt --build-from-source' // Recompile bcrypt
          sh 'ls -l node_modules/.bin/jest || echo "Jest binary not found"'
          sh 'chmod -R +x node_modules/.bin/'
        }
      }
    }
    stage('Unit Test') {
      steps {
        script {
          sh 'npm test' // Changement de "npx test" à "npm test"
        }
      }
    }
    stage('Build application') {
      steps {
        script {
          sh 'npm run build-dev'
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
  }
}