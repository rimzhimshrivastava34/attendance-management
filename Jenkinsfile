pipeline {
    agent any

    environment {
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        DOCKERHUB_CREDENTIALS = credentials('dockerhub_creds') // DockerHub creds
        FRONTEND_IMAGE = "rimzhimshri/attendance-frontend"
        BACKEND_IMAGE  = "rimzhimshri/attendance-backend"
    }

    stages {

        stage('Clone Repository') {
            steps {
                git credentialsId: 'attendance', url: 'https://github.com/rimzhimshrivastava34/attendance-management.git' , branch: 'main' 
            }
        }

        stage('Build Docker Images') {
            parallel {
                stage('Build Frontend') {
                    steps {
                        script {
                            sh "docker build -t $FRONTEND_IMAGE:$IMAGE_TAG ."
                        }
                    }
                }

                stage('Build Backend') {
                    steps {
                        script {
                            dir('backend') {
                                sh "docker build -t $BACKEND_IMAGE:$IMAGE_TAG ."
                            }
                        }
                    }
                }
            }
        }

        stage('Push Docker Images') {
            steps {
                script {
                    sh "echo $DOCKERHUB_CREDENTIALS_PSW | docker login -u $DOCKERHUB_CREDENTIALS_USR --password-stdin"
                    sh "docker push $FRONTEND_IMAGE:$IMAGE_TAG"
                    sh "docker push $BACKEND_IMAGE:$IMAGE_TAG"
                }
            }
        }

        stage('Deploy Docker Containers') {
            steps {
                script {
                    // Stop & remove any running containers
                    sh "docker rm -f attendify-backend || true"
                    sh "docker rm -f attendify-frontend || true"

                    // Start new containers
                    sh """
                    docker run -d --name attendify-backend -p 5000:5000 $BACKEND_IMAGE:$IMAGE_TAG
                    docker run -d --name attendify-frontend -p 3001:3001 $FRONTEND_IMAGE:$IMAGE_TAG
                    """
                }
            }
        }
    }

    post {
        always {
            echo 'Pipeline execution completed.'
        }
        success {
            echo 'Deployment successful!'
        }
        failure {
            echo 'Deployment failed!'
        }
    }
}
