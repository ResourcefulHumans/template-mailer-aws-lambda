'use strict'

const Promise = require('bluebird')
const templateOperations = require('./operations/templates')
const transportOperations = require('./operations/transport')
const sendOperations = require('./operations/send')
const Repository = require('./repository')
const AWS = require('aws-sdk')
const CONTENT_TYPE = 'application/vnd.resourceful-humans.template-mailer-aws-lambda.v2+json; charset=utf-8'
const config = require('./config.json')

exports.handler = (event, context, callback) => {
  let statusCode = 200
  const done = (err, res) => {
    if (err) console.error(err)
    return callback(null, {
      statusCode: err ? 400 : (res ? statusCode : 204),
      body: err ? err.message : JSON.stringify(res),
      headers: {
        'Content-Type': CONTENT_TYPE
      }
    })
  }

  Promise
    .try(() => {
      if (event.headers === null || !event.headers['Content-Type']) {
        throw new Error('Must provide Content-Type')
      }
      if (event.headers['Content-Type'] !== CONTENT_TYPE) {
        throw new Error('Unsupported content type: "' + event.headers['Content-Type'] + '"')
      }
      const s3 = new AWS.S3({
        apiVersion: '2006-03-01',
        signatureVersion: 'v4',
        region: config.region.s3
      })
      const ses = new AWS.SES({
        apiVersion: '2010-12-01',
        signatureVersion: 'v4',
        region: config.region.ses
      })
      const TransportRepository = new Repository(s3, config.bucket, 'transport')
      const TemplateRepository = new Repository(s3, config.bucket, 'template')
      const parts = event.path.split('/')
      const body = JSON.parse(event.body)

      if (/^\/templates/.test(event.path)) {
        const id = parts[2]
        switch (event.httpMethod) {
          case 'PUT':
            return templateOperations.storeTemplate(TemplateRepository, id, body)
          case 'GET':
            return templateOperations.retrieveTemplate(TemplateRepository, id)
          default:
            throw new Error(`Unsupported action "${event.httpMethod}" for templates`)
        }
      } else if (/^\/transport/.test(event.path)) {
        const id = parts[2]
        switch (event.httpMethod) {
          case 'PUT':
            return transportOperations.storeConfig(TransportRepository, id, body)
          case 'GET':
            return transportOperations.retrieveConfig(TransportRepository, id)
          default:
            throw new Error(`Unsupported action "${event.httpMethod}" for transports`)
        }
      } else if (/^\/send/.test(event.path)) {
        const transport = parts[2]
        const template = parts[3]
        switch (event.httpMethod) {
          case 'POST':
            return sendOperations.send(ses, TransportRepository, TemplateRepository, transport, template, body)
              .then(res => {
                statusCode = 202
                return res
              })
          default:
            throw new Error(`Unsupported action "${event.httpMethod}" for sending`)
        }
      } else {
        throw new Error(`Unsupported action "${event.httpMethod} ${event.path}"`)
      }
    })
    .then(res => done(null, res))
    .catch(err => done(err))
}
