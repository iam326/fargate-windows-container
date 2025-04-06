import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

type Ec2StackProps = cdk.StackProps & {
  projectName: string;
};

export class Ec2Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: Ec2StackProps) {
    super(scope, id, props);

    const { projectName } = props;

    // VPC
    const vpcName = `${projectName}-vpc`;
    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
      vpcName,
    });

    // https://docs.aws.amazon.com/ja_jp/prescriptive-guidance/latest/optimize-costs-microsoft-workloads/right-size-selection.html#right-size-selection-next-steps
    const instanceType = ec2.InstanceType.of(
      ec2.InstanceClass.T3,
      ec2.InstanceSize.MEDIUM
    );

    // https://zenn.dev/hiren/scraps/4f768929fcfe25
    const machineImage = new ec2.LookupMachineImage({
      name: `${ec2.WindowsVersion.WINDOWS_SERVER_2019_JAPANESE_FULL_BASE}-*`,
      filters: {
        'image-type': ['machine'],
        state: ['available'],
      },
      owners: ['amazon'],
      windows: true,
    });
    // こちらだと AMI のバージョンが更新されるたびに EC2 インスタンスが再作成されてしまう
    // const machineImage = new ec2.WindowsImage(
    //   ec2.WindowsVersion.WINDOWS_SERVER_2019_JAPANESE_FULL_BASE
    // );

    const instanceSecurityGroup = new ec2.SecurityGroup(
      this,
      'Ec2InstanceSecurityGroup',
      {
        vpc: vpc,
        securityGroupName: `${projectName}-instance-security-group`,
      }
    );

    const instanceRole = new iam.Role(this, 'EC2InstanceRole', {
      roleName: `${projectName}-instance-role`,
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });

    const keyPairName = `${projectName}-ec2-key`;
    const keyPair = new ec2.KeyPair(this, 'EC2KeyPair', {
      keyPairName,
    });

    const volumeSize = 100;
    const vpcSubnets = vpc.selectSubnets({ subnetGroupName: 'private' });
    const blockDevices = [
      {
        // ルートボリューム上書き
        deviceName: '/dev/sda1',
        volume: ec2.BlockDeviceVolume.ebs(volumeSize, {
          volumeType: ec2.EbsDeviceVolumeType.GP3,
        }),
      },
    ];

    new ec2.Instance(this, 'EC2Instance', {
      vpc,
      vpcSubnets,
      instanceName: `${projectName}-instance`,
      instanceType,
      machineImage,
      securityGroup: instanceSecurityGroup,
      role: instanceRole,
      keyPair,
      blockDevices,
      ebsOptimized: true,
      requireImdsv2: true,
    });

    // EIC Endpoint
    // https://dev.classmethod.jp/articles/rdp-connection-to-windows-server-using-ec2-instance-connect-endpoint-eic/
    // https://zenn.dev/thyt_lab/articles/7fc528985dce9c
    const endpointSecurityGroup = new ec2.SecurityGroup(
      this,
      'Ec2InstanceConnectEndpointSecurityGroup',
      {
        vpc,
        securityGroupName: `${projectName}-instance-connect-endpoint-security-group`,
        allowAllOutbound: false,
      }
    );

    // EIC Endpoint から EC2 への RDP アクセス受信許可
    instanceSecurityGroup.addIngressRule(
      endpointSecurityGroup,
      ec2.Port.tcp(3389)
    );

    // EIC Endpoint から EC2 への RDP アクセス送信許可
    endpointSecurityGroup.addEgressRule(
      instanceSecurityGroup,
      ec2.Port.tcp(3389)
    );

    new ec2.CfnInstanceConnectEndpoint(this, 'Ec2InstanceConnectEndpoint', {
      subnetId: vpc.selectSubnets({ subnetGroupName: 'private' }).subnetIds[0],
      securityGroupIds: [endpointSecurityGroup.securityGroupId],
    });
  }
}
