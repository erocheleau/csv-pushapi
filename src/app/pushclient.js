/**
 * You need to rename this file to PushClient.js
 * Good OS are case-sensitive.
 */

const request = require('request');

module.exports = class PushClient {

  constructor(pushConfig, retryOptions) {
    if(!pushConfig.organizationId) {
      throw new Error(`PushClient needs an organizationId in the pushConfig.`);
    }
    if(!pushConfig.sourceId) {
      throw new Error(`PushClient needs an sourceId in the pushConfig.`);
    }
    if(!pushConfig.pushApiKey) {
      throw new Error(`PushClient needs an pushApiKey in the pushConfig.`);
    }
    this.organizationId = pushConfig.organizationId;
    this.sourceId = pushConfig.sourceId;
    this.pushApiKey = pushConfig.pushApiKey;
    this.SERVER = pushConfig.server || 'push.cloud.coveo.com';
    this.APIVERSION = pushConfig.apiversion || 'v1';

    this.RETRY = retryOptions.retry || true;
    this.RETRY_ATTEMPTS = retryOptions.attempts || 5;
    this.RETRY_DELAY = retryOptions.delay || 3000; //milliseconds
  }

  getRequestParams(document) {
    return {
      url: `https://${this.SERVER}/${this.APIVERSION}/organizations/${this.organizationId}/sources/${this.sourceId}/documents`,
      qs: { documentId: document.documentId },
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'Authorization': 'Bearer ' + this.pushApiKey
      },
      body: JSON.stringify(document)
    };
  }

  pushDocument(document, callback) {
    if (callback) {
      return this.pushDocumentCallback(document, callback, 0);
    }

    return this.pushDocumentPromise(document, 0);
  }

  pushDocumentCallback(document, callback, retryCount) {
    console.log(document);
    let params = this.getRequestParams(document);
    request( params, (error, response, body) => {
      if(error) {
        this.tryAgain(error, document, ++retryCount, callback);
        return;
        // if (this.RETRY && retryCount < this.RETRY_ATTEMPTS) {
        //   return setTimeout(
        //     () => {
        //       this.pushDocumentCallback(document, callback, ++retryCount);
        //     },
        //     this.RETRY_DELAY
        //   );
      }
      // don't need else after a if(...){return}
      callback(error, response, body);
    });
  }

  pushDocumentPromise(document, retryCount) {
    return new Promise((resolve, reject) => {
      let params = this.getRequestParams(document);
      request(params, (error, response/*, body*/) => {
        if (error) {
          // just trying to reduce code duplication... Just a proposal:
          //

          this.tryAgain(error, document, ++retryCount);

          // if (this.RETRY && retryCount < this.RETRY_ATTEMPTS) {
          //   console.log(`Error || ${error} || trying to push ${document.documentId}...`);
          //   console.log(`Retrying ${retryCount+1} time(s) to push ${document.documentId}...`);
          //   return setTimeout(() => {this.pushDocumentPromise(document, ++retryCount);}, this.RETRY_DELAY);
          // }

          reject(error);
          return;
        }
        if(response && response.statusCode !== 202) {
          this.tryAgain(`${response.statusCode} : ${response.body}`, document, ++retryCount);
          // if (this.RETRY && retryCount < this.RETRY_ATTEMPTS) {
          //   console.log(`Error || ${response.statusCode} : ${response.body} || trying to push ${document.documentId}...`);
          //   console.log(`Retrying ${retryCount+1} time(s) to push ${document.documentId}...`);
          //   return setTimeout(() => {this.pushDocumentPromise(document, ++retryCount);}, this.RETRY_DELAY);
          // }

          reject(`${response.statusCode} : ${response.body}`);
          return;
        }
        if(response && response.statusCode === 202) {
          resolve(`Pushed document : ${document.documentId}`);
          // should you return here?
          // Currently, both the resolve() and the reject() are called in this case.
          return;
        }
        reject(`Unknown error pushing the document.`);
      });
    });
  }

  tryAgain(errorMsg, document, retryCount, callback) {
    if (this.RETRY && retryCount <= this.RETRY_ATTEMPTS) {
      console.log(`Error || ${errorMsg} || trying to push ${document.documentId}...`);
      console.log(`Try ${retryCount} of ${this.RETRY_ATTEMPTS} to push ${document.documentId}...`);
      setTimeout(() => {
          if (callback) {
            this.pushDocumentCallback(document, callback, retryCount);
          }
          else {
            this.pushDocumentPromise(document, retryCount);
          }
        },
        this.RETRY_DELAY
      );
    }
  }
};
