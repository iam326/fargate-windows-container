import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';

type EcrStackProps = cdk.StackProps & {
  projectName: string;
};

export class EcrStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EcrStackProps) {
    super(scope, id, props);

    const repositoryName = `${props.projectName}-ecr-repository`;
    const repository = new ecr.Repository(this, 'EcrRepository', {
      repositoryName,
      // 検証用のため同じタグ名での上書きを容認する
      imageTagMutability: ecr.TagMutability.MUTABLE,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });
    repository.addLifecycleRule({ maxImageCount: 5 });
  }
}
