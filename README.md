1. Setup Environment on EC2
You started with a Docker-installed Ubuntu EC2 instance, which was configured with AWS credentials. You ensured that your environment had the necessary tools installed for managing Kubernetes and AWS resources:
kubectl (Kubernetes CLI)
eksctl (EKS cluster management tool)
awscli (AWS CLI)

2. EKS Cluster Setup
Step 1: You created an EKS cluster using eksctl, which automatically set up the EKS control plane and node groups.
Command used to create the EKS cluster:
eksctl create cluster --name my-kubernetes-cluster --region <aws-region> --nodegroup-name standard-workers --node-type t3.medium --nodes 3
Step 2: After the cluster setup, we enabled IAM OIDC provider to allow our cluster to authenticate with AWS services like the AWS Load Balancer Controller:
eksctl utils associate-iam-oidc-provider --cluster my-kubernetes-cluster --approve

3. AWS Load Balancer Controller Installation
To route traffic into your application through an AWS Load Balancer, we installed the AWS Load Balancer Controller. Here's what we did:

Installed CRDs (Custom Resource Definitions): The CRDs allow Kubernetes to understand and work with AWS-specific resources like Load Balancers.

Command used to apply the CRDs:
kubectl apply -k "https://github.com/kubernetes-sigs/aws-load-balancer-controller/config/crd?ref=main"

Created an IAM policy required for the AWS Load Balancer Controller to interact with AWS resources.

The policy was created using the following AWS CLI command:
curl -o iam_policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/main/docs/install/iam_policy.json
aws iam create-policy --policy-name AWSLoadBalancerControllerIAMPolicy --policy-document file://iam_policy.json
Created an IAM role for the controller and attached the policy:
eksctl create iamserviceaccount \
  --cluster=my-kubernetes-cluster \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::<aws-account-id>:policy/AWSLoadBalancerControllerIAMPolicy \
  --approve
Installed the AWS Load Balancer Controller using Helm:

helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  --set clusterName=my-kubernetes-cluster \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set region=<aws-region> \
  --set vpcId=<vpc-id>

4. Application Docker Images on ECR
Docker images for both the frontend and backend of your application were built locally and pushed to Amazon Elastic Container Registry (ECR). This allowed Kubernetes to pull the application images during deployment.

Pushed Docker images to ECR:

For both the frontend and backend, you created ECR repositories, built the Docker images, and pushed them:

aws ecr get-login-password --region <aws-region> | docker login --username AWS --password-stdin <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com

docker build -t frontend .
docker tag frontend:latest <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/frontend:latest
docker push <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/frontend:latest

docker build -t backend .
docker tag backend:latest <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/backend:latest
docker push <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/backend:latest


5. Application Deployment via Helm
We set up a Helm chart to automate the deployment of both the frontend and backend services on Kubernetes.

Values.yaml file was updated with the repository URLs of your Docker images hosted on ECR. For example:

frontend:
  replicaCount: 2
  image:
    repository: <aws-account-id>.dkr.ecr.<region>.amazonaws.com/frontend-service
    tag: "latest"
  service:
    type: LoadBalancer
    port: 80

backend:
  replicaCount: 1
  image:
    repository: <aws-account-id>.dkr.ecr.<region>.amazonaws.com/backend-service
    tag: "latest"
  service:
    type: ClusterIP
    port: 3000

The Helm chart included Kubernetes configurations such as Deployment, Service, and LoadBalancer specifications for both frontend and backend.

Deployed the application using Helm:

helm install my-app .

6. Exposing the Services Using AWS Load Balancer
Both the frontend and backend services were configured to use the Kubernetes Service type LoadBalancer, which automatically creates an AWS Application Load Balancer (ALB) for external access.

Check if the LoadBalancer was successfully created:

kubectl get svc
This command lists the services and shows the EXTERNAL-IP (DNS name) of the LoadBalancer.

7. Final Application Access
After making these changes and ensuring the ports were correctly configured, the application was successfully exposed via the AWS Load Balancer DNS name. The frontend application was accessible at the following URL:

http://<load-balancer-dns-name>
