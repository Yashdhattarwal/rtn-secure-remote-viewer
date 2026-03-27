// js/ui.js
function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
}

function copyValue(elementId) {
    const el = document.getElementById(elementId);
    if (!el || !el.value) return;
    navigator.clipboard.writeText(el.value).then(() => {
        const originalBg = el.style.backgroundColor;
        el.style.backgroundColor = 'var(--success)';
        el.style.color = '#fff';
        setTimeout(() => {
            el.style.backgroundColor = originalBg;
            el.style.color = '';
        }, 300);
    });
}

function togglePasswordVisibility(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.type = el.type === 'password' ? 'text' : 'password';
    }
}

function generateNewPassword() {
    if (typeof AuthManager !== 'undefined') {
        const newPass = AuthManager.generatePassword();
        document.getElementById('host-pass').value = newPass;
    }
}

function updateStatus(status, text) {
    const dot = document.querySelector('.status-dot');
    const span = document.getElementById('status-text');
    span.innerText = text;
    if (status === 'connected' || status === 'hosting') {
        dot.classList.add('active');
    } else {
        dot.classList.remove('active');
    }
}

function addChatMsg(text, type, meta) {
    const container = document.getElementById('chat-messages');
    
    // Remove "offline" message if exists
    if (container.firstElementChild && container.firstElementChild.innerText.includes('offline')) {
        container.innerHTML = '';
    }

    const div = document.createElement('div');
    div.className = `msg ${type}`; // 'self' or 'peer'
    div.innerText = text;
    
    if (meta) {
        const span = document.createElement('span');
        span.className = 'meta';
        span.innerText = meta;
        div.appendChild(span);
    }
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function updateClientList(clients) {
    const container = document.getElementById('sub-clients-list');
    document.getElementById('client-count').innerText = clients.length;
    
    if (clients.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding: 20px; color:var(--text-muted); font-size:0.9rem;">No active connections</div>';
        return;
    }
    
    container.innerHTML = '';
    clients.forEach(c => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `<span><ion-icon name="person-outline"></ion-icon> ${c.id.substring(0,8)}...</span> <span style="font-size:0.7rem; color:var(--success);">● Active</span>`;
        container.appendChild(div);
    });
}
