'use strict'

const Joi = require('joi')
const _merge = require('lodash/merge')

const storeTemplate = (repo, id, body) => {
  const schema = Joi.object().keys({
    id: Joi.string().required().regex(/^[a-z0-9]+(?!-+$)[a-z0-9-]*$/).lowercase(),
    subject: Joi.string().trim().required(),
    html: Joi.string().trim().required(),
    text: Joi.string().trim()
  })
  const data = _merge({}, {id}, body)
  let v = Joi.validate(data, schema)
  if (v.error) {
    throw new Error('Validation failed: ' + v.error)
  }
  return repo.store(v.value.id, v.value)
    .then(() => {
      console.log('Stored template "' + v.value.id + '"')
    })
}

const retrieveTemplate = (repo, id) => {
  let v = Joi.validate(id, Joi.string().required().regex(/^[a-z0-9]+(?!-+$)[a-z0-9-]*$/).lowercase())
  if (v.error) {
    throw new Error('Validation failed: ' + v.error)
  }
  return repo.fetch(v.value)
    .then((result) => {
      if (!result) {
        throw new Error('Template not found: ' + v.value)
      }
      return {
        $context: 'https://github.com/ResourcefulHumans/template-mailer-aws-lambda/wiki/Template',
        $id: result.id,
        subject: result.subject,
        html: result.html,
        text: result.text
      }
    })
}

module.exports = {
  storeTemplate,
  retrieveTemplate
}
