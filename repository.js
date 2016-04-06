'use strict'

let Promise = require('bluebird')

/**
 * @param {AWS.S3} s3
 * @param {String} prefix
 * @param {String} bucket
 * @constructor
 */
let Repository = function (s3, bucket, prefix) {
  this.s3 = s3
  this.prefix = prefix
  this.bucket = bucket
}

/**
 * @param {String} id
 * @param {String} data
 * @return {promise}
 */
Repository.prototype.store = function (id, data) {
  let self = this
  return Promise
    .promisify(self.s3.putObject, {context: self.s3})({
      Bucket: self.bucket,
      Key: self.prefix + '-' + id + '.json',
      Body: JSON.stringify(data),
      ContentType: 'applicaton/json'
    })
}

/**
 * @param {String} id
 * @return {promise}
 */
Repository.prototype.fetch = function (id) {
  let self = this
  return Promise
    .promisify(self.s3.getObject, {context: self.s3})({
      Bucket: self.bucket,
      Key: self.prefix + '-' + id + '.json'
    })
    .then((resp) => {
      if (!resp) {
        return null
      }
      return JSON.parse(resp.Body)
    })
}

module.exports = Repository
