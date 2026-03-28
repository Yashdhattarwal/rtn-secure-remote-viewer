// js/data-channel.js
class DataChannelManager {
    static connections = new Map();
    
    // File transfer state tracking
    static incomingFiles = new Map(); 

    static register(conn, isHost, peerId = null) {
        const id = isHost ? peerId : 'host';
        this.connections.set(id, conn);

        // Enable chat UI
        document.getElementById('chat-input').disabled = false;
        document.getElementById('btn-send-chat').disabled = false;
        
        conn.on('data', (data) => {
            if (data.type === 'chat') {
                this.handleChat(data.msg, data.timestamp, isHost ? id : 'Host');
            } else if (data.type === 'file_start') {
                this.handleFileStart(data, id);
            } else if (data.type === 'file_chunk') {
                this.handleFileChunk(data, id);
            } else if (data.type === 'sys_auth_fail') {
                alert('Connection Rejected: ' + data.msg);
                updateStatus('error', 'Auth Failed');
            } else if (data.type === 'input_event' && isHost) {
                console.log("Host received input event:", data);
                // Route to InputExecute on Host Side
                if (typeof InputExecute !== 'undefined') {
                    InputExecute.handleRemoteEvent(data, id);
                } else {
                    console.warn("InputExecute is undefined on Host!");
                }
            }
        });
    }

    static broadcastOrSend(payload) {
        // If Host, broadcast to all. If Viewer, send to host.
        for (let conn of this.connections.values()) {
            if (conn.open) {
                conn.send(payload);
            }
        }
    }

    static sendChat(msg) {
        const payload = { type: 'chat', msg: msg, timestamp: Date.now() };
        this.broadcastOrSend(payload);
        addChatMsg(msg, 'self', new Date().toLocaleTimeString());
    }

    static handleChat(msg, timestamp, senderId) {
        // Optional: Implement Google Translate mock here if required
        const time = new Date(timestamp).toLocaleTimeString();
        const displaySender = senderId.length > 8 ? senderId.substring(0,8) + '...' : senderId;
        addChatMsg(msg, 'peer', displaySender + ' ' + time);
    }

    // --- File Transfer Logic (Chunking) ---
    static async sendFile(file) {
        const CHUNK_SIZE = 64 * 1024; // 64kb per chunk (safe for reliable data channel)
        const fileId = Math.random().toString(36).substr(2, 9);
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        
        // Notify start
        this.broadcastOrSend({
            type: 'file_start',
            fileId,
            name: file.name,
            size: file.size,
            typeStr: file.type,
            totalChunks
        });

        document.getElementById('file-progress-container').style.display = 'block';
        document.getElementById('file-status').innerText = 'Sending ' + file.name + '...';

        const bar = document.getElementById('file-progress-bar');
        
        for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(file.size, start + CHUNK_SIZE);
            const chunk = file.slice(start, end);
            const arrayBuffer = await chunk.arrayBuffer();

            this.broadcastOrSend({
                type: 'file_chunk',
                fileId,
                chunkIndex: i,
                data: arrayBuffer
            });
            
            bar.style.width = ((i+1)/totalChunks*100) + '%';
            // Small artificial delay to prevent overfilling PeerJS buffer
            await new Promise(r => setTimeout(r, 10)); 
        }

        document.getElementById('file-status').innerText = 'File Sent: ' + file.name;
        setTimeout(() => { document.getElementById('file-progress-container').style.display = 'none'; }, 2000);
    }

    static handleFileStart(data, senderId) {
        this.incomingFiles.set(data.fileId, {
            name: data.name,
            size: data.size,
            typeStr: data.typeStr,
            totalChunks: data.totalChunks,
            chunks: new Array(data.totalChunks),
            chunksReceived: 0
        });
        
        document.getElementById('file-progress-container').style.display = 'block';
        document.getElementById('file-status').innerText = 'Receiving ' + data.name + '...';
        document.getElementById('file-progress-bar').style.width = '0%';
    }

    static handleFileChunk(data, senderId) {
        const fileState = this.incomingFiles.get(data.fileId);
        if (!fileState) return;

        fileState.chunks[data.chunkIndex] = data.data;
        fileState.chunksReceived++;
        
        const progress = (fileState.chunksReceived / fileState.totalChunks) * 100;
        document.getElementById('file-progress-bar').style.width = progress + '%';

        if (fileState.chunksReceived === fileState.totalChunks) {
            // File complete, reassemble
            const blob = new Blob(fileState.chunks, { type: fileState.typeStr });
            const url = URL.createObjectURL(blob);
            
            // Auto Trigger Download securely
            const a = document.createElement('a');
            a.href = url;
            a.download = fileState.name;
            a.click();
            URL.revokeObjectURL(url);
            
            this.incomingFiles.delete(data.fileId);
            document.getElementById('file-status').innerText = 'Received: ' + fileState.name;
            setTimeout(() => { document.getElementById('file-progress-container').style.display = 'none'; }, 2000);
        }
    }
}
