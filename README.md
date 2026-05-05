# 📱 SMS Batch Sender

A powerful, self-hosted Node.js SMS gateway and batch sender designed to run on Android devices via Termux. Turn any Android phone or tablet with a SIM card into a professional SMS server.

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js](https://img.shields.io/badge/Node.js-v14+-green.svg)](https://nodejs.org/)

## 🚀 Features

- **Direct Hardware Integration:** Uses `Termux:API` to send SMS directly through your device's SIM card.
- **Batch Processing:** Upload CSV files and send messages to thousands of recipients automatically.
- **Smart Queue Management:** 
    - **Pause/Resume:** Control your campaigns in real-time.
    - **Anti-Spam Delays:** Randomized delays between messages to mimic human behavior.
    - **Batch Pausing:** Automatic cooling periods after sending a set number of messages.
    - **Message Spintax:** Subtle variations in messages to avoid carrier filters.
- **Real-time Dashboard:** A clean web interface to monitor progress, view statistics, and manage the queue.
- **Dual Sending Modes:**
    - **Termux Mode:** Native SMS sending via Android system.
    - **Gateway Mode:** Forward requests to external HTTP SMS gateways.
- **Rock-Solid Reliability:** Instructions included for PM2 process management and auto-boot on Android restart.
- **Detailed Logging:** Complete history of successful and failed deliveries.

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express
- **File Handling:** Multer, CSV-Parser
- **Automation:** PM2, Termux:API
- **Frontend:** Vanilla JS, CSS (Responsive)

---

## 📱 Deployment Guide (Android/Termux)

This project is optimized to run on an Android tablet or phone using **Termux**. This allows the device to act as an independent SMS server controlled from any device on the same Wi-Fi.

### 1. Prerequisites
- Android device with a SIM card.
- [Termux](https://github.com/termux/termux-app/releases) and [Termux:API](https://f-droid.org/en/packages/com.termux.api/) installed (Use F-Droid, not Play Store).
- SMS permissions granted to Termux:API.

### 2. Environment Setup
Open Termux and run:
```bash
pkg update && pkg upgrade
pkg install nodejs termux-api -y
termux-setup-storage
```

### 3. Installation
1. Copy the project folder to your device.
2. Navigate to the folder in Termux:
   ```bash
   cd ~/sms
   npm install
   ```

### 4. Running the Server
```bash
# Direct run
node server.js

# Using PM2 for 24/7 operation
npm install -g pm2
pm2 start server.js --name "sms-sender"
pm2 save
```

### 5. Auto-start on Boot (Optional)
To ensure the server restarts automatically when the device reboots:
1. Install **Termux:Boot** from F-Droid.
2. Create the boot directory: `mkdir -p ~/.termux/boot`
3. Create a startup script `~/.termux/boot/start-sms`:
   ```bash
   #!/data/data/com.termux/files/usr/bin/sh
   termux-wake-lock
   pm2 resurrect
   ```
4. Make it executable: `chmod +x ~/.termux/boot/start-sms`

### 6. Accessing the Dashboard
Open your browser on any PC/Phone on the same Wi-Fi and navigate to:
`http://[YOUR_DEVICE_IP]:3000`

---

## ⚙️ Configuration

Create a `.env` file (see `.env.example`) to customize behavior:

- `PORT`: Server port (default 3000).
- `SEND_MODE`: `termux` or `gateway`.
- `DELAY_MIN`/`DELAY_MAX`: Random delay range between messages (ms).
- `BATCH_SIZE`: Number of messages before a long pause.
- `BATCH_PAUSE`: Duration of the long pause (ms).

---

## 📄 License
This project is licensed under the ISC License.

---

*Disclaimer: Use this tool responsibly. Sending unsolicited bulk SMS may violate local laws and your carrier's Terms of Service.*
