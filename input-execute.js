// js/input-execute.js
class InputExecute {
    
    static handleRemoteEvent(payload, senderId) {
        console.log("InputExecute: Forwarding to Main", payload);
        // Ensure we are in an Electron context
        const { ipcRenderer } = require('electron');
        if (!ipcRenderer) return console.warn("Not in Electron environment. Cannot execute OS inputs.");

        // Forward to the Node.js main process
        ipcRenderer.send('sys-input', payload);
    }
}
