pipeline {
    agent any
    stages {
        stage('Install dependencies') {
            steps {
                sh 'npm install'
            }
        }
stage('Unit Test') {
      steps{
        
        script {
         sh('npm test')
        }
      }
        stage('Build application') {
            steps {
                sh 'npm run build-dev'
            }
        }
    }

}
