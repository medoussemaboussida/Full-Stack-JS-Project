pipeline {
  agent any

  stages {
 stage('Checkout GIT') {
            steps {
                echo 'Pulling ...'
                git branch: 'main',
                    url: 'https://github.com/medoussemaboussida/Full-Stack-JS-Project.git'
            }
        }
    stage('SonarQube Analysis') {
      steps {
        script {
          // 🔹 Récupère le scanner configuré dans Jenkins
          def scannerHome = tool 'scanner'

          // 🔹 Exécute l’analyse SonarQube
          withSonarQubeEnv('SonarQubeServer') {
            sh "${scannerHome}/bin/sonar-scanner"
          }
        }
      }
    }
  }
}
