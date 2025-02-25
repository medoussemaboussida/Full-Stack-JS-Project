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
  stage('Build application') { 
steps{ 
script { 
sh('npm run build-dev') 
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

} 
} 
