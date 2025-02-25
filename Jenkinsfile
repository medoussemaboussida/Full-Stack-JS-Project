pipeline{ 
agent any 
stages { 
stage('Install dependencies') { 
steps{ 
script { 
sh('npm install') 
} 
} 
} 
  stage("SonarQube Analysis") {
            steps {
                withSonarQubeEnv('scanner') {
                    sh 'mvn sonar:sonar'
                }
            }
stage('Unit Test') { 
steps{ 
script { 
sh('npm test') 
} 
} 
} 
stage('Build application') { 
steps{ 
script { 
sh('npm run build-dev') 
} 
} 
} 
} 
} 
