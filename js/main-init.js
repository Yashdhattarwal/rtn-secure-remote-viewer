// js/main-init.js
let appManager = null;
let isRecording = false;

document.addEventListener('DOMContentLoaded', () => {
    // Check if running in electron (for styling or future desktop logic)
    const isElectron = window && window.process && window.process.type;
    console.log("App Starting. Electron Context:", !!isElectron);
    if (!isElectron) {
        console.log("💡 Tip: To enable Remote Control (Mouse), the Host must be the Desktop App (npx electron .)");
    }

    // Initialize UI fields
    document.getElementById('host-id').value = AuthManager.getHostId();
    document.getElementById('host-pass').value = AuthManager.getPassword();
});

// --- Host Actions --- //

async function startHosting() {
    try {
        const stream = await MediaManager.getScreenStream();
        appManager = new WebRTCManager(true);
        appManager.broadcastStream(stream);

        document.getElementById('btn-host-start').classList.add('hidden');
        document.getElementById('btn-host-stop').classList.remove('hidden');
        document.getElementById('btn-blur').classList.remove('hidden');
        document.getElementById('host-pass').disabled = true; // Lock password
        document.getElementById('host-id').disabled = true;

    } catch (err) {
        alert("Could not start screen sharing: " + err.message);
    }
}

function stopHosting() {
    if (appManager) {
        appManager.stopBroadcast();
        appManager.peer.destroy();
        appManager = null;
    }
    
    MediaManager.stopStream();

    document.getElementById('btn-host-start').classList.remove('hidden');
    document.getElementById('btn-host-stop').classList.add('hidden');
    document.getElementById('btn-blur').classList.add('hidden');
    document.getElementById('host-pass').disabled = false;
    document.getElementById('host-id').disabled = false;
    updateStatus('disconnected', 'Disconnected');
    updateClientList([]); // Clear clients
}

function toggleBlur() {
    MediaManager.toggleBlur();
}

// --- Viewer Actions --- //

function startViewing() {
    const targetId = document.getElementById('target-id').value.trim();
    const targetPass = document.getElementById('target-pass').value.trim();

    if (!targetId || !targetPass) {
        return alert("Please enter Remote ID and Password.");
    }

    // Hide host card, expand viewer viewport
    document.getElementById('host-card').classList.add('hidden');
    document.getElementById('overlay-msg').classList.remove('hidden');
    document.getElementById('viewer-controls').classList.remove('hidden');

    appManager = new WebRTCManager(false, targetId, targetPass);
}

function disconnectViewer() {
    if (appManager) {
        appManager.peer.destroy();
        appManager = null;
    }
    
    document.getElementById('remote-video').classList.add('hidden');
    document.getElementById('remote-video').srcObject = null;
    document.getElementById('no-video-msg').classList.remove('hidden');
    document.getElementById('stats-overlay').classList.add('hidden');
    document.getElementById('host-card').classList.remove('hidden'); // Show host card again
    document.getElementById('viewer-controls').classList.add('hidden');
    StatsManager.stopTracking();
    updateStatus('disconnected', 'Disconnected');
}

function forcePlayRemote() {
    document.getElementById('remote-video').play().catch(e => console.error(e));
    document.getElementById('play-btn').classList.add('hidden');
}

function toggleFullscreen() {
    const vWrapper = document.getElementById('video-wrapper');
    if (!document.fullscreenElement) {
        vWrapper.requestFullscreen().catch(err => alert("Error enabling full screen"));
    } else {
        document.exitFullscreen();
    }
}

function toggleRemoteControl() {
    if (!InputCapture.isControlling) {
        InputCapture.init(document.getElementById('remote-video'));
        InputCapture.toggleControl(true);
        document.getElementById('btn-control').innerHTML = '<ion-icon name="stop-circle-outline"></ion-icon> Stop Control';
        document.getElementById('btn-control').style.color = 'var(--danger)';
    } else {
        InputCapture.toggleControl(false);
        document.getElementById('btn-control').innerHTML = '<ion-icon name="game-controller-outline"></ion-icon> Take Control';
        document.getElementById('btn-control').style.color = '';
    }
}

function toggleRecording() {
    if (!isRecording) {
        // Start
        const video = document.getElementById('remote-video');
        if (MediaManager.startRecording(video.srcObject)) {
            isRecording = true;
            document.getElementById('btn-record').innerHTML = '<ion-icon name="stop-circle-outline"></ion-icon> Stop Recording';
            document.getElementById('btn-record').style.color = 'var(--danger)';
        }
    } else {
        // Stop
        MediaManager.stopRecording();
        document.getElementById('btn-record').innerHTML = '<ion-icon name="recording-outline"></ion-icon> Record Session';
        document.getElementById('btn-record').style.color = '';
        isRecording = false;
    }
}

// --- Data Channel Triggers (Chat & File) --- //

function handleChatKey(e) {
    if (e.key === 'Enter') sendChat();
}

function sendChat() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    
    DataChannelManager.sendChat(msg);
    input.value = '';
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        DataChannelManager.sendFile(file);
    }
}

// Drag & Drop specific handling
const dropzone = document.getElementById('file-dropzone');
dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
});
dropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
});
dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        document.getElementById('file-input').files = e.dataTransfer.files;
        DataChannelManager.sendFile(e.dataTransfer.files[0]);
    }
});
