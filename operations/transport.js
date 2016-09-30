'use strict'

const Joi = require('joi')
const _merge = require('lodash/merge')

const storeConfig = (repo, id, body) => {
  const schema = Joi.object().keys({
    id: Joi.string().required().regex(/^[a-z0-9]+(?!-+$)[a-z0-9-]*$/).lowercase(),
    email: Joi.string().email().required(),
    bcc: Joi.string().email(),
    name: Joi.string().required().trim()
  })
  const data = _merge({}, {id}, body)
  let v = Joi.validate(data, schema)
  if (v.error) {
    throw new Error('Validation failed: ' + v.error)
  }
  return repo.store(v.value.id, v.value)
    .then(() => {
      console.log('Stored transport "' + v.value.id + '"')
    })
}

const retrieveConfig = (repo, id) => {
  let v = Joi.validate(id, Joi.string().required().regex(/^[a-z0-9]+(?!-+$)[a-z0-9-]*$/).lowercase())
  if (v.error) {
    throw new Error('Validation failed: ' + v.error)
  }
  return repo.fetch(v.value)
    .then((result) => {
      if (!result) {
        throw new Error('Config not found: ' + v.value)
      }
      return {
        $context: 'https://github.com/ResourcefulHumans/config-mailer-aws-lambda/wiki/Config',
        $id: result.id,
        email: result.email,
        name: result.name,
        bcc: result.bcc
      }
    })
}

module.exports = {
  storeConfig,
  retrieveConfig
}
