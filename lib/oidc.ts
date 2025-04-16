import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import {
  GithubActionsIdentityProvider,
  GithubActionsRole,
} from 'aws-cdk-github-oidc';

type OidcStackProps = cdk.StackProps & {
  projectName: string;
};

export class OidcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: OidcStackProps) {
    super(scope, id, props);

    const githubOwnerName = 'iam326';
    const githubRepositoryName = '<REPOSITORY_NAME>';
    const ecrRepositoryName = `${props.projectName}-ecr-repository`;

    // 参考: https://dev.classmethod.jp/articles/cdk-githubactions-oidc-iam-role/
    // npm install --save-dev aws-cdk-github-oidc
    const provider = new GithubActionsIdentityProvider(this, 'GithubProvider');
    const role = new GithubActionsRole(this, 'DeployRole', {
      provider: provider,
      owner: githubOwnerName,
      repo: githubRepositoryName,
      roleName: `${props.projectName}-github-actions-oidc-role`,
    });

    // https://docs.aws.amazon.com/ja_jp/AmazonECR/latest/userguide/image-push-iam.html
    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ecr:GetAuthorizationToken'],
        resources: ['*'],
      })
    );
    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ecr:CompleteLayerUpload',
          'ecr:UploadLayerPart',
          'ecr:InitiateLayerUpload',
          'ecr:BatchCheckLayerAvailability',
          'ecr:PutImage',
          'ecr:BatchGetImage',
        ],
        resources: [
          `arn:aws:ecr:${this.region}:${this.account}:repository/${ecrRepositoryName}`,
        ],
      })
    );
  }
}
