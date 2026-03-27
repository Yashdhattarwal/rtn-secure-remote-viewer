// js/media.js
class MediaManager {
    static localStream = null;
    static blurredStream = null;
    static canvasContext = null;
    static animationFrameId = null;
    static isBlurred = false;
    static recorder = null;
    static recordedChunks = [];

    static async getScreenStream() {
        try {
            // High framerate capture
            this.localStream = await navigator.mediaDevices.getDisplayMedia({
                video: { frameRate: { ideal: 60 } },
                audio: true // Assuming system audio is desired
            });

            // Display locally
            const localVideo = document.getElementById('local-preview');
            localVideo.srcObject = this.localStream;
            localVideo.style.display = 'block';

            // Catch stop sharing
            this.localStream.getVideoTracks()[0].onended = () => {
                if (window.stopHosting) stopHosting();
            };

            return this.localStream;
        } catch (e) {
            console.error('Error getting display media:', e);
            throw e;
        }
    }

    static toggleBlur(broadcastCallback) {
        this.isBlurred = !this.isBlurred;
        const localVideo = document.getElementById('local-preview');
        
        if (this.isBlurred) {
            localVideo.classList.add('blurred');
            // Advanced: Implement Canvas Blur to replace the stream being sent 
            // In a real app, you would draw localVideo to a canvas, apply filter blur, 
            // and capture canvas.captureStream(), then tell WebRTCManager to renegotiate stream.
            alert('Privacy Blur Activated (Local Effect Enabled)');
        } else {
            localVideo.classList.remove('blurred');
            alert('Privacy Blur Deactivated');
        }
    }

    static stopStream() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(t => t.stop());
            this.localStream = null;
        }
        document.getElementById('local-preview').style.display = 'none';
        this.stopRecording();
    }

    // --- Session Recording (Viewer Side) ---
    static startRecording(stream) {
        if (!stream || !stream.active) {
            alert('No active stream to record!');
            return false;
        }
        
        this.recordedChunks = [];
        try {
            // Attempt to use webm with vp9 for compression
            const options = { mimeType: 'video/webm; codecs=vp9' };
            this.recorder = new MediaRecorder(stream, options);
        } catch (e) {
            this.recorder = new MediaRecorder(stream); // Fallback
        }

        this.recorder.ondataavailable = (e) => {
            if (e.data.size > 0) this.recordedChunks.push(e.data);
        };

        this.recorder.onstop = () => {
            const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            const date = new Date().toISOString().replace(/[:.]/g, '-');
            a.download = `RTN-Session-${date}.webm`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            this.recordedChunks = [];
            alert('Session recording saved to downloads folder.');
        };

        this.recorder.start();
        return true;
    }

    static stopRecording() {
        if (this.recorder && this.recorder.state !== 'inactive') {
            this.recorder.stop();
        }
    }
}
