# How to Deploy the SMS Batch Sender on an Android Tablet

This guide explains how to run the Node.js server directly on your Android tablet using Termux. This allows the tablet to act as an independent SMS server that you can control from any PC or phone connected to the same Wi-Fi network.

## Prerequisites

1.  An Android Tablet with a SIM card (Mobilis).
2.  The tablet must be connected to a Wi-Fi network.

---

## Step 1: Install Termux and Termux:API

**Important:** Do NOT install Termux from the Google Play Store (it is outdated and broken).

1.  Open the web browser on your tablet.
2.  Go to **[F-Droid](https://f-droid.org/)** and search for `Termux`, or go directly to the [Termux Github Releases](https://github.com/termux/termux-app/releases).
3.  Download and install the **Termux** APK.
4.  Next, search F-Droid for **Termux:API** and install it as well.
5.  Open your tablet's Settings -> Apps -> Termux:API -> Permissions. Make sure it has permission to **Send SMS**.

---

## Step 2: Set up the Node.js Environment in Termux

1.  Open the **Termux** app on your tablet.
2.  Run the following commands one by one to update the system and install Node.js and the API package:

    ```bash
    pkg update -y
    pkg upgrade -y
    pkg install nodejs termux-api -y
    ```

3.  Allow Termux to access your tablet's internal storage so you can easily copy the project files over:

    ```bash
    termux-setup-storage
    ```
    *(A popup will appear asking for storage permission. Click "Allow".)*

---

## Step 3: Transfer the Project Files to the Tablet

You need to copy the `sms` project folder from your PC to the tablet.

1.  Connect your tablet to your PC using a USB cable.
2.  Copy the entire `sms` folder (the one containing `server.js`, `package.json`, etc.) to the root of your tablet's internal storage (e.g., `Internal Storage/sms`).
3.  *Note: Do not copy the `node_modules` folder from your PC, as Android needs to build its own version of the modules.*

---

## Step 4: Configure and Run the App

1.  Go back to the **Termux** app on your tablet.
2.  Navigate to the project folder (ensure it is in your home directory to avoid permission issues):

    ```bash
    cd ~/sms
    ```

3.  Install the required Node.js packages:

    ```bash
    npm install
    ```

4.  Start the server:

    ```bash
    node server.js
    ```

---

## Step 5: Make it Permanent (Auto-run on Boot)

To ensure the server stays running 24/7 and restarts automatically if the tablet reboots, follow these steps:

### 1. Install PM2 (Process Manager)
PM2 will keep your server running in the background and restart it if it crashes.

```bash
npm install -g pm2
cd ~/sms
pm2 start server.js --name "sms-sender"
pm2 save
```

### 2. Install Termux-Boot
This allows Termux to run scripts as soon as the tablet turns on.

1.  Download and install the **Termux:Boot** APK from F-Droid (same place you got Termux).
2.  Open the **Termux:Boot** app once (just to initialize it).
3.  In Termux, create the boot directory:
    ```bash
    mkdir -p ~/.termux/boot
    ```
4.  Create a startup script:
    ```bash
    nano ~/.termux/boot/start-sms
    ```
5.  Paste the following into the file:
    ```bash
    #!/data/data/com.termux/files/usr/bin/sh
    termux-wake-lock
    pm2 resurrect
    ```
    *(Press `Ctrl+O`, `Enter`, then `Ctrl+X` to save and exit)*

6.  Make the script executable:
    ```bash
    chmod +x ~/.termux/boot/start-sms
    ```

Now, whenever your tablet restarts, Termux will automatically start, lock the CPU to prevent sleeping (`wake-lock`), and restart your SMS server using PM2.

---

## Step 6: Access the Dashboard

Leave the Termux app running in the background.

1.  Find your tablet's local Wi-Fi IP address (usually found in Settings -> Wi-Fi -> Network Details. It looks like `192.168.1.XX`).
2.  Open a web browser on your PC or another phone connected to the **same Wi-Fi**.
3.  Type the IP address followed by `:3000` in the address bar.

    **Example:** `http://192.168.1.50:3000`

You will now see the SMS Batch Sender dashboard. You can upload CSV files and control the queue from your PC, while the tablet handles the actual SMS sending in the background.

## Troubleshooting

*   **SMS not sending:** Ensure you installed the `Termux:API` app and gave it SMS permissions in your Android settings. Also, ensure you ran `pkg install termux-api` inside the Termux terminal.
*   **Cannot access the dashboard:** Ensure your PC and the tablet are connected to the exact same Wi-Fi router, and that you typed the IP address correctly.
