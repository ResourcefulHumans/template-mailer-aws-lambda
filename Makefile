.DEFAULT_GOAL := help
.PHONY: help deploy delete update

deploy: build/TemplateMailer.zip ## Deploy to AWS lambda
	aws lambda create-function --region eu-central-1 --function-name TemplateMailer \
	--zip-file fileb://./build/TemplateMailer.zip --role $(ROLE) \
	--timeout 60 \
	--handler TemplateMailer.lambda_handler --runtime nodejs

delete:
	aws lambda delete-function --region eu-central-1 --function-name TemplateMailer

update: build/TemplateMailer.zip ## Update the lambda function with new build
	aws lambda update-function-code --region eu-central-1 --function-name TemplateMailer \
	--zip-file fileb://./build/TemplateMailer.zip

build/TemplateMailer.zip: *.js package.json
	rm -rf build
	mkdir -p build/node_modules
	./node_modules/.bin/babel TemplateMailer.js -o build/TemplateMailer.js
	./node_modules/.bin/babel repository.js -o build/node_modules/repository.js
	cd build && npm install aws-sdk bluebird lodash nodemailer showdown
	rm -f build/TemplateMailer.zip
	cd build && zip -r TemplateMailer.zip *.js node_modules

api:
	aws apigateway create-rest-api --name TemplateMailer
	# Continue at http://docs.aws.amazon.com/lambda/latest/dg/with-on-demand-https-example-configure-event-source.html

help: ## (default), display the list of make commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
