const config = require('./config');
const { sendSms } = require('./sender');
const { logResult } = require('./logger');

// Global state to track queue progress, support pause/resume, and hold the full list
const state = {
  status: 'idle', // idle, running, paused, paused_batch, completed
  items: [],      // Array of: { id, phone, status: 'pending'|'processing'|'success'|'failed', error: null }
  templateMessage: '',
  stats: {
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0
  }
};

// Helper for delays
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const getRandomDelay = () => Math.floor(Math.random() * (config.delayMax - config.delayMin + 1)) + config.delayMin;

function spintaxMessage(baseMessage) {
  const spaces = ' '.repeat(Math.floor(Math.random() * 3));
  return baseMessage + spaces;
}

function updateStats() {
  state.stats.total = state.items.length;
  state.stats.sent = state.items.filter(i => i.status === 'success').length;
  state.stats.failed = state.items.filter(i => i.status === 'failed').length;
  state.stats.pending = state.items.filter(i => i.status === 'pending').length;
}

// Load a new list
function loadQueue(numbers, templateMessage) {
  if (state.status === 'running' || state.status === 'paused_batch') {
    throw new Error("A campaign is already running or paused.");
  }

  state.templateMessage = templateMessage;
  state.items = numbers.map((phone, index) => ({
    id: index,
    phone: phone,
    status: 'pending',
    error: null
  }));
  
  state.status = 'loaded';
  updateStats();
}

// Start a loaded campaign
function startQueue() {
  if (state.status !== 'loaded') {
    throw new Error("No campaign loaded to start.");
  }
  processQueue(); // Start the loop in the background
}

// Resume an existing paused list
function resumeQueue() {
  if (state.status === 'running' || state.status === 'paused_batch') {
    throw new Error("Queue is already running.");
  }
  if (state.items.length === 0) {
    throw new Error("No items in queue to resume.");
  }
  if (state.stats.pending === 0) {
    throw new Error("All items have already been processed.");
  }
  
  processQueue();
}

// Stop/Pause the queue
function pauseQueue() {
  if (state.status === 'running' || state.status === 'paused_batch') {
    state.status = 'paused';
    console.log("[Queue] Paused by user.");
  }
}

// Clear the queue
function clearQueue() {
  if (state.status === 'running' || state.status === 'paused_batch') {
    throw new Error("Cannot clear while running. Pause it first.");
  }
  state.status = 'idle';
  state.items = [];
  state.templateMessage = '';
  state.stats = { total: 0, sent: 0, failed: 0, pending: 0 };
  console.log("[Queue] List cleared.");
}

// Core processing loop
async function processQueue() {
  state.status = 'running';
  let batchCount = 0;

  for (let i = 0; i < state.items.length; i++) {
    // Check if we need to stop before processing the next item
    if (state.status !== 'running') {
      break; 
    }

    const item = state.items[i];
    
    // Skip already processed items
    if (item.status !== 'pending') continue;

    item.status = 'processing';
    const finalMessage = spintaxMessage(state.templateMessage);

    try {
      console.log(`[Queue] Sending to ${item.phone}...`);
      await sendSms(item.phone, finalMessage);
      item.status = 'success';
      logResult(item.phone, finalMessage, 'Success');
      console.log(`[Queue] Success for ${item.phone}`);
    } catch (error) {
      item.status = 'failed';
      item.error = error.toString();
      logResult(item.phone, finalMessage, 'Failure', item.error);
      console.error(`[Queue] Failed for ${item.phone}:`, error.message || error);
    }

    updateStats();
    batchCount++;

    // Check if there are more pending items
    const hasMorePending = state.items.some((itm, idx) => idx > i && itm.status === 'pending');

    // Handle batch pauses and delays
    if (hasMorePending && state.status === 'running') {
      if (batchCount >= config.batchSize) {
        console.log(`[Queue] Batch limit reached (${config.batchSize}). Pausing for ${config.batchPause / 1000} seconds...`);
        state.status = 'paused_batch';
        await sleep(config.batchPause);
        batchCount = 0; // Reset batch
        if (state.status === 'paused_batch') state.status = 'running'; // Resume if not manually paused during batch
      } else {
        const delay = getRandomDelay();
        console.log(`[Queue] Waiting for ${delay / 1000} seconds before next message...`);
        await sleep(delay);
      }
    }
  }

  // If we finished the loop and aren't manually paused, mark as completed
  if (state.status === 'running' && state.stats.pending === 0) {
    state.status = 'completed';
    console.log("[Queue] Campaign completed.");
  }
}

function getQueueStatus() {
  return { 
    status: state.status,
    stats: state.stats,
    // Return the last 50 items for the UI to prevent massive payloads if the list is huge
    items: state.items.slice(-500) 
  };
}

module.exports = {
  loadQueue,
  startQueue,
  resumeQueue,
  pauseQueue,
  clearQueue,
  getQueueStatus
};
