// js/input-capture.js
class InputCapture {
    static isControlling = false;
    static videoElement = null;
    static lastMove = 0;
    static initialized = false;
    static pressedKeys = new Set();
    static wheelAccum = 0;
    static wheelTimer = null;

    static init(videoEl) {
        this.videoElement = videoEl;
        if (this.initialized) return; // Avoid stacking duplicate listeners on reconnect
        this.initialized = true;

        // Prevent default context menu
        this.videoElement.addEventListener('contextmenu', e => e.preventDefault());

        this.videoElement.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.videoElement.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.videoElement.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.videoElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

        // Keyboard requires window focus
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('keyup', this.onKeyUp.bind(this));
        // Release held keys if the viewer window loses focus, so nothing stays stuck on the host
        window.addEventListener('blur', this.releaseAllKeys.bind(this));

        console.log("InputCapture Initialized");
    }

    static toggleControl(enable) {
        this.isControlling = enable;
        if (!enable) this.releaseAllKeys();
        this.videoElement.style.cursor = enable ? 'crosshair' : 'default';
    }

    // Returns the position as a fraction (0-1) of the actual picture, excluding the
    // black bars that object-fit: contain adds. Returns null when outside the picture.
    static getScaledCoordinates(e) {
        const v = this.videoElement;
        const rect = v.getBoundingClientRect();
        let contentW = rect.width, contentH = rect.height;

        if (v.videoWidth && v.videoHeight) {
            const videoRatio = v.videoWidth / v.videoHeight;
            if (rect.width / rect.height > videoRatio) {
                contentW = rect.height * videoRatio; // bars on left/right
            } else {
                contentH = rect.width / videoRatio; // bars on top/bottom
            }
        }

        const offsetX = (rect.width - contentW) / 2;
        const offsetY = (rect.height - contentH) / 2;
        const x = (e.clientX - rect.left - offsetX) / contentW;
        const y = (e.clientY - rect.top - offsetY) / contentH;

        if (x < 0 || x > 1 || y < 0 || y > 1) return null;
        return { x, y };
    }

    static sendInput(cmd, data) {
        if (!this.isControlling || !DataChannelManager) return;
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
        if (coords) this.sendInput('mouseMove', coords);
    }

    static onMouseDown(e) {
        if (!this.isControlling) return;
        e.preventDefault();
        // Clicking the remote screen takes keyboard focus away from chat/ID fields
        if (this.isTypingLocally()) document.activeElement.blur();
        // Move first so the click lands exactly where the viewer clicked
        const coords = this.getScaledCoordinates(e);
        if (!coords) return;
        this.sendInput('mouseMove', coords);
        const buttonMapper = { 0: 'left', 1: 'middle', 2: 'right' };
        this.sendInput('mouseToggle', { button: buttonMapper[e.button] || 'left', down: true });
    }

    static onMouseUp(e) {
        if (!this.isControlling) return;
        e.preventDefault();
        const buttonMapper = { 0: 'left', 1: 'middle', 2: 'right' };
        this.sendInput('mouseToggle', { button: buttonMapper[e.button] || 'left', down: false });
    }

    static onWheel(e) {
        if (!this.isControlling) return;
        e.preventDefault();
        // Convert browser delta to Windows wheel units (120 = one notch)
        const unit = e.deltaMode === 1 ? 40 : (e.deltaMode === 2 ? 800 : 1.2);
        this.wheelAccum += e.deltaY * unit;
        if (this.wheelTimer) return;
        this.wheelTimer = setTimeout(() => {
            this.sendInput('scroll', { dy: this.wheelAccum });
            this.wheelAccum = 0;
            this.wheelTimer = null;
        }, 50);
    }

    static isTypingLocally() {
        const el = document.activeElement;
        return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
    }

    static onKeyDown(e) {
        if (!this.isControlling || this.isTypingLocally()) return;
        e.preventDefault();
        this.pressedKeys.add(e.code);
        this.sendInput('keyDown', { key: e.key, code: e.code });
    }

    static onKeyUp(e) {
        if (!this.isControlling || !this.pressedKeys.has(e.code)) return;
        e.preventDefault();
        this.pressedKeys.delete(e.code);
        this.sendInput('keyUp', { key: e.key, code: e.code });
    }

    static releaseAllKeys() {
        for (const code of this.pressedKeys) this.sendInput('keyUp', { code });
        this.pressedKeys.clear();
    }
}

// Ensure global access for webrtc.js
window.InputCapture = InputCapture;
