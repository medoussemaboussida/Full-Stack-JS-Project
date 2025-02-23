pipeline {
    agent any
    stages {
        stage('Install dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Build application') {
            steps {
                sh 'npm run build-dev'
            }
        }
    }

}
