const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');

const logsDir = path.join(__dirname, '..', 'logs');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

function getLogFileName() {
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  return path.join(logsDir, `results-${dateStr}.csv`);
}

function initDailyLog() {
  const filePath = getLogFileName();
  if (!fs.existsSync(filePath)) {
    // Write header if file doesn't exist
    fs.writeFileSync(filePath, 'Timestamp,Phone Number,Message,Status,ErrorDetails\n', 'utf8');
  }
}

function logResult(phone, message, status, errorDetails = '') {
  const filePath = getLogFileName();
  initDailyLog(); // Ensure file and header exist

  const timestamp = new Date().toISOString();
  // Escape commas in message and error details for CSV
  const safeMessage = `"${message.replace(/"/g, '""')}"`;
  const safeError = `"${errorDetails.replace(/"/g, '""')}"`;
  
  const line = `${timestamp},${phone},${safeMessage},${status},${safeError}\n`;
  
  fs.appendFileSync(filePath, line, 'utf8');
}

module.exports = {
  logResult
};
