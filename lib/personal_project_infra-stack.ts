import * as cdk from 'aws-cdk-lib/core';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import * as path from 'path';

export class PersonalProjectInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const recordingsBucket = new s3.Bucket(this, 'RecordingsBucket', {
      bucketName: 'linkedin-puzzle-recordings',
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

    recordingsBucket.grantPut(visualizerLambda);

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
