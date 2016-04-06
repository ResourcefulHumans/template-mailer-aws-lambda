'use strict'

let Repository = require('repository')
let AWS = require('aws-sdk')
let Promise = require('bluebird')
let _template = require('lodash/template')
let nodemailer = require('nodemailer')

let handler = function (event, context) {
  console.log('Received event:', JSON.stringify(event, null, 2))
  let data = event.payload
  let operation = event.operation
  console.log('payload', data)
  console.log('operation', event.operation)

  let s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    endpoint: 'https://s3.eu-central-1.amazonaws.com/',
    signatureVersion: 'v4'
  })

  return Promise
    .try(() => {
      let SmtpCredentialRepository = new Repository(s3, 'template-mailer', 'smtp_credentials')
      let TemplateRepository = new Repository(s3, 'template-mailer', 'template')
      switch (operation) {
        case 'store_smtp_credentials':
          if (!data.id || !/^[a-z0-9\-]+$/.test(data.id)) {
            throw new Error('Invalid id: ' + data.id)
          }
          if (!data.dsn || !/^[a-z]+:\/\/[^:]+:[^@]+@[^:]+:\d+$/.test(data.dsn)) {
            throw new Error('Invalid DSN: ' + data.dsn)
          }
          if (!data.email || !/.+@.+/.test(data.email)) {
            throw new Error('Invalid email: ' + data.email)
          }
          if (data.bcc && !/.+@.+/.test(data.bcc)) {
            throw new Error('Invalid bcc: ' + data.bcc)
          }
          if (!data.name || !data.name.length) {
            throw new Error('Invalid name: ' + data.name)
          }
          return SmtpCredentialRepository.store(data.id, data)
            .then(() => {
              context.succeed('Stored')
            })
        case 'get_smtp_credentials':
          if (!data.id || !/^[a-z0-9\-]+$/.test(data.id)) {
            throw new Error('Invalid id: ' + data.id)
          }
          return SmtpCredentialRepository.fetch(data.id)
            .then((result) => {
              if (!result) {
                throw new Error('Credentials not found: ' + data.id)
              }
              context.succeed({
                $context: 'https://github.com/ResourcefulHumans/template-mailer-aws-lambda/wiki/SmtpCredentials',
                $id: result.id,
                dsn: result.dsn,
                email: result.email,
                name: result.name
              })
            })
        case 'store_template':
          if (!data.id || !/^[a-z0-9\-]+$/.test(data.id)) {
            throw new Error('Invalid id: ' + data.id)
          }
          if (!data.subject || !data.subject.length) {
            throw new Error('Invalid subject: ' + data.subject)
          }
          if (!data.html || !data.html.length) {
            throw new Error('Invalid subject: ' + data.html)
          }
          if (data.text && !data.text.length) {
            throw new Error('Invalid text: ' + data.text)
          }
          return TemplateRepository.store(data.id, data)
            .then(() => {
              context.succeed('Stored')
            })
        case 'get_template':
          if (!data.id || !/^[a-z0-9\-]+$/.test(data.id)) {
            throw new Error('Invalid id: ' + data.id)
          }
          return TemplateRepository.fetch(data.id)
            .then((result) => {
              if (!result) {
                throw new Error('Template not found: ' + data.id)
              }
              context.succeed({
                $context: 'https://github.com/ResourcefulHumans/template-mailer-aws-lambda/wiki/Template',
                $id: result.id,
                subject: result.subject,
                html: result.html,
                text: result.text
              })
            })
        case 'send':
          if (!data.transport || !/^[a-z0-9\-]+$/.test(data.transport)) {
            throw new Error('Invalid transport: ' + data.transport)
          }
          if (!data.template || !/^[a-z0-9\-]+$/.test(data.template)) {
            throw new Error('Invalid template: ' + data.template)
          }
          if (!data.name || !data.name.length) {
            throw new Error('Invalid name: ' + data.name)
          }
          if (!data.to || !/.+@.+/.test(data.to)) {
            throw new Error('Invalid email: ' + data.to)
          }
          return Promise.join(
            SmtpCredentialRepository.fetch(data.transport),
            TemplateRepository.fetch(data.template)
            )
            .spread((transport, template) => {
              if (!transport || !template) {
                throw new Error('Transport or Template not found')
              }
              // Try to apply template
              let subject
              let html
              let text
              return Promise.try(function () {
                subject = _template(template.subject)(data)
                html = _template(template.html)(data)
                if (template.text) {
                  text = _template(template.text)(data)
                }
              }).then(() => {
                return Promise
                  .try(function () {
                    let headers = {}
                    headers['X-template-mailer-aws-lambda'] = 'v1'
                    let dsn = transport.dsn.match(/^([a-z]+):\/\/([^:]+):([^@]+)@([^:]+):(\d+)$/)
                    let nodemailerConfig = {
                      host: dsn[4],
                      auth: {
                        user: decodeURIComponent(dsn[2]),
                        pass: decodeURIComponent(dsn[3])
                      },
                      port: dsn[5],
                      secure: dsn[1] === ('smtps' || 'ssl')
                    }
                    let transporter = nodemailer.createTransport(
                      nodemailerConfig,
                      {
                        from: '"' + transport.name + '" <' + transport.email + '>',
                        headers: headers
                      }
                    )
                    // Send mail
                    Promise.promisifyAll(transporter)
                    let mailConfig = {
                      to: '"' + data.name + '" <' + data.to + '>',
                      subject: subject,
                      html: html
                    }
                    if (transport.bcc) {
                      mailConfig.bcc = transport.bcc
                    }
                    if (text) {
                      mailConfig.text = text
                    }
                    return transporter.sendMailAsync(mailConfig)
                  })
                  .then(function () {
                    console.log(
                      'Successfully send mail to "' + data.to +
                      '" template: "' + data.template + '" via "' + data.transport + '"',
                      {body: data}
                    )
                    context.succeed('Sent')
                  })
                  .catch(function (err) {
                    console.error('Failed to send mail to "' + data.to + '" template: "' + data.template +
                      '" via "' + data.transport + '"',
                      {
                        body: data,
                        error: err
                      }
                    )
                    throw err
                  })
              })
            })
        default:
          throw new Error('Unrecognized operation "' + operation + '"')
      }
    }).catch((err) => {
      if (err.name === 'ReferenceError') {
        context.fail(new Error('TemplateError: ' + err.message))
      } else {
        context.fail(err)
      }
    })
}

exports.lambda_handler = handler
