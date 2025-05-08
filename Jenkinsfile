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
          sh 'chmod +x node_modules/.bin/jest || true' 
          sh 'ls -l node_modules/.bin/jest'
          sh 'node -v'
          sh 'npm -v'
          sh 'npm test'
        }
      }
    }

    // stage('Build application') {
    //   steps {
    //     script {
    //         sh 'chmod -R +x node_modules/.bin/'
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

    
  }
}