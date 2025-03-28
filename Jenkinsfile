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
stage('SonarQube Analysis') { 
steps{ 
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
