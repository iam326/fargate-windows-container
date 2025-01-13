import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

type VpcStackProps = cdk.StackProps & {
  projectName: string;
};

export class VpcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: VpcStackProps) {
    super(scope, id, props);

    const { projectName } = props;

    const cidr = '10.100.0.0/16';
    const cidrMask = 24;
    const maxAzs = 2;
    const natGateways = 1;

    // VPC
    new ec2.Vpc(this, 'Vpc', {
      vpcName: `${projectName}-vpc`,
      ipAddresses: ec2.IpAddresses.cidr(cidr),
      subnetConfiguration: [
        {
          cidrMask,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
          mapPublicIpOnLaunch: false,
        },
        {
          cidrMask,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
      maxAzs,
      natGateways,
    });
  }
}
