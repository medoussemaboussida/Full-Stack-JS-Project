pipeline{ 
agent any 
stages { 
        stage('Checkout GIT') {
            steps {
                echo 'Pulling ...'
                git branch: 'oussema', 
                    url: 'https://github.com/medoussemaboussida/Full-Stack-JS-Project.git'
            }
        }
stage('Install dependencies') { 
steps{ 
script { 
sh('npm install') 
} 
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
