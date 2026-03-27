// js/auth.js
class AuthManager {
    static getHostId() {
        let id = localStorage.getItem('rtn_host_id');
        if (!id) {
            id = 'RTN-' + Math.random().toString(36).substr(2, 9).toUpperCase();
            localStorage.setItem('rtn_host_id', id);
        }
        return id;
    }

    static generatePassword() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#';
        let pass = '';
        for (let i = 0; i < 8; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        localStorage.setItem('rtn_host_pass', pass);
        return pass;
    }

    static getPassword() {
        let pass = localStorage.getItem('rtn_host_pass');
        if (!pass) {
            pass = this.generatePassword();
        }
        return pass;
    }

    // Verify incoming connection password
    static verifyPassword(incomingPass) {
        const currentPass = this.getPassword();
        return incomingPass === currentPass;
    }

    // Generate a simple token to simulate JWT (since we are P2P and rely on local session)
    // We use crypto-js for HMAC to sign connection tokens if we want robust session reconnects
    static generateToken(peerId, permissionLevel = 'view') {
        const header = { alg: 'HS256', typ: 'JWT' };
        const payload = {
            sub: peerId,
            perm: permissionLevel,
            exp: Date.now() + 1000 * 60 * 60 * 2 // 2 hours
        };
        
        const b64Header = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(JSON.stringify(header)));
        const b64Payload = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(JSON.stringify(payload)));
        
        // Use password as secret for signing (simple P2P secret)
        const secret = this.getPassword();
        const signature = CryptoJS.HmacSHA256(b64Header + "." + b64Payload, secret);
        const b64Signature = CryptoJS.enc.Base64.stringify(signature);
        
        return `${b64Header}.${b64Payload}.${b64Signature}`;
    }

    static verifyToken(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return false;
            
            const [b64H, b64P, b64S] = parts;
            const secret = this.getPassword();
            const signature = CryptoJS.HmacSHA256(b64H + "." + b64P, secret);
            const expectedB64S = CryptoJS.enc.Base64.stringify(signature);
            
            if (b64S !== expectedB64S) return false;
            
            const payload = JSON.parse(CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(b64P)));
            if (payload.exp < Date.now()) return false;
            
            return payload;
        } catch(e) {
            return false;
        }
    }
}
