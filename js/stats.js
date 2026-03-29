// js/stats.js
class StatsManager {
    static intervalId = null;
    static previousBytes = 0;
    static previousTime = 0;

    static startTracking(peerConnection) {
        if (!peerConnection) return;
        
        const overlay = document.getElementById('stats-overlay');
        overlay.classList.remove('hidden');

        this.previousTime = performance.now();
        this.previousBytes = 0;

        // Clear previous interval if any
        this.stopTracking();

        this.intervalId = setInterval(async () => {
            if (!peerConnection || typeof peerConnection.getStats !== 'function' || peerConnection.signalingState === "closed") {
                this.stopTracking();
                return;
            }

            try {
                const stats = await peerConnection.getStats();
                const now = performance.now();
                let fps = '--', ping = '--', loss = '--', bitrate = '--';
                let totalBytes = 0;

                stats.forEach(report => {
                    // Inbound video metrics
                    if (report.type === 'inbound-rtp' && report.kind === 'video') {
                        fps = report.framesPerSecond || fps;
                        loss = report.packetsLost || 0;
                        totalBytes = report.bytesReceived;
                        
                        // Jitter (pseudo-ping for one-way streams)
                        if (report.jitter) ping = (report.jitter * 1000).toFixed(0); 
                    }
                    // Remote candidate ping/rtt
                    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                        if (report.currentRoundTripTime) {
                            ping = (report.currentRoundTripTime * 1000).toFixed(0); // in ms
                        }
                    }
                });

                // Calculate bitrate
                if (totalBytes > 0 && this.previousBytes > 0) {
                    const diffBytes = totalBytes - this.previousBytes;
                    const diffTime = now - this.previousTime; // in ms
                    const bps = (diffBytes * 8) / (diffTime / 1000); // bits per sec
                    bitrate = Math.round(bps / 1024); // kbps
                }

                this.previousBytes = totalBytes > 0 ? totalBytes : this.previousBytes;
                this.previousTime = now;

                document.getElementById('stat-ping').innerText = `Ping: ${ping} ms`;
                document.getElementById('stat-fps').innerText = `FPS: ${fps}`;
                document.getElementById('stat-loss').innerText = `Loss: ${loss}`;
                document.getElementById('stat-kbps').innerText = `Rate: ${bitrate} kbps`;

            } catch (err) {
                console.warn('Error fetching WebRTC stats:', err);
            }
        }, 1000);
    }

    static stopTracking() {
        if (this.intervalId) clearInterval(this.intervalId);
        document.getElementById('stats-overlay').classList.add('hidden');
    }
}
