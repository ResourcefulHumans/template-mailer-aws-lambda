# template-mailer-aws-lambda

[![monitored by greenkeeper.io](https://img.shields.io/badge/greenkeeper.io-monitored-brightgreen.svg)](http://greenkeeper.io/) 
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

A transactional email mailer that runs on AWS lambda.

## Setup

Run 

    ROLE="…" make deploy

to publish the lambda function. You should adapt the S3 bucket name.

Then setup an API Gateway with the provided [api-gateway-swagger.yaml](/api-gateway-swagger.yaml)

## Init configuration

Create the template `foo`:

    curl -v -X PUT https://XXXX.execute-api.YYYY.amazonaws.com/production/templates/templates/foo \
    -H 'X-API-Key: ????' \
    -H 'Content-Type: application/vnd.resourceful-humans.template-mailer-aws-lambda.v1+json; charset=utf-8' \
    --data '{"subject":"Mail for <%= name %>","html":"Hello <%= name %>"}'

Create the SMTP transport `bar`:

    curl -v -X PUT https://XXXX.execute-api.YYYY.amazonaws.com/production/smtp_credentials/bar \
    -H 'X-API-Key: ????' \
    -H 'Content-Type: application/vnd.resourceful-humans.template-mailer-aws-lambda.v1+json; charset=utf-8' \
    --data '{"dsn":"smtp://john:doe@example.com:25","email":"info@example.com","name":"Example Inc."}'

Send an email using the transport `bar` and the template `foo`:
    
    curl -v -X POST https://XXXX.execute-api.YYYY.amazonaws.com/production/send/bar/foo \
    -H 'X-API-Key: ????' \
    -H 'Content-Type: application/vnd.resourceful-humans.template-mailer-aws-lambda.v1+json; charset=utf-8' \
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
