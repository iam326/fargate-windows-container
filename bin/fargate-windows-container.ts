#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/vpc';
import { EcrStack } from '../lib/ecr';
import { OidcStack } from '../lib/oidc';
import { FargateStack } from '../lib/fargate';
import { Ec2Stack } from '../lib/ec2';

const app = new cdk.App();

const projectName = 'fargate-windows-container';
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

new VpcStack(app, `${projectName}-vpc-stack`, {
  projectName,
  env,
});

new EcrStack(app, `${projectName}-ecr-stack`, {
  projectName,
  env,
});

new OidcStack(app, `${projectName}-oidc-stack`, {
  projectName,
  env,
});

new FargateStack(app, `${projectName}-fargate-stack`, {
  projectName,
  env,
});

new Ec2Stack(app, `${projectName}-ec2-stack`, {
  projectName,
  env,
});
