import * as cdk from 'aws-cdk-lib/core';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import * as path from 'path';

export class PersonalProjectInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const recordingsBucket = new s3.Bucket(this, 'RecordingsBucket', {
      bucketName: 'linkedin-puzzle-recordings',
      versioned: true,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
        maxAge: 3000,
      }],
    });

    const visualizerLambda = new lambda.DockerImageFunction(this, 'LinkedInPuzzleVisualizer', {
      functionName: 'LinkedInPuzzleVisualizer',
      code: lambda.DockerImageCode.fromImageAsset(
        path.join(__dirname, '../../LinkedInPuzzleSolvers')
      ),
      timeout: cdk.Duration.minutes(15),
      memorySize: 3008,
      environment: {
        RECORDINGS_BUCKET: recordingsBucket.bucketName,
        ANTHROPIC_API_KEY_PARAM: '/linkedin-puzzle-solvers/anthropic-api-key',
      },
    });

    visualizerLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['cloudwatch:PutMetricData'],
      resources: ['*'],
    }));

    visualizerLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter/linkedin-puzzle-solvers/anthropic-api-key`],
    }));

    recordingsBucket.grantReadWrite(visualizerLambda);

    const distribution = new cloudfront.Distribution(this, 'PuzzleDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(recordingsBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      },
      additionalBehaviors: {
        'recordings/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(recordingsBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        },
      },
      comment: 'LinkedIn Puzzle Recordings',
    });

    new cdk.CfnOutput(this, 'CloudFrontDomain', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront URL for puzzle recordings and metadata',
    });

    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: 'linkedin-puzzle-dashboard',
    });

    const websiteDistribution = new cloudfront.Distribution(this, 'WebsiteDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      },
      defaultRootObject: 'index.html',
      errorResponses: [{
        httpStatus: 403,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
      }],
      comment: 'LinkedIn Puzzle Dashboard',
    });

    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../PersonalPortfolio/dist'))],
      destinationBucket: websiteBucket,
      distribution: websiteDistribution,
      distributionPaths: ['/*'],
    });

    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: `https://${websiteDistribution.distributionDomainName}`,
      description: 'URL for the puzzle dashboard website',
    });

    const warmupRule = new events.Rule(this, 'WarmupRule', {
      ruleName: 'LinkedInPuzzleVisualizerWarmup',
      schedule: events.Schedule.cron({ minute: '0', hour: '8' }),
      description: 'Warms up LinkedInPuzzleVisualizer instances 5 minutes before daily run',
    });

    for (const puzzle of ['ZIP', 'SUDOKU', 'TANGO', 'QUEENS', 'PINPOINT']) {
      warmupRule.addTarget(new targets.LambdaFunction(visualizerLambda, {
        event: events.RuleTargetInput.fromObject({ puzzle, warmup: true }),
      }));
    }

    const dailyRule = new events.Rule(this, 'DailyVisualizationRule', {
      ruleName: 'LinkedInPuzzleVisualizerDaily',
      schedule: events.Schedule.cron({ minute: '5', hour: '8' }),
      description: 'Triggers LinkedIn Puzzle visualizeAlgorithm tests daily at 12:05 AM UTC',
    });

    for (const puzzle of ['ZIP', 'SUDOKU', 'TANGO', 'QUEENS', 'PINPOINT']) {
      dailyRule.addTarget(new targets.LambdaFunction(visualizerLambda, {
        event: events.RuleTargetInput.fromObject({ puzzle }),
      }));
    }
  }
}
