pipeline {
  agent any
  environment {
    MONGOMS_VERSION = '4.4.18' // Force MongoDB 4.4, compatible sans AVX
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
          sh 'chmod +x node_modules/.bin/jest || true' 
          sh 'ls -l node_modules/.bin/jest'
          sh 'node -v'
          sh 'npm -v'
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
