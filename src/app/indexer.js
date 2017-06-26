const PushClient = require('./PushClient'),
  CSVParser = require('./CSVParser'),
  request = require('request'),
  zlib = require('zlib'),
  fs = require('fs');


// TOKEN TO PUSH TO THE COVEO PUSH API
let pushApiKey = process.env.APIKEY || '';
// ID OF THE COVEO ORGANIZATION TO PUSH TO
let organizationId = process.env.ORGANIZATIONID || '';
// ID OF THE SOURCE TO PUSH TO
let sourceId = process.env.SOURCEID || '';


// START THE COVEO PUSH CLIENT
let myPushClient = new PushClient({
  organizationId: organizationId,
  sourceId: sourceId,
  pushApiKey: pushApiKey
}, { retry: true, attempts: 5, delay: 3000 });

if(process.argv.length < 4) {
  console.error(`Use with arguments [1] => "path to CSV", [2] => "column name of url to get document"`);
  console.error(`Example: "node src/index.js 'my/path/to/my.csv' 'myDocumentUrlColumn' "`);
  return;
}

let csvInputPath = process.argv[2];
let documentUrl = process.argv[3];

CSVParser.parseCSV(csvInputPath, documents => {
  let count = 0;
  documents.forEach((document) => {
    if (document[documentUrl] && document[documentUrl].match(/\.pdf$/i)) {
      indexPDFToCompressedBinaryData(document[documentUrl], compressedData => {
        document["documentId"] = document[documentUrl]; // documentId is the URL for the push API
        document["CompressedBinaryData"] = compressedData;
        myPushClient.pushDocumentWithRetry(document)
          .then(() => {
            process.stdout.write(`Pushing document ${++count} of ${documents.length}...`);
            process.stdout.write(`\r`);
          })
          .catch(err => {
            console.error(`Error pushing document to the push API: ${err}`);
          });
      });
    } else if (!document[documentUrl]) {
      console.error(`Could not find a ${documentUrl} column in the csv...`);
    }
  });
});

function indexPDFToCompressedBinaryData(URL, callback) {
  request.get({
    url: URL,
    method: 'GET',
    encoding: null
  }, (error, response, body) => {
    if (error || response.statusCode !== 200) {
      console.error(`Error retrieving file at ${URL} : ${error}`);
      console.error(`Reponse body: ${body}`);
      return;
    }
    zlib.deflate(body, (err, buf) => {
      if (err) {
        console.error(`Error using zlib.deflate, make sure the document is valid: ${err}`);
        return;
      }
      callback(buf.toString('base64'));
    });
  });
}