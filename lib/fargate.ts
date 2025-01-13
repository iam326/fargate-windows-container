import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';

type FargateStackProps = cdk.StackProps & {
  projectName: string;
};

export class FargateStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FargateStackProps) {
    super(scope, id, props);

    const { projectName } = props;

    const port = 80;
    const cpu = 1024;
    const memory = 2048;
    const desiredCount = 1;

    // VPC
    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
      vpcName: `${projectName}-vpc`,
    });

    // Security Group
    const albSecurityGroup = new ec2.SecurityGroup(this, 'ALBSecurityGroup', {
      vpc,
      securityGroupName: `${projectName}-alb-security-group`,
      allowAllOutbound: true,
    });
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(port),
      'Allow HTTP traffic'
    );

    const serviceSecurityGroup = new ec2.SecurityGroup(
      this,
      'ECSServiceSecurityGroup',
      {
        vpc,
        securityGroupName: `${projectName}-ecs-service-security-group`,
        allowAllOutbound: true,
      }
    );
    serviceSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(port),
      'Allow traffic from ALB'
    );

    // CloudWatch Logs
    const logGroup = new logs.LogGroup(this, 'ECSServiceLogGroup', {
      logGroupName: `${projectName}-cloudwatch-logs`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // IAM Role
    const executionRole = new iam.Role(this, 'EcsTaskExecutionRole', {
      roleName: `${projectName}-ecs-task-execution-role`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AmazonECSTaskExecutionRolePolicy'
        ),
      ],
    });

    const taskRole = new iam.Role(this, 'EcsTaskRole', {
      roleName: `${projectName}-ecs-task-role`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'EcsCluster', {
      vpc,
      clusterName: `${projectName}-ecs-cluster`,
      containerInsights: true,
    });

    // ECS Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      'ECSTaskDefinition',
      {
        family: `${projectName}-ecs-task-definition`,
        cpu,
        memoryLimitMiB: memory,
        executionRole,
        taskRole,
        // Windows Server 2019 を指定する
        runtimePlatform: {
          cpuArchitecture: ecs.CpuArchitecture.X86_64,
          operatingSystemFamily:
            ecs.OperatingSystemFamily.WINDOWS_SERVER_2019_CORE,
        },
      }
    );

    // ECS Task Container
    const container = taskDefinition.addContainer(
      'ECSTaskDefinitionContainer',
      {
        // DockerHub から Docker イメージを取得する
        image: ecs.ContainerImage.fromRegistry(
          'mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2019'
        ),
        containerName: `${projectName}-ecs-task-container`,
        cpu,
        memoryLimitMiB: memory,
        memoryReservationMiB: memory,
        logging: ecs.LogDriver.awsLogs({
          streamPrefix: projectName,
          logGroup,
        }),
      }
    );
    container.addPortMappings({
      containerPort: port,
      hostPort: port,
      protocol: ecs.Protocol.TCP,
    });

    // ECS Fargate Service
    const fargateService = new ecs.FargateService(this, 'EcsFargateService', {
      serviceName: `${projectName}-ecs-fargate-service`,
      cluster,
      vpcSubnets: vpc.selectSubnets({ subnetGroupName: 'private' }),
      securityGroups: [serviceSecurityGroup],
      taskDefinition: taskDefinition,
      desiredCount,
      maxHealthyPercent: 200,
      minHealthyPercent: 100,
    });

    // ALB
    const alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc,
      loadBalancerName: `${projectName}-alb`,
      internetFacing: true,
      crossZoneEnabled: true,
      securityGroup: albSecurityGroup,
    });

    // ALB Listener
    const listener = alb.addListener('ALBListener', {
      port,
    });
    listener.addTargets('ALBListenerTarget', {
      port,
      targets: [fargateService],
    });
  }
}
