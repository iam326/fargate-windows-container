#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/vpc';
import { FargateStack } from '../lib/fargate';

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

new FargateStack(app, `${projectName}-fargate-stack`, {
  projectName,
  env,
});
