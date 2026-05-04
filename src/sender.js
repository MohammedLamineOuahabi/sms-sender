const { exec } = require('child_process');
const axios = require('axios');
const config = require('./config');

function getLatestSmsId() {
  return new Promise((resolve) => {
    // Get the ID of the single most recent message in the device
    const command = `termux-sms-list -l 1`;
    exec(command, (error, stdout, stderr) => {
      if (error || stderr) return resolve(null);
      try {
        const messages = JSON.parse(stdout);
        if (messages.length > 0) {
          return resolve(messages[0]._id);
        }
        resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  });
}

function getRecentSmsStatus(phone, lastKnownId) {
  return new Promise((resolve) => {
    // Check the last 5 messages to find the one we just sent
    const command = `termux-sms-list -l 5`;
    exec(command, (error, stdout, stderr) => {
      if (error || stderr) return resolve(null);
      try {
        const messages = JSON.parse(stdout);
        
        // Find a message that:
        // 1. Has a DIFFERENT ID than the one we saw before sending
        // 2. Matches the phone number
        const cleanTarget = phone.replace(/\D/g, '').slice(-8);
        
        const match = messages.find(m => {
          const isNew = m._id !== lastKnownId;
          const cleanM = m.number.replace(/\D/g, '').slice(-8);
          return isNew && cleanM === cleanTarget;
        });

        if (match) {
          return resolve(match.type);
        }
        resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  });
}

/**
 * Sends SMS via Termux local API.
 * Requires Termux:API app installed and `termux-sms-send` command available.
 */
function sendViaTermux(phone, message) {
  return new Promise(async (resolve, reject) => {
    // 1. Get the ID of the current latest message BEFORE sending
    const lastId = await getLatestSmsId();

    // Escape double quotes in message for shell execution
    const safeMessage = message.replace(/"/g, '\\"');
    const command = `termux-sms-send -n "${phone}" "${safeMessage}"`;
    
    exec(command, async (error, stdout, stderr) => {
      if (error) {
        return reject(`Termux Error: ${error.message}`);
      }
      if (stderr) {
        return reject(`Termux Stderr: ${stderr}`);
      }

      // 2. Poll for the NEW message status (more efficient than a hard sleep)
      // We check every 500ms, for a maximum of 5 seconds.
      let attempts = 0;
      let status = null;

      while (attempts < 10) {
        await new Promise(r => setTimeout(r, 500));
        status = await getRecentSmsStatus(phone, lastId);
        
        // If we found the message and it's NOT still "queued" or "outbox", we can stop waiting
        if (status && status !== 'queued' && status !== 'outbox') {
          break;
        }
        attempts++;
      }
      
      if (status === 'failed') {
        return reject(`Carrier Error: Message marked as failed (check SIM credit).`);
      } else if (status === 'outbox' || status === 'queued') {
        // This is not a failure yet, but it's slow. We resolve to allow the queue to continue.
        console.log(`[Sender] Message to ${phone} is still in ${status}. Continuing...`);
      } else if (!status) {
        console.warn(`[Sender] Could not verify delivery status for ${phone} (No new log entry found).`);
      }
      
      resolve(stdout);
    });
  });
}

/**
 * Sends SMS via an HTTP Gateway running on the Android device.
 * Assumes a generic POST request. You may need to adapt payload structure
 * based on the specific gateway app you install.
 */
async function sendViaGateway(phone, message) {
  if (!config.gatewayUrl) {
    throw new Error("GATEWAY_URL is not configured.");
  }

  try {
    const response = await axios.post(config.gatewayUrl, {
      phone: phone,
      message: message
    });
    return response.data;
  } catch (error) {
    throw new Error(`Gateway Error: ${error.message}`);
  }
}

/**
 * Main adapter function that routes based on config.
 */
async function sendSms(phone, message) {
  if (config.sendMode === 'termux') {
    return await sendViaTermux(phone, message);
  } else if (config.sendMode === 'gateway') {
    return await sendViaGateway(phone, message);
  } else {
    throw new Error(`Invalid SEND_MODE: ${config.sendMode}`);
  }
}

module.exports = {
  sendSms
};
