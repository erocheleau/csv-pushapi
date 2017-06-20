// This assumes that you have a header in your CSV and one of the column is named id
var fs = require('fs');
var readline = require('readline');
var Document = require('./Document')
var csv = require('csv-parse');

function sanitizeHeaders(headers) {
    return headers.map(header => { 
      return header.replace(/\s+/g, '') 
    });
  }

function buildDocuments(input, headers) {
  var documents = [];
  var headers = input[0];

  documents = input.slice(1).map((document, idx) => {
    var result = document.reduce((doc, fieldValue, fieldIdx) => {
      doc[headers[fieldIdx]] = fieldValue;
      return doc;
    }, {});
    return result;
  });

  return documents;
}

module.exports = class CSVParser {

  static parseCSV(filename, callback) {
    var documents = [];
    fs.stat(filename, (err, stats) => {
      if(stats && stats.isFile()) {
        var output = [];
        fs.createReadStream(filename)
          .pipe(csv())
          .on('data', data => {
            output.push(data);
          })
          .on('end', () => {
            output[0] = sanitizeHeaders(output[0]);
            documents = buildDocuments(output, output[0]);
            callback(documents);
          });
      } else {
        console.error(`Could not find file at ${filename}`);
      }
    });
  }
}