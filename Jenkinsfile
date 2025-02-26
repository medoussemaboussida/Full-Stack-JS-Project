pipeline { 
  agent any 
  stages { 
    stage('Install dependencies') { 
      steps { 
        script { 
          sh('npm install') 
        } 
      } 
    }
    
    stage('Unit Test') { 
      steps { 
        script { 
          sh('CI=true npm test -- --watchAll=false')
        } 
      } 
    }
    
    stage('Build application') { 
      steps { 
        script { 
          sh('npm run build') 
        } 
      } 
    }
  } 
}
