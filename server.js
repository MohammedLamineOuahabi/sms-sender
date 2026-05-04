const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('./src/config');
const { parsePhonesFromCSV } = require('./src/fileParser');
const { loadQueue, startQueue, resumeQueue, pauseQueue, clearQueue, getQueueStatus } = require('./src/queue');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// API Routes

// 1. Get current status and list
app.get('/api/status', (req, res) => {
  res.json(getQueueStatus());
});

// 2. Load a new campaign
app.post('/api/load', upload.single('csvFile'), async (req, res) => {
  try {
    const status = getQueueStatus();
    
    if (status.status === 'running' || status.status === 'paused_batch') {
      return res.status(400).json({ error: 'A campaign is already running.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded.' });
    }

    const message = req.body.message;
    if (!message) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    // Parse the CSV
    const filePath = req.file.path;
    const numbers = await parsePhonesFromCSV(filePath);
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);

    if (numbers.length === 0) {
      return res.status(400).json({ error: 'No valid phone numbers found in CSV.' });
    }

    // Load the queue
    loadQueue(numbers, message);

    res.json({ message: 'Campaign loaded successfully', totalNumbers: numbers.length });

  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message || 'Failed to load campaign.' });
  }
});

// 3. Start or resume a campaign
app.post('/api/start', async (req, res) => {
  try {
    const status = getQueueStatus();
    
    if (status.status === 'running' || status.status === 'paused_batch') {
      return res.status(400).json({ error: 'A campaign is already running.' });
    }

    if (status.status === 'loaded') {
        startQueue();
        return res.json({ message: 'Campaign started.' });
    } else if (status.status === 'paused') {
        resumeQueue();
        return res.json({ message: 'Campaign resumed.' });
    } else {
        return res.status(400).json({ error: 'No loaded or paused campaign to start.' });
    }

  } catch (error) {
    console.error("Start error:", error);
    res.status(500).json({ error: error.message || 'Failed to start campaign.' });
  }
});

// 4. Pause a campaign
app.post('/api/pause', (req, res) => {
  pauseQueue();
  res.json({ message: 'Pause signal sent.' });
});

// 5. Clear the queue
app.post('/api/clear', (req, res) => {
  try {
    clearQueue();
    res.json({ message: 'Queue cleared successfully.' });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to clear queue.' });
  }
});

// Start server
app.listen(config.port, () => {
  console.log(`=========================================`);
  console.log(`SMS Batch Sender running on port ${config.port}`);
  console.log(`Mode: ${config.sendMode.toUpperCase()}`);
  if(config.sendMode === 'gateway') console.log(`Gateway URL: ${config.gatewayUrl}`);
  console.log(`Delay: ${config.delayMin/1000}s - ${config.delayMax/1000}s`);
  console.log(`Batch: Pause ${config.batchPause/60000}m every ${config.batchSize} msgs`);
  console.log(`=========================================`);
});
