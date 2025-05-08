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
          // Downgrade mongodb-memory-server to a version compatible with older CPUs
          sh 'npm uninstall mongodb-memory-server'
          sh 'npm install mongodb-memory-server@8.15.1 --save-dev'
          // Run tests
          sh 'npm test'
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