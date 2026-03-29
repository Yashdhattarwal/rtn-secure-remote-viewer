// js/input-execute.js
class InputExecute {
    static ipc = null;

    static init() {
        try {
            // Pre-cache the ipcRenderer for performance (needed for 60fps tracking)
            const { ipcRenderer } = require('electron');
            this.ipc = ipcRenderer;
            console.log("✅ InputExecute: IPC Bridge established.");
        } catch (e) {
            console.warn("InputExecute: Not in Electron environment. OS input disabled.");
        }
    }
    
    static handleRemoteEvent(payload, senderId) {
        if (!this.ipc) {
            this.init(); // Attempt lazy init if not started
        }
        
        if (this.ipc) {
            this.ipc.send('sys-input', payload);
        }
    }
}

// Global Exposure
window.InputExecute = InputExecute;
InputExecute.init();
