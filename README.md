# template-mailer-aws-lambda

[![npm version](https://img.shields.io/npm/v/template-mailer-aws-lambda.svg)](https://www.npmjs.com/package/template-mailer-aws-lambda)
[![Build Status](https://travis-ci.org/ResourcefulHumans/template-mailer-aws-lambda.svg?branch=master)](https://travis-ci.org/ResourcefulHumans/template-mailer-aws-lambda)
[![monitored by greenkeeper.io](https://img.shields.io/badge/greenkeeper.io-monitored-brightgreen.svg)](http://greenkeeper.io/) 
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)
[![semantic-release](https://img.shields.io/badge/semver-semantic%20release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Code Climate](https://codeclimate.com/github/ResourcefulHumans/template-mailer-aws-lambda/badges/gpa.svg)](https://codeclimate.com/github/ResourcefulHumans/template-mailer-aws-lambda)

A transactional email mailer that runs on AWS lambda.

## Setup

### IAM

Create a role for the lambda function in IAM and attach these policies:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "Stmt1459942470000",
            "Effect": "Allow",
            "Action": [
                "s3:*"
            ],
            "Resource": [
                "arn:aws:s3:::template-mailer/*"
            ]
        }
    ]
}
```

*Replace `template-mailer` with your bucket name.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "Stmt1475239732000",
            "Effect": "Allow",
            "Action": [
                "ses:SendEmail",
                "ses:SendRawEmail"
            ],
            "Resource": [
                "*"
            ]
        }
    ]
}
```

### S3

Create the S3 bucket used by the mailer.

### Lambda

Copy `config.json.dist` to `config.json` and adapt to your needs.

Run 

    ROLE="…" make deploy

to publish the lambda function. 

You can override the default function name with the environment variable `FUNCTION_NAME`.

You might also be interested in setting these environment variables for the `aws` CLI:

 - `AWS_ACCESS_KEY_ID`
 - `AWS_SECRET_ACCESS_KEY`
 - `AWS_DEFAULT_REGION`

### API Gateway

Then setup an [API Gateway Lamdba Proxy](http://docs.aws.amazon.com/apigateway/latest/developerguide/integrating-api-with-aws-services-lambda.html).

## Init configuration

Create the template `foo`:

    curl -v -X PUT https://XXXX.execute-api.YYYY.amazonaws.com/production/templates/foo \
    -H 'X-API-Key: ????' \
    -H 'Content-Type: application/vnd.resourceful-humans.template-mailer-aws-lambda.v2+json; charset=utf-8' \
    --data '{"subject":"Mail for <%= name %>","html":"Hello <%= name %>"}'

Create the transport `bar`:

    curl -v -X PUT https://XXXX.execute-api.YYYY.amazonaws.com/production/transport/bar \
    -H 'X-API-Key: ????' \
    -H 'Content-Type: application/vnd.resourceful-humans.template-mailer-aws-lambda.v2+json; charset=utf-8' \
    --data '{"email":"info@example.com","name":"Example Inc."}'

Send an email using the transport `bar` and the template `foo`:
    
    curl -v -X POST https://XXXX.execute-api.YYYY.amazonaws.com/production/send/bar/foo \
    -H 'X-API-Key: ????' \
    -H 'Content-Type: application/vnd.resourceful-humans.template-mailer-aws-lambda.v2+json; charset=utf-8' \
    --data '{"to":"john.doe@example.com","name":"John Doe"}'

## Templates

The `subject`, `html` and `text` part of the template will be parsed through [lodash's template function](https://lodash.com/docs#template)
with the data provided in the `body` of this request.

You can provide the data with a formatter hint:

    "subject": {
      "@markdown": "This will be parsed with *markdown*"
    }
    
it will parsed into 

    "subject": {
      "@text": "This will be parsed with *markdown*",                // the original value
      "@html": "This will be parsed with <strong>markdown</strong>"  // the HTML result
    }

and can be access in the template accordingly.

## Live

:earth_africa: <https://huvg4qxbta.execute-api.eu-central-1.amazonaws.com/prod>

This API is hosted as the [`TemplateMailer2`](https://eu-central-1.console.aws.amazon.com/lambda/home?region=eu-central-1#/functions/TemplateMailer2?tab=code) AWS Lambda function and the HTTP endpoint is provided via the [`TemplateMailer2`](https://eu-central-1.console.aws.amazon.com/apigateway/home?region=eu-central-1#/apis/huvg4qxbta/stages/prod) API Gateway stage. 

The Lambda function uses the role [`template-mailer`](https://console.aws.amazon.com/iam/home?region=eu-central-1#/roles/template-mailer).

### Deployment

Updating live is done via the [`Makefile`](https://github.com/ResourcefulHumans/template-mailer-aws-lambda/blob/master/Makefile).

    make update

It uses the [AWS CLI](https://aws.amazon.com/de/cli/) to update the Lamda function code. `aws` uses [the standard AWS environment variables](http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html#cli-environment) for authentication:

 * `AWS_ACCESS_KEY_ID`  
   The AWS access key to use
 * `AWS_SECRET_ACCESS_KEY`  
   The AWS secret access key to use

You can create new AWS keys via [IAM](https://console.aws.amazon.com/iam/home?region=eu-central-1). The new user needs the neccessary permissions to update the lambda function (see above).

