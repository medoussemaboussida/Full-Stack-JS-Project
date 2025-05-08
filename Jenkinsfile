pipeline {
  agent any
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
          // Set executable permissions for Jest and other binaries
          sh 'chmod -R +x node_modules/.bin/'

          // List Jest binary to verify permissions
          sh 'ls -la node_modules/.bin/jest'

          // Run tests with mock MongoDB
          sh 'npm run test:mock'
        }
      }
    }

    stage('Build application') {
      steps {
        script {
            sh 'chmod -R +x node_modules/.bin/'
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