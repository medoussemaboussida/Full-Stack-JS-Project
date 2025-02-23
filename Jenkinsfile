pipeline {
    agent any
    stages {
        stage('Install dependencies') {
            steps {
                sh 'npm install'
            }
        }

         stage('run') {
            steps {
                sh 'npm run'
            }
        }
        stage('Unit Test') {
            steps {
                sh 'npm test'
            }
        }

        stage('Build application') {
            steps {
                sh 'npm run build-dev'
            }
        }
    }
    post {
        success {
            echo 'Pipeline executed successfully!'
        }
        failure {
            echo 'Pipeline failed!'
        }
    }
}
