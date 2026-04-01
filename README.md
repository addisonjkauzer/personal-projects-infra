# PersonalProjectInfra

AWS CDK infrastructure for the LinkedIn Puzzle Solvers project. Deploys Lambda functions that run daily to visualize puzzle-solving algorithms, storing recordings in S3 and serving them via CloudFront alongside a personal portfolio dashboard.

## Architecture

### Lambda
- **`LinkedInPuzzleVisualizer`** — Docker-based function built from the `LinkedInPuzzleSolvers` project. Runs with 3GB memory and a 15-minute timeout. Solves five puzzle types: `ZIP`, `SUDOKU`, `TANGO`, `QUEENS`, and `PINPOINT`.

### Storage
- **`linkedin-puzzle-recordings`** (S3) — Stores puzzle visualization recordings. Versioned, with CORS enabled for GET/HEAD access.
- **`linkedin-puzzle-dashboard`** (S3) — Hosts the personal portfolio website, deployed from `PersonalPortfolio/dist`.

### CloudFront
- **`PuzzleDistribution`** — Serves the recordings bucket. The `recordings/*` path uses optimized caching; all other paths have caching disabled.
- **`WebsiteDistribution`** — Serves the portfolio dashboard. Returns `index.html` as the default root and for 403 errors (SPA routing).

### Scheduling (EventBridge)
- **`LinkedInPuzzleVisualizerWarmup`** — Fires at **08:00 UTC** daily, invoking the Lambda once per puzzle type with `{ warmup: true }` to pre-warm instances.
- **`LinkedInPuzzleVisualizerDaily`** — Fires at **08:05 UTC** daily, invoking the Lambda once per puzzle type to run and record each visualization.

### IAM Permissions (Lambda role)
- `cloudwatch:PutMetricData` — publish custom metrics
- `ssm:GetParameter` — read the Anthropic API key from SSM
- `cloudfront:CreateInvalidation` — invalidate the recordings CloudFront distribution after each run
- S3 read/write on the recordings bucket

## Prerequisites

- [Node.js](https://nodejs.org/)
- [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html) (`npm install -g aws-cdk`)
- AWS CLI configured with valid credentials
- Docker (required to build the Lambda image asset)
- `LinkedInPuzzleSolvers` project checked out at `../LinkedInPuzzleSolvers`
- `PersonalPortfolio` project built at `../PersonalPortfolio/dist`
- SSM parameter `/linkedin-puzzle-solvers/anthropic-api-key` present in the target account/region

## Getting Started

```bash
npm install
npm run build
npx cdk bootstrap   # first time only
npx cdk deploy
```

## Outputs

| Output | Description |
|---|---|
| `CloudFrontDomain` | CloudFront URL for puzzle recordings and metadata |
| `WebsiteURL` | URL for the puzzle dashboard website |

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
