# PersonalProjectInfra

AWS CDK infrastructure for the LinkedIn Puzzle Solvers project. Deploys a Lambda function that runs daily to visualize puzzle-solving algorithms and stores recordings in S3.

## Architecture

- **Lambda** (`LinkedInPuzzleVisualizer`) — Docker-based function built from the `LinkedInPuzzleSolvers` project. Runs with 3GB memory and a 15-minute timeout.
- **S3 Bucket** (`linkedin-puzzle-recordings`) — Stores puzzle visualization recordings produced by the Lambda.
- **EventBridge Rule** (`LinkedInPuzzleVisualizerDaily`) — Triggers the Lambda daily at 08:05 UTC.

## Prerequisites

- [Node.js](https://nodejs.org/)
- [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html) (`npm install -g aws-cdk`)
- AWS CLI configured with valid credentials
- Docker (required to build the Lambda image asset)

## Getting Started

```bash
npm install
npm run build
npx cdk bootstrap   # first time only
npx cdk deploy
```

## Useful Commands

| Command | Description |
|---|---|
| `npm run build` | Compile TypeScript to JS |
| `npm run watch` | Watch for changes and recompile |
| `npm run test` | Run Jest unit tests |
| `npx cdk synth` | Emit the synthesized CloudFormation template |
| `npx cdk diff` | Compare deployed stack with current state |
| `npx cdk deploy` | Deploy this stack to your default AWS account/region |
| `npx cdk destroy` | Tear down the deployed stack |
