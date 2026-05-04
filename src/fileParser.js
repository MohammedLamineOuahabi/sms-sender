const fs = require('fs');
const csv = require('csv-parser');

/**
 * Parses a CSV file and extracts phone numbers.
 * Expects a header row. It will look for columns named 'phone', 'number', 'telephone', or take the first column.
 */
function parsePhonesFromCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    let phoneColumnName = null;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (headers) => {
        // Try to guess the phone column
        const lowerHeaders = headers.map(h => h.toLowerCase().trim());
        if (lowerHeaders.includes('phone')) phoneColumnName = headers[lowerHeaders.indexOf('phone')];
        else if (lowerHeaders.includes('number')) phoneColumnName = headers[lowerHeaders.indexOf('number')];
        else if (lowerHeaders.includes('telephone')) phoneColumnName = headers[lowerHeaders.indexOf('telephone')];
        else if (headers.length > 0) phoneColumnName = headers[0]; // Fallback to first column
      })
      .on('data', (data) => {
        if (phoneColumnName && data[phoneColumnName]) {
            let phone = data[phoneColumnName].trim();
            // Handle cases where a semicolon-separated CSV is read as a single column
            if (phone.includes(';')) {
                phone = phone.split(';')[0];
            }
            // Basic cleanup: remove spaces, dashes
            phone = phone.replace(/[\s-]/g, '');
            if (phone) {
                results.push(phone);
            }
        }
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

module.exports = {
  parsePhonesFromCSV
};
