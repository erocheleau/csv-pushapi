var PushClient = require('./PushClient');
var CSVParser = require('./CSVParser');
var request = require('request');
const zlib = require('zlib');
var path = require('path');
var fs = require('fs')


// TOKEN TO PUSH TO THE COVEO PUSH API
var pushtoken = process.env.COVEO_PUSH_TOKEN || 'YOUR_KEY';
// ID OF THE COVEO ORGANIZATION TO PUSH TO
var organizationId = process.env.COVEO_ORGANIZATIONID || 'ORG';
// ID OF THE SOURCE TO PUSH TO
var sourceId = process.env.COVEO_SOURCEID || 'SOURCEID';


// START THE COVEO PUSH CLIENT
var myPushClient = new PushClient({
  organizationId: organizationId, 
  sourceId: sourceId, 
  pushtoken: pushtoken
}, { retry: true, attempts: 5, delay: 3000 });

CSVParser.parseCSV(path.resolve(process.cwd(), 'src', 'InsuranceDemoData_ER2.csv'), documents => {
  var count = 0;
  documents.forEach((document) => {
    if (document.Locationofdocument && document.Locationofdocument.match(/\.pdf$/i)) {
      indexPDFToCompressedBinaryData(document.Locationofdocument, compressedData => {
        document["documentId"] = document.Locationofdocument; // documentId is the URL in this case.
        document["CompressedBinaryData"] = compressedData;
        myPushClient.pushDocument(document)
          .then(resp => {
            process.stdout.write(`Pushing document ${++count} of ${documents.length}...`);
            process.stdout.write(`\r`);
          })
          .catch(err => {
            console.error(`Error pushing document to the push API: ${err}`);
          })
      });
    } else if (!document.Locationofdocument) {
      console.error(`Could not find a document.Locationofdocument...`);
    }
  });
});

function indexPDFToCompressedBinaryData(URL, callback) {
  request.get({
    url: URL,
    method: 'GET',
    encoding: null
  }, (error, response, body) => {
    if (error || response.statusCode != 200) {
      console.error(`Error retrieving file at ${URL} : ${error}`);
      console.error(`Reponse body: ${body}`);
      return;
    } else {
      zlib.deflate(body, (err, buf) => {
        if (err) {
          console.error(`Error using zlib.deflate, make sure the document is valid: ${err}`);
          return;
        } else {
          callback(buf.toString('base64'));
        }
      });
    }
  });
}