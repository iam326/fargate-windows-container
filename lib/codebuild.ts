import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codeBuild from 'aws-cdk-lib/aws-codebuild';
import * as s3 from 'aws-cdk-lib/aws-s3';

type CodeBuildStackProps = cdk.StackProps & {
  projectName: string;
};

export class CodeBuildStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CodeBuildStackProps) {
    super(scope, id, props);

    const bucketName = `${props.projectName}-codebuild-${this.account}`;
    const artifactBucket = new s3.Bucket(this, 'ArtifactBucket', {
      bucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      accessControl: s3.BucketAccessControl.PRIVATE,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // https://github.com/aws/aws-cdk/releases/tag/v2.174.0
    // > codebuild: add new environment types (#32729) (a10c369), closes #32728
    const fleetName = `${props.projectName}-codebuild-fleet`;
    const fleet = new codeBuild.Fleet(this, 'CodeBuildFleet', {
      fleetName,
      baseCapacity: 1,
      environmentType: codeBuild.EnvironmentType.WINDOWS_EC2,
      computeType: codeBuild.FleetComputeType.MEDIUM,
    });

    /*
    // CDK v2.177.0 では fromFleetArn でリソースを取得して CodeBuild Project を作らないとエラーが発生してしまう
    const fleet = codeBuild.Fleet.fromFleetArn(
      this,
      'CodeBuildFleet',
      'arn:aws:codebuild:ap-northeast-1:<account_id>:fleet/<fleet>'
    );
    */

    const projectName = `${props.projectName}-codebuild-project`;
    new codeBuild.Project(this, 'CodeBuildProject', {
      projectName,
      source: codeBuild.Source.s3({
        bucket: artifactBucket,
        path: 'source/source.zip',
      }),
      artifacts: codeBuild.Artifacts.s3({
        bucket: artifactBucket,
        path: 'artifacts/',
        includeBuildId: true,
      }),
      environment: {
        fleet,
        // 東京リージョンでは Windows Server 2019 はサポートされていない
        buildImage: codeBuild.WindowsBuildImage.WIN_SERVER_CORE_2022_BASE_3_0,
        // Windows の場合、サイズは MEDIUM 以上にする必要がある
        computeType: codeBuild.ComputeType.MEDIUM,
      },
      buildSpec: codeBuild.BuildSpec.fromSourceFilename('buildspec.yml'),
    });
  }
}
