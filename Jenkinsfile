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
