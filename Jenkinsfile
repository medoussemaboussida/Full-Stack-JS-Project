pipeline {
  agent any
  environment {
    MONGOMS_VERSION = '4.4.18' // Force MongoDB 4.4, compatible sans AVX
  }
  stages {
    stage('Install system dependencies') {
      steps {
        script {
          // Installer libcrypto.so.1.1 selon la distribution Linux
          sh '''
            if [ -f /etc/debian_version ]; then
              sudo apt-get update
              sudo apt-get install -y libssl1.1
            elif [ -f /etc/redhat-release ]; then
              sudo yum install -y openssl11-libs
            else
              echo "Distribution Linux non prise en charge pour l'installation automatique"
              exit 1
            fi
          '''
        }
      }
    }

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
