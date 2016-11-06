.DEFAULT_GOAL := help
.PHONY: help deploy delete update

FUNCTION_NAME ?= "TemplateMailer2"

deploy: TemplateMailer.zip ## Deploy to AWS lambda
	aws lambda create-function \
	--function-name $(FUNCTION_NAME) \
	--zip-file fileb://./TemplateMailer.zip \
	--role $(ROLE) \
	--timeout 60 \
	--handler index.handler \
	--runtime nodejs4.3

delete:
	aws lambda delete-function --region $(REGION) --function-name $(FUNCTION_NAME)

update: TemplateMailer.zip ## Update the lambda function with new build
	aws lambda update-function-code \
	--function-name $(FUNCTION_NAME) \
	--zip-file fileb://./TemplateMailer.zip
	rm ./TemplateMailer.zip

TemplateMailer.zip: *.js package.json config.json
	zip -r $@ ./

api:
	# TODO: Implement

help: ## (default), display the list of make commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
