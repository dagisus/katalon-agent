pipeline { 
    agent none
    stages {

        stage ('Build') {
            agent any
            
            steps {
               sh 'npm install'
               sh 'npm run build'
            }
            
            post {
                always {
                    archiveArtifacts artifacts: 'bin/*', onlyIfSuccessful: true
                }
            }
        }

    }
}
