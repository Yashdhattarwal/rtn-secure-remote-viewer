// js/webrtc.js
class WebRTCManager {
    constructor(isHost, targetId = null, password = null) {
        this.isHost = isHost;
        this.peer = null;
        this.clients = new Map(); // For host to track viewers: id -> { dataConnection, mediaCall }
        this.myId = isHost ? AuthManager.getHostId() : null;
        this.targetId = targetId;
        this.password = password; // Only for viewer
        this.activeStream = null;
        
        // Global PeerJS options with massive NAT penetration for cross-WiFi support
        this.peerOptions = {
            debug: 3, 
            config: {
                iceTransportPolicy: 'all', // Autodetect: use fast local connection OR global TURN relay
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun3.l.google.com:19302' },
                    { urls: 'stun:stun4.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' },
                    { urls: 'turn:openrelay.metered.ca:80?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
                    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
                ]
            }
        };

        this.init();
    }

    init() {
        if (this.isHost) {
            this.peer = new Peer(this.myId, this.peerOptions);
        } else {
            this.peer = new Peer(this.peerOptions); // Let PeerJS autogenerate Viewer ID
        }

        this.peer.on('open', (id) => {
            console.log('PeerJS Connected. ID:', id);
            
            if (this.isHost) {
                updateStatus('hosting', 'Hosting: ' + id);
                document.getElementById('host-id').value = id;
            } else {
                updateStatus('connected', 'Connected as Viewer');
                this.connectToHost();
            }
        });

        this.peer.on('connection', (conn) => {
            if (this.isHost) {
                this.handleIncomingConnection(conn);
            }
        });

        this.peer.on('call', (call) => {
            if (!this.isHost) {
                // Viewer receives the stream call
                this.handleIncomingStream(call);
            }
        });

        this.peer.on('disconnected', () => {
            console.log('Peer disconnected. Attempting reconnect...');
            updateStatus('disconnected', 'Disconnected. Reconnecting...');
            this.peer.reconnect();
        });

        this.peer.on('error', (err) => {
            console.error('Peer error', err);
            if (err.type === 'invalid-id' || err.type === 'peer-unavailable') {
                updateStatus('error', 'Remote host not found');
            }
        });
    }

    connectToHost() {
        if (!this.targetId || !this.password) return;
        
        console.log('Connecting to Host Data Channel...');
        updateStatus('connecting', 'Authenticating...');
        
        // Connect to the host's data channel to authenticate
        const conn = this.peer.connect(this.targetId, {
            reliable: true,
            metadata: { auth: this.password } // Send password in metadata
        });

        conn.on('open', () => {
            console.log('Data connection open with Host');
            updateStatus('connected', 'Authenticated');
            
            // Register DataChannel logic
            DataChannelManager.register(conn, false);
            StatsManager.startTracking(this.peer.getConnection(this.targetId, conn.connectionId)); // Start stats
        });
        
        conn.on('error', err => console.error(err));
        conn.on('close', () => updateStatus('disconnected', 'Host disconnected'));
    }

    handleIncomingConnection(conn) {
        console.log('Incoming connection from', conn.peer);
        
        // Authenticate the viewer via metadata password
        if (conn.metadata && AuthManager.verifyPassword(conn.metadata.auth)) {
            console.log('Viewer authenticated successfully');
            
            this.clients.set(conn.peer, { data: conn, call: null });
            this.updateClientUI();
            
            // Register DataChannel logic
            DataChannelManager.register(conn, true, conn.peer);
            
            // Send JWT Token payload indicating success
            const token = AuthManager.generateToken(conn.peer);
            conn.on('open', () => {
                conn.send({ type: 'sys_auth_success', token: token });
                
                // If we are currently sharing a screen, immediately call them
                if (this.activeStream) {
                    this.callViewer(conn.peer, this.activeStream);
                }
            });

            conn.on('close', () => {
                this.clients.delete(conn.peer);
                this.updateClientUI();
            });

        } else {
            console.warn('Authentication failed for viewer:', conn.peer);
            conn.on('open', () => {
                conn.send({ type: 'sys_auth_fail', msg: 'Invalid Password' });
                setTimeout(() => conn.close(), 1000);
            });
        }
    }

    callViewer(peerId, stream) {
        console.log('Calling viewer with stream:', peerId);
        // Add bandwidth optimizations to the call
        const call = this.peer.call(peerId, stream);
        
        const client = this.clients.get(peerId);
        if (client) {
            client.call = call;
            this.clients.set(peerId, client);
            // We can track stats for this client as well
            StatsManager.startTracking(call.peerConnection, peerId);
        }
    }

    broadcastStream(stream) {
        this.activeStream = stream;
        // Call all connected clients
        for (let [peerId, clientData] of this.clients.entries()) {
            this.callViewer(peerId, stream);
        }
    }

    stopBroadcast() {
        this.activeStream = null;
        for (let [peerId, client] of this.clients.entries()) {
            if (client.call) client.call.close();
        }
    }

    handleIncomingStream(call) {
        console.log('--- RTN DEPLOYMENT V2.1 ACTIVE ---');
        console.log('Receiving media stream from Host...');
        call.answer(); 
        
        call.on('stream', (stream) => {
            console.log('Stream received. Initializing Auto-Control...');
            const video = document.getElementById('remote-video');
            
            video.classList.remove('hidden');
            document.getElementById('no-video-msg').classList.add('hidden');
            document.getElementById('overlay-msg').classList.add('hidden');
            
            video.srcObject = stream;
            
            // AUTOMATIC CONTROL HOOK
            if (window.InputCapture) {
                window.InputCapture.init(video);
                window.InputCapture.toggleControl(true);
                console.log("✅ REMOTE CONTROL INITIALIZED");
            } else {
                console.error("❌ ERROR: InputCapture tool not found! Refresh with Ctrl+F5.");
            }

            video.onloadedmetadata = () => {
                video.play().catch(e => console.error("Play error:", e));
            };
            
            StatsManager.startTracking(call.peerConnection);
        });

        call.on('close', () => {
            console.log('Call closed');
            document.getElementById('remote-video').classList.add('hidden');
            document.getElementById('no-video-msg').classList.remove('hidden');
        });
    }

    updateClientUI() {
        const list = Array.from(this.clients.keys()).map(id => ({ id: id }));
        updateClientList(list);
    }
}
