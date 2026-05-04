require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  sendMode: process.env.SEND_MODE || 'termux',
  gatewayUrl: process.env.GATEWAY_URL,
  delayMin: parseInt(process.env.DELAY_MIN) || 20000,
  delayMax: parseInt(process.env.DELAY_MAX) || 60000,
  batchSize: parseInt(process.env.BATCH_SIZE) || 50,
  batchPause: parseInt(process.env.BATCH_PAUSE) || 600000,
};

// Basic Validation
if (config.sendMode === 'gateway' && !config.gatewayUrl) {
  console.warn("WARNING: SEND_MODE is 'gateway' but GATEWAY_URL is not set.");
}

module.exports = config;
