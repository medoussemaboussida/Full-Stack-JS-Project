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

          // Set executable permissions for Jest and other binaries
          sh 'chmod -R +x node_modules/.bin/'

          // List Jest binary to verify permissions
          sh 'ls -la node_modules/.bin/jest'

          // Run tests using the updated npm script
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