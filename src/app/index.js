/* might as well use 'const' for all requires */
const PushClient = require('./PushClient'),
  CSVParser = require('./CSVParser'),
  request = require('request'),
  zlib = require('zlib');

// We call them 'API Keys' in the Admin UI, we should use the same terminology.
var pushApiKey = process.env.COVEO_PUSH_TOKEN || 'YOUR_KEY';
// ID OF THE COVEO ORGANIZATION TO PUSH TO
var organizationId = process.env.COVEO_ORGANIZATIONID || 'ORG';
// ID OF THE SOURCE TO PUSH TO
var sourceId = process.env.COVEO_SOURCEID || 'SOURCEID';


// START THE COVEO PUSH CLIENT
let myPushClient = new PushClient({
    organizationId: organizationId,
    sourceId: sourceId,
    pushApiKey: pushApiKey
  },
  { retry: true, attempts: 5, delay: 3000 }
);

// should not hardcode the input, here's how to get the name from the command line.
let csvInputFile = process.argv[2];
CSVParser.parseCSV(csvInputFile, documents => {
  var count = 0;
  documents.forEach((document) => {
    /*
    We should use better names in the header line as describe what we expect in the README
     */
    if ( (document.Locationofdocument||'').match(/\.pdf\s*$/i) ) {
      indexPDFToCompressedBinaryData(document.Locationofdocument, compressedData => {
        document["documentId"] = document.Locationofdocument; // documentId is the URL in this case.
        document["CompressedBinaryData"] = compressedData;
        myPushClient.pushDocument(document)
          .then(() => {
            process.stdout.write(`Pushing document ${++count} of ${documents.length}...`);
            process.stdout.write(`\r`);
          })
          .catch(err => {
            console.error(`Error pushing document to the push API: ${err}`);
          });
      });
    }
    else if (!document.Locationofdocument) {
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
    if (error || response.statusCode !== 200) {
      console.error(`Error retrieving file at ${URL} : ${error}`);
      console.error(`Reponse body: ${body}`);
      return;
    }
    // else is useless after a if(){return;}

    zlib.deflate(body, (err, buf) => {
      if (err) {
        console.error(`Error using zlib.deflate, make sure the document is valid: ${err}`);
        return;
      }
      // else is useless after a if(){return;}

      callback(buf.toString('base64'));
    });
  });
}