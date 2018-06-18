// This assumes that you have a header in your CSV and one of the column is named id
const fs = require('fs'),
  csv = require('csv-parse');

function sanitizeHeaders(headers) {
  return headers.map(header => {
    return header.replace(/\s+/g, '');
  });
}

function buildDocuments(input) {
  let headers = input[0];
  let documents = input.slice(1).map((document) => {
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
    fs.stat(filename, (err, stats) => {
      if(stats && stats.isFile()) {
        let output = [];
        fs.createReadStream(filename)
          .pipe(csv())
          .on('data', data => {
            output.push(data);
          })
          .on('end', () => {
            output[0] = sanitizeHeaders(output[0]);
            let documents = buildDocuments(output);
            callback(documents);
          });
      } else {
        console.error(`Could not find file at ${filename}`);
      }
    });
  }
};
