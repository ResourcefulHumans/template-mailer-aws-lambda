'use strict'

let Promise = require('bluebird')

/**
 * @param {AWS.SimpleDB} simpledb
 * @param {String} domain
 * @constructor
 */
let Repository = function (simpledb, domain) {
  this.simpledb = simpledb
  this.domain = domain
}

/**
 * @param {String} id
 * @param {String} data
 * @return {promise}
 */
Repository.prototype.store = function (id, data) {
  let self = this
  return Promise.promisify(self.simpledb.putAttributes, {context: self.simpledb})({
    DomainName: self.domain,
    ItemName: id,
    Attributes: [
      {
        Name: 'data',
        Value: JSON.stringify(data),
        Replace: true
      }
    ]
  })
}

/**
 * @param {String} id
 * @return {promise}
 */
Repository.prototype.fetch = function (id) {
  let self = this
  return Promise
    .promisify(self.simpledb.getAttributes, {context: self.simpledb})({
      DomainName: self.domain,
      ItemName: id,
      AttributeNames: ['data']
    })
    .then((resp) => {
      if (!resp) {
        return null
      }
      return JSON.parse(resp.Attributes[0].Value)
    })
}

module.exports = Repository
