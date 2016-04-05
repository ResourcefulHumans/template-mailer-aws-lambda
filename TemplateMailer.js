'use strict'

let Repository = require('repository')
let AWS = require('aws-sdk')
let Promise = require('bluebird')
let _template = require('lodash/template')
let nodemailer = require('nodemailer')

let handler = function (event, context) {

  console.log('Received event:', JSON.stringify(event, null, 2))
  console.log('operation', event.operation)
  let data = event.payload
  console.log('payload', data)

  console.log('Creating SimpleDB domains … ')

  let simpledb = new AWS.SimpleDB({apiVersion: '2009-04-15', endpoint: 'https://sdb.eu-west-1.amazonaws.com'})

  return Promise.join(
    Promise.promisify(simpledb.createDomain, {context: simpledb})({DomainName: 'template_mailer_smtp_credentials'}),
    Promise.promisify(simpledb.createDomain, {context: simpledb})({DomainName: 'template_mailer_templates'})
    )
    .then(() => {
      console.log('Done creating SimpleDB domains.')
      let SmtpCredentialRepository = new Repository(simpledb, 'template_mailer_smtp_credentials')
      let TemplateRepository = new Repository(simpledb, 'template_mailer_templates')
      switch (event.operation) {
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
              context.succeed('Stored');
            })
          break
        case 'get_smtp_credentials':
          if (!data.id || !/^[a-z0-9\-]+$/.test(data.id)) {
            throw new Error('Invalid id: ' + data.id)
          }
          return SmtpCredentialRepository.fetch(data.id)
            .then((result) => {
              context.succeed({
                $context: 'https://jsonld.nametacker.com/SmtpCredentials',
                $id: result.id,
                dsn: result.dsn,
                email: result.email,
                name: result.name
              })
            })
          break
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
              context.succeed('Stored');
            })
          break
        case 'get_template':
          if (!data.id || !/^[a-z0-9\-]+$/.test(data.id)) {
            throw new Error('Invalid id: ' + data.id)
          }
          return TemplateRepository.fetch(data.id)
            .then((result) => {
              context.succeed({
                $context: 'https://jsonld.nametacker.com/Template',
                $id: result.id,
                subject: result.subject,
                html: result.html,
                text: result.text
              })
            })
          break
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
              var subject
              var html
              return Promise.try(function () {
                subject = _template(template.subject)(data)
                html = _template(template.html)(data)
              }).then(() => {
                return Promise.try(function () {
                    console.log('Sending mail to "' + data.to + '" template: "' + data.template + '" via "' + data.transport + '"', data)
                    var headers = {}
                    headers['X-template-mailer-aws-lambda'] = 'v1'
                    var dsn = transport.dsn.match(/^([a-z]+):\/\/([^:]+):([^@]+)@([^:]+):(\d+)$/)
                    var nodemailerConfig = {
                      host: dsn[4],
                      auth: {
                        user: dsn[2],
                        pass: dsn[3]
                      },
                      port: dsn[5],
                      secure: dsn[1] === 'ssl'
                    }
                    var transporter = nodemailer.createTransport(
                      nodemailerConfig,
                      {
                        from: '"' + transport.name + '" <' + transport.email + '>',
                        headers: headers
                      }
                    )
                    // Send mail
                    Promise.promisifyAll(transporter)
                    var mailConfig = {
                      to: '"' + data.name + '" <' + data.to + '>',
                      subject: subject,
                      html: html
                    }
                    if (transport.bcc) {
                      mailConfig.bcc = transport.bcc
                    }
                    return transporter.sendMailAsync(mailConfig)
                  })
                  .then(function () {
                    console.log(
                      'Successfully send mail to "' + data.to +
                      '" template: "' + data.template + '" via "' + data.transport + '"',
                      {body: data}
                    )
                    context.suceed('Sent')
                  })
                  .catch(function (err) {
                    console.error('Failed to send mail to "' + data.to + '" template: "' + data.template +
                      '" via "' + data.transport + '"',
                      {
                        body: data,
                        error: err
                      }
                    )
                    context.fail(err)
                  })
              })
            })
          break;
        default:
          context.fail(new Error('Unrecognized operation "' + operation + '"'))
      }
    }).catch((err) => {
      context.fail(err)
    })
}

exports.lambda_handler = handler
