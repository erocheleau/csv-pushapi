var request = require('request');
var assert = require('assert');
var promiseRetry = require('promise-retry');
var Q = require('q');


module.exports = class PushClient {

  constructor(config, retryOptions) {
    config = config || {}; retryOptions = retryOptions || {};
    assert(config.organizationId, `PushClient needs an organizationId in the config.`);
    assert(config.sourceId, `PushClient needs an sourceId in the config.`);
    assert(config.pushApiKey, `PushClient needs an pushApiKey in the config.`);

    this.organizationId = config.organizationId;
    this.sourceId = config.sourceId;
    this.pushApiKey = config.pushApiKey;
    this.SERVER = config.server || 'push.cloud.coveo.com';
    this.APIVERSION = config.apiversion || 'v1';

    this.RETRY = retryOptions.retry || true;
    this.RETRY_ATTEMPTS = retryOptions.attempts || 5;
    this.RETRY_DELAY = retryOptions.delay || 3000; //milliseconds

  }

  pushDocumentWithRetry(document, callback) {
    return (callback instanceof Function) ? this.pushDocumentCallback(document, callback) : this.pushDocumentPromise(document);
  }

  pushDocumentCallback(document, callback) {
    this.pushDocumentPromise(document)
      .then(res => {
        callback(res);
      })
      .catch(err => {
        callback(undefined, err);
      })
  }

  pushDocumentPromise(document) {
    let requestOptions = this.buildPushOptions(document);

    return promiseRetry((retry, retryNumber) => {
      return Q()
        .then(() => {
          return this.pushRequest(requestOptions);
        })
        .catch(e => {
          if (retryNumber < this.RETRY_ATTEMPTS) {
            console.error(e);
            console.log(`Retrying (${retryNumber}/${this.RETRY_ATTEMPTS}) document ${document.documentId}`);
            retry(e);
          } else {
            console.error(`Document ${document.documentId} || Failed too many times ${e}`);
            throw e;
          }
        });
    }, {
        minTimeout: this.RETRY_DELAY,
        maxTimeout: this.RETRY_DELAY
      });
  }

  pushRequest(requestOptions) {
    return new Promise((resolve, reject) => {
      request(requestOptions, (error, response, body) => {
        if (error) {
          reject(`Error || ${error} || trying to push document... ${document.documentId}`);
        } else if (response && response.statusCode !== 202) {
          reject(`${response.statusCode} : ${response.body}`);
        } else {
          resolve(true);
        }
      });
    });
  }

  buildPushOptions(document) {
    return {
      url: `https://${this.SERVER}/${this.APIVERSION}/organizations/${this.organizationId}/sources/${this.sourceId}/documents`,
      qs: { documentId: document.documentId },
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'Authorization': 'Bearer ' + this.pushApiKey
      },
      body: JSON.stringify(document)
    }
  }
}