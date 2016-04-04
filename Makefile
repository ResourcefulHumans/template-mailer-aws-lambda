.DEFAULT_GOAL := help
.PHONY: help deploy

deploy: TemplateMailer.zip ## Deploy to AWS lambda
	aws lambda delete-function --region eu-central-1 --function-name TemplateMailer
	aws lambda create-function --region eu-central-1 --function-name TemplateMailer \
	--zip-file fileb://./TemplateMailer.zip --role $(ROLE) \
	--handler TemplateMailer.lambda_handler --runtime nodejs

TemplateMailer.zip: TemplateMailer.js
	zip $@ $<

api:
	aws apigateway create-rest-api --name TemplateMailer
	# Continue at http://docs.aws.amazon.com/lambda/latest/dg/with-on-demand-https-example-configure-event-source.html

help: ## (default), display the list of make commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
