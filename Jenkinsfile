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
          stage('Publish to Nexus') {
            steps {
                script {
                    // Générer le fichier .npmrc temporairement dans Jenkins avec les informations d'authentification
                    sh """
                        echo "//192.168.50.4:8081/repository/npm-hosted/:username=${NEXUS_USERNAME}" > .npmrc
                        echo "//192.168.50.4:8081/repository/npm-hosted/:_password=\$(echo -n '${NEXUS_PASSWORD}' | base64)" >> .npmrc
                    """

                    // Publier le package vers Nexus
                    sh 'npm publish'

                    // Supprimer le fichier .npmrc temporairement créé après la publication
                    sh 'rm -f .npmrc'
                }
            }
        }
    
  }
}