// js/input-capture.js
class InputCapture {
    static isControlling = false;
    static videoElement = null;
    static lastMove = 0;

    static init(videoEl) {
        this.videoElement = videoEl;
        
        // Prevent default context menu
        this.videoElement.addEventListener('contextmenu', e => e.preventDefault());

        this.videoElement.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.videoElement.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.videoElement.addEventListener('mouseup', this.onMouseUp.bind(this));
        // this.videoElement.addEventListener('wheel', this.onWheel.bind(this));

        // Keyboard requires window focus
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        
        console.log("InputCapture Initialized");
    }

    static toggleControl(enable) {
        this.isControlling = enable;
        if (enable) {
            this.videoElement.style.cursor = 'crosshair';
        } else {
            this.videoElement.style.cursor = 'default';
        }
    }

    static getScaledCoordinates(e) {
        const rect = this.videoElement.getBoundingClientRect();
        
        // Since the video uses object-fit: contain, we need to calculate
        // the actual relative coordinate against the source dimension.
        // For simplicity, we send percentage coordinates mapping the bounding box.
        // The host will recalculate the absolute desktop position based on their resolution.
        
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        
        const percX = x / rect.width;
        const percY = y / rect.height;
        
        return { x: percX, y: percY };
    }

    static sendInput(cmd, data) {
        if (!this.isControlling || !DataChannelManager) return;
        console.log("InputCapture: Sending", cmd, data);
        DataChannelManager.broadcastOrSend({
            type: 'input_event',
            cmd: cmd,
            data: data
        });
    }

    // --- Event Handlers ---

    static onMouseMove(e) {
        if (!this.isControlling) return;
        
        // Throttle to roughly 30 FPS
        const now = Date.now();
        if (now - this.lastMove < 30) return;
        this.lastMove = now;

        const coords = this.getScaledCoordinates(e);
        this.sendInput('mouseMove', coords);
    }

    static onMouseDown(e) {
        if (!this.isControlling) return;
        e.preventDefault();
        const buttonMapper = { 0: 'left', 1: 'middle', 2: 'right' };
        this.sendInput('mouseToggle', { button: buttonMapper[e.button] || 'left', down: true });
    }

    static onMouseUp(e) {
        if (!this.isControlling) return;
        e.preventDefault();
        const buttonMapper = { 0: 'left', 1: 'middle', 2: 'right' };
        this.sendInput('mouseToggle', { button: buttonMapper[e.button] || 'left', down: false });
    }

    static onKeyDown(e) {
        if (!this.isControlling) return;
        // Check if user is typing in chat instead
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
        
        e.preventDefault();
        this.sendInput('keyTap', { key: e.key, code: e.code });
    }
}

// Ensure global access for webrtc.js
window.InputCapture = InputCapture;
