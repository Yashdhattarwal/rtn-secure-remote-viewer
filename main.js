const { app, BrowserWindow, desktopCapturer, session, ipcMain } = require('electron');
const path = require('path');
// We require the nut.js fork we just installed
let nutjs;
try {
    nutjs = require('@nut-tree-fork/nut-js');
    nutjs.mouse.config.autoDelayMs = 0; // Reduce latency
    nutjs.keyboard.config.autoDelayMs = 0;
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

// Maps browser KeyboardEvent.code values to nut-js Key names
function mapKey(code) {
    if (!code) return null;
    let m;
    if ((m = code.match(/^Key([A-Z])$/))) return m[1];
    if ((m = code.match(/^Digit(\d)$/))) return 'Num' + m[1];
    if ((m = code.match(/^(F\d{1,2})$/))) return m[1];
    if ((m = code.match(/^Numpad(\d)$/))) return 'NumPad' + m[1];
    const map = {
        Enter: 'Enter', NumpadEnter: 'Enter', Escape: 'Escape', Backspace: 'Backspace', Tab: 'Tab', Space: 'Space',
        CapsLock: 'CapsLock', ShiftLeft: 'LeftShift', ShiftRight: 'RightShift', ControlLeft: 'LeftControl',
        ControlRight: 'RightControl', AltLeft: 'LeftAlt', AltRight: 'RightAlt', MetaLeft: 'LeftWin', MetaRight: 'RightWin',
        ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right', Insert: 'Insert', Delete: 'Delete',
        Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown', Minus: 'Minus', Equal: 'Equal',
        BracketLeft: 'LeftBracket', BracketRight: 'RightBracket', Backslash: 'Backslash', Semicolon: 'Semicolon',
        Quote: 'Quote', Backquote: 'Grave', Comma: 'Comma', Period: 'Period', Slash: 'Slash', PrintScreen: 'Print',
        ScrollLock: 'ScrollLock', Pause: 'Pause', NumLock: 'NumLock', ContextMenu: 'Menu', NumpadAdd: 'Add',
        NumpadSubtract: 'Subtract', NumpadMultiply: 'Multiply', NumpadDivide: 'Divide', NumpadDecimal: 'Decimal'
    };
    return map[code] || null;
}

// Listen to Remote Inputs from the Renderer (Viewer -> DataChannel -> Host -> Renderer -> Main)
// Events are queued so they execute in order (mouse down must finish before mouse up, etc.)
let inputQueue = Promise.resolve();
ipcMain.on('sys-input', (event, payload) => {
    inputQueue = inputQueue.then(() => executeInput(payload)).catch(err => console.error("Failed to execute sys-input:", err));
});

async function executeInput(payload) {
    if (!nutjs) {
        console.warn("NutJS not initialized!");
        return;
    }

    const { cmd, data } = payload;
    const { mouse, keyboard, Key, Point, Button } = nutjs;

    if (cmd === 'mouseMove') {
        // Data x and y are fractions (0.0 to 1.0) of the shared screen
        const width = await nutjs.screen.width();
        const height = await nutjs.screen.height();
        const x = Math.min(Math.max(data.x, 0), 1);
        const y = Math.min(Math.max(data.y, 0), 1);
        await mouse.setPosition(new Point(Math.round(x * (width - 1)), Math.round(y * (height - 1))));
    }
    else if (cmd === 'mouseToggle') {
        const btn = data.button === 'right' ? Button.RIGHT : (data.button === 'middle' ? Button.MIDDLE : Button.LEFT);
        if (data.down) await mouse.pressButton(btn);
        else await mouse.releaseButton(btn);
    }
    else if (cmd === 'scroll') {
        // Amount is in Windows wheel units (120 = one notch)
        const amount = Math.round(Math.abs(data.dy));
        if (amount === 0) return;
        if (data.dy > 0) await mouse.scrollDown(amount);
        else await mouse.scrollUp(amount);
    }
    else if (cmd === 'keyDown' || cmd === 'keyUp') {
        const name = mapKey(data.code);
        if (!name || Key[name] === undefined) return;
        if (cmd === 'keyDown') await keyboard.pressKey(Key[name]);
        else await keyboard.releaseKey(Key[name]);
    }
}
