pipeline {
  agent any
  stages {
    stage('Install dependencies') {
      steps {
        script {
          sh 'npm install'
          sh 'npm rebuild bcrypt --build-from-source' // Recompile bcrypt
          sh 'npm list jest || echo "Jest not found"'
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