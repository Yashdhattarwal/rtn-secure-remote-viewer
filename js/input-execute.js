// js/input-execute.js
class InputExecute {
    
    static handleRemoteEvent(payload, senderId) {
        // Here we could add logic to check if senderId has 'Full Control' permission.
        // For now, if the payload gets here, we pass it to IPC.
        
        // Ensure we are in an Electron context
        const { ipcRenderer } = require('electron');
        if (!ipcRenderer) return console.warn("Not in Electron environment. Cannot execute OS inputs.");

        // Forward to the Node.js main process
        ipcRenderer.send('sys-input', payload);
    }
}
