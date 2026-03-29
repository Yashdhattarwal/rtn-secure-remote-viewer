const { app, BrowserWindow, desktopCapturer, session, ipcMain } = require('electron');
const path = require('path');
// We require the nut.js fork we just installed
let nutjs;
try {
    nutjs = require('@nut-tree-fork/nut-js');
    nutjs.mouse.config.autoDelayMs = 0; // Reduce latency
} catch(e) {
    console.error("CRITICAL ERROR: NutJS failed to load. Check for Admin permissions and architecture compatibility.", e);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200, height: 800,
    backgroundColor: '#0b0b0f',
    webPreferences: { 
        nodeIntegration: true, 
        contextIsolation: false 
    }
  });

  // Auto-selects screen to prevent the app from hanging
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      callback({ video: sources[0] }); 
    });
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

// Listen to Remote Inputs from the Renderer (Viewer -> DataChannel -> Host -> Renderer -> Main)
ipcMain.on('sys-input', async (event, payload) => {
    console.log("Main process received sys-input:", payload);
    if (!nutjs) {
        console.warn("NutJS not initialized!");
        return;
    }

    try {
        const { cmd, data } = payload;
        const { mouse, keyboard, Key, Point, Button } = nutjs;

        if (cmd === 'mouseMove') {
            // Screen resolution mapping
            const screen = await nutjs.screen.width();
            const screenHeight = await nutjs.screen.height();
            // Data x and y are percentages (0.0 to 1.0)
            const targetX = Math.round(data.x * screen);
            const targetY = Math.round(data.y * screenHeight);
            await mouse.setPosition(new Point(targetX, targetY));
        } 
        else if (cmd === 'mouseToggle') {
            const btn = data.button === 'right' ? Button.RIGHT : (data.button === 'middle' ? Button.MIDDLE : Button.LEFT);
            if (data.down) await mouse.pressButton(btn);
            else await mouse.releaseButton(btn);
        }
        else if (cmd === 'keyTap') {
            // Add custom mapping for specific keys if needed, this is simplified
            // For production, a map between e.code (JS) to nutjs.Key is required
        }
    } catch (err) {
        console.error("Failed to execute sys-input:", err);
    }
});