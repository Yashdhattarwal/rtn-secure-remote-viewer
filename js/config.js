// js/config.js
// Relay (TURN) server, needed when host and viewer are on different networks.
// Fill in ONE of the two options below from your Metered.ca dashboard.
window.RTN_CONFIG = {
    // Option A: Metered credentials API URL, e.g.
    // 'https://YOURAPP.metered.live/api/v1/turn/credentials?apiKey=YOUR_API_KEY'
    turnCredentialsUrl: '',

    // Option B: static TURN credentials (Metered.ca)
    turnServers: [
        { urls: 'stun:stun.relay.metered.ca:80' },
        { urls: 'turn:global.relay.metered.ca:80', username: '1ad1b6b1fc244d1ba69ca21a', credential: 'ouaVqckmFp4CjwvI' },
        { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: '1ad1b6b1fc244d1ba69ca21a', credential: 'ouaVqckmFp4CjwvI' },
        { urls: 'turn:global.relay.metered.ca:443', username: '1ad1b6b1fc244d1ba69ca21a', credential: 'ouaVqckmFp4CjwvI' },
        { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: '1ad1b6b1fc244d1ba69ca21a', credential: 'ouaVqckmFp4CjwvI' }
    ],

    // How long the viewer waits for the host before showing an error
    connectTimeoutMs: 20000
};
