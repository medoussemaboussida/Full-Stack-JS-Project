pipeline {
  agent any

  stages {
    stage('SonarQube Analysis') {
      steps {
        script {
          // 🔹 Récupère le scanner configuré dans Jenkins
          def scannerHome = tool 'scanner'

          // 🔹 Exécute l’analyse SonarQube
          withSonarQubeEnv('scanner') {
            sh "${scannerHome}/bin/sonar-scanner"
          }
        }
      }
    }
  }
}
