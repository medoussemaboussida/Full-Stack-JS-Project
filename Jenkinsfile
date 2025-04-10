pipeline {
  agent any
  stages {
    stage('Install dependencies') {
      steps {
        script {
      sh 'npm install'
      sh 'chmod -R +x node_modules/.bin/' // Force les permissions
        }
      }
    }
    stage('Unit Test') {
      steps {
        script {
          sh 'sudo npm test' // Changement de "npx test" à "npm test"
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