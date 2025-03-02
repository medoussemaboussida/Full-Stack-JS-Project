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

stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('scanner') {
                    sh('npm sonar:sonar')
                }
            }
        } 

} 
} 
