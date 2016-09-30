'use strict'

const Joi = require('joi')
const _merge = require('lodash/merge')
const _template = require('lodash/template')
const _forEach = require('lodash/forEach')
const Promise = require('bluebird')
const showdown = require('showdown')
const converter = new showdown.Converter({
  simplifiedAutoLink: true,
  strikethrough: true,
  tables: true
})

const formatContent = (data) => {
  if (!(typeof data === 'object')) {
    return data
  }
  if (data['@markdown']) {
    return {
      '@text': data['@markdown'],
      '@html': converter.makeHtml(data['@markdown'])
    }
  }
  _forEach(data, (value, key) => {
    data[key] = formatContent(value)
  })
  return data
}

const send = (ses, transportRepo, templateRepo, transport, template, body) => {
  const schema = Joi.object().keys({
    transport: Joi.string().required().regex(/^[a-z0-9]+(?!-+$)[a-z0-9-]*$/).lowercase(),
    template: Joi.string().required().regex(/^[a-z0-9]+(?!-+$)[a-z0-9-]*$/).lowercase(),
    to: Joi.string().email().required(),
    name: Joi.string().required().trim()
  })
  const data = _merge({}, {transport, template}, body)
  let v = Joi.validate(data, schema, {allowUnknown: true})
  if (v.error) {
    throw new Error('Validation failed: ' + v.error)
  }
  return Promise
    .join(
      transportRepo.fetch(v.value.transport),
      templateRepo.fetch(v.value.template)
    )
    .spread((transport, template) => {
      if (!transport || !template) {
        throw new Error('Transport or Template not found')
      }
      // Try to apply template
      let from, to, bcc, subject, html, text
      let templateData = v.value
      return Promise
        .try(() => {
          return Promise
            .try(() => {
              subject = _template(template.subject)(templateData)
              templateData.subject = subject
              templateData = formatContent(templateData)
              templateData._ = require('lodash')
              html = _template(template.html)(templateData)
              if (template.text) {
                text = _template(template.text)(templateData)
              }
            })
            .catch((err) => {
              console.error(err)
              throw new Error('Failed to render template: "' + v.value.template + '" with data "' + templateData + '"')
            })
        })
        .then(() => {
          from = '"' + transport.name + '" <' + transport.email + '>'
          to = '"' + v.value.name + '" <' + v.value.to + '>'
          bcc = transport.bcc
          const params = {
            Destination: {
              ToAddresses: [to]
            },
            Source: from,
            Message: {
              Body: {
                Html: {
                  Data: html,
                  Charset: 'UTF-8'
                }
              },
              Subject: {
                Data: subject,
                Charset: 'UTF-8'
              }
            }
          }
          if (bcc) {
            params.Destination.BccAddresses = [bcc]
          }
          if (text) {
            params.Message.Body.Text = {
              Data: text,
              Charset: 'UTF-8'
            }
          }
          return Promise.promisify(ses.sendEmail, {context: ses})(params)
        })
        .then(function () {
          console.log('Successfully send mail to "' + to + '" template: "' + v.value.template + '" via "' + v.value.transport + '"')
        })
        .catch((err) => {
          console.error('Failed to send mail to "' + to + '" template: "' + v.value.template + '" via "' + v.value.transport + '"', err)
          throw err
        })
    })
}

module.exports = {
  send
}
