var request = require('request');

module.exports = class PushClient {

  constructor(pushConfig, retryOptions) {
    if(!pushConfig.organizationId) throw new Error(`PushClient needs an organizationId in the pushConfig.`);
    if(!pushConfig.sourceId) throw new Error(`PushClient needs an sourceId in the pushConfig.`);
    if(!pushConfig.pushtoken) throw new Error(`PushClient needs an pushtoken in the pushConfig.`);
    this.organizationId = pushConfig.organizationId;
    this.sourceId = pushConfig.sourceId;
    this.pushtoken = pushConfig.pushtoken;
    this.SERVER = pushConfig.server || 'push.cloud.coveo.com';
    this.APIVERSION = pushConfig.apiversion || 'v1';

    this.RETRY = retryOptions.retry || true;
    this.RETRY_ATTEMPTS = retryOptions.attempts || 5;
    this.RETRY_DELAY = retryOptions.delay || 3000; //milliseconds

  }

  pushDocument(document, callback) {
    if (callback) return this.pushDocumentCallback(document, callback, 0);

    return this.pushDocumentPromise(document, 0);
  }

  pushDocumentCallback(document, callback, retryCount) {
    console.log(document);
    request({
      url: `https://${this.SERVER}/${this.APIVERSION}/organizations/${this.organizationId}/sources/${this.sourceId}/documents`,
      qs: { documentId: document.documentId },
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'Authorization': 'Bearer ' + this.pushtoken
      },
      body: JSON.stringify(document)
    }, (error, response, body) => {
      if(error)
      if (this.RETRY && retryCount < this.RETRY_ATTEMPTS) {
        return setTimeout(() => {this.pushDocumentCallback(document, callback, ++retryCount)}, this.RETRY_DELAY);
      } else {
        callback(error, response, body)
      }
    });
  }

  pushDocumentPromise(document, retryCount) {
    return new Promise((resolve, reject) => {
      request({
        url: `https://${this.SERVER}/${this.APIVERSION}/organizations/${this.organizationId}/sources/${this.sourceId}/documents`,
        qs: { documentId: document.documentId },
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          'Authorization': 'Bearer ' + this.pushtoken
        },
        body: JSON.stringify(document)
      }, (error, response, body) => {
        if (error) {
          if (this.RETRY && retryCount < this.RETRY_ATTEMPTS) {
            console.log(`Error || ${error} || trying to push ${document.documentId}...`);
            console.log(`Retrying ${retryCount+1} time(s) to push ${document.documentId}...`);
            return setTimeout(() => {this.pushDocumentPromise(document, ++retryCount)}, this.RETRY_DELAY)
          } else {
            reject(error);
          }
        }
        if(response && response.statusCode != 202) {
          if (this.RETRY && retryCount < this.RETRY_ATTEMPTS) {
            console.log(`Error || ${response.statusCode} : ${response.body} || trying to push ${document.documentId}...`);
            console.log(`Retrying ${retryCount+1} time(s) to push ${document.documentId}...`);
            return setTimeout(() => {this.pushDocumentPromise(document, ++retryCount)}, this.RETRY_DELAY)
          } else {
            reject(`${response.statusCode} : ${response.body}`);
          }
        }
        if(response && response.statusCode == 202) {
          resolve(`Pushed document : ${document.documentId}`);
        }
        reject(`Unknown error pushing the document.`);
      });
    });

  }
}