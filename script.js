// script.js - Final Sürüm (Hata Yönetimli)

let cheaters = [];
let isLoggedIn = false;
let hasVisited = localStorage.getItem('stvVisited') === 'true';
let sortColumn = null;
let sortDirection = 'asc';
let socket = null;
const ADMIN_PASSWORDS = ['stv2024admin', 'ljupka2024'];
const WS_URL = 'wss://stv-backend.onrender.com';

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `position: fixed; top: 20px; right: 20px; background: ${type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : '#3b82f6'}; color: white; padding: 12px 20px; border-radius: 8px; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transform: translateX(100%); transition: transform 0.3s ease;`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.transform = 'translateX(0)'; }, 100);
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => { document.body.removeChild(toast); }, 300);
    }, 4000);
}

document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    connectWebSocket();
    if (!hasVisited) showWelcomeModal();
});

function setupEventListeners() {
    document.getElementById('closeModalBtn').addEventListener('click', closeWelcomeModal);
    document.getElementById('adminBtn').addEventListener('click', toggleAdminPanel);
    document.getElementById('adminLoginBtn').addEventListener('click', handleAdminLogin);
    document.getElementById('adminCancelBtn').addEventListener('click', closeAdminLoginModal);
    document.getElementById('adminCloseBtn').addEventListener('click', closeAdminPanel);
    document.getElementById('cheaterForm').addEventListener('submit', handleSubmit);
    document.getElementById('searchInput').addEventListener('input', updateDisplay);
    document.querySelectorAll('.stv-table-header[onclick]').forEach(th =>
        th.addEventListener('click', () => sortTable(th.getAttribute('onclick').match(/'([^']+)'/)[1]))
    );
}

function updateLastUpdateTime() {
    document.getElementById('lastUpdateTime').textContent = new Date().toLocaleString('tr-TR');
}

function showWelcomeModal() { document.getElementById('welcomeModal').style.display = 'flex'; }
function closeWelcomeModal() {
    document.getElementById('welcomeModal').style.display = 'none';
    localStorage.setItem('stvVisited', 'true');
    hasVisited = true;
}

function toggleAdminPanel() { isLoggedIn ? showAdminPanel() : showAdminLoginModal(); }
function showAdminLoginModal() { document.getElementById('adminLoginModal').style.display = 'flex'; document.getElementById('adminPassword').focus(); }
function closeAdminLoginModal() { document.getElementById('adminLoginModal').style.display = 'none'; document.getElementById('adminPassword').value = ''; }
function showAdminPanel() {
    document.getElementById('adminPanelModal').style.display = 'flex';
    document.getElementById('cheaterForm').reset();
    document.getElementById('submitBtn').innerHTML = '<i class="fas fa-plus"></i> Hileci Ekle';
}
function closeAdminPanel() { document.getElementById('adminPanelModal').style.display = 'none'; }

function handleAdminLogin() {
    const password = document.getElementById('adminPassword').value;
    if (ADMIN_PASSWORDS.includes(password)) {
        isLoggedIn = true;
        closeAdminLoginModal();
        updateAdminButton();
        showToast('Giriş başarılı!', 'success');
    } else {
        showToast('Hatalı şifre!', 'error');
    }
}

function updateAdminButton() {
    document.getElementById('adminBtn').innerHTML = `<i class="fas fa-user-shield text-lg"></i> ${isLoggedIn ? 'Admin ✓' : 'Admin'}`;
    document.getElementById('actionsHeader').style.display = isLoggedIn ? 'table-cell' : 'none';
    updateDisplay();
}

function handleSubmit(e) {
    e.preventDefault();
    const playerName = document.getElementById('playerName').value.trim();
    const steamId = document.getElementById('steamId').value.trim();
    if (!playerName || !steamId) {
        showToast('Oyuncu Adı ve Steam ID zorunludur!', 'error');
        return;
    }
    const cheaterData = {
        playerName, steamId,
        steamProfile: document.getElementById('steamProfile').value.trim(),
        serverName: document.getElementById('serverName').value.trim() || "Bilinmiyor",
        detectionCount: parseInt(document.getElementById('detectionCount').value) || 1,
        cheatTypes: document.getElementById('cheatTypes').value.split(',').map(t => t.trim()).filter(Boolean),
        fungunReport: document.getElementById('fungunReport').value.trim()
    };
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'CHEATER_ADDED', data: cheaterData }));
        showToast('Hileci ekleniyor...', 'info');
        document.getElementById('cheaterForm').reset();
    } else {
        showToast('Sunucu bağlantısı yok!', 'error');
    }
}

function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    updateDisplay();
}

function connectWebSocket() {
    showConnectionStatus('Sunucuya bağlanılıyor...', 'info');
    socket = new WebSocket(WS_URL);
    socket.onopen = () => { console.log('WebSocket connected'); hideConnectionStatus(); };
    socket.onmessage = event => handleWebSocketMessage(JSON.parse(event.data));
    socket.onclose = () => {
        showConnectionStatus('Bağlantı kesildi, 3 saniyede yeniden deneniyor...', 'warning');
        setTimeout(connectWebSocket, 3000);
    };
    socket.onerror = (error) => { showConnectionStatus('Bağlantı hatası!', 'error'); };
}

function showConnectionStatus(message, type) {
    const statusDiv = document.getElementById('connectionStatus');
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = `<div class="inline-flex items-center gap-2 p-2 rounded-lg ${type === 'error' ? 'bg-red-900/20 text-red-400' : 'bg-yellow-900/20 text-yellow-400'}"><span>${message}</span></div>`;
}
function hideConnectionStatus() { document.getElementById('connectionStatus').style.display = 'none'; }

function handleWebSocketMessage(message) {
    console.log('Mesaj alındı:', message.type);
    switch (message.type) {
        case 'INITIAL_DATA':
            cheaters = message.data;
            break;
        case 'CHEATER_ADDED':
            cheaters.push(message.data);
            showToast(`Yeni hileci eklendi: ${message.data.playerName}`, 'success');
            break;
        case 'ERROR_OCCURRED': // YENİ HATA MESAJI KONTROLÜ
            showToast(message.data.message, 'error');
            break;
    }
    document.getElementById('cheaterCount').textContent = cheaters.length;
    updateLastUpdateTime();
    updateDisplay();
}

function updateDisplay() {
    const tableBody = document.getElementById('cheaterTableBody');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    let filteredCheaters = cheaters.filter(c => c.playerName.toLowerCase().includes(searchTerm) || c.steamId.toLowerCase().includes(searchTerm));

    if (sortColumn) {
        filteredCheaters.sort((a, b) => {
            const aVal = ('' + (a[sortColumn] || '')).toLowerCase();
            const bVal = ('' + (b[sortColumn] || '')).toLowerCase();
            if (sortDirection === 'asc') return aVal.localeCompare(bVal);
            return bVal.localeCompare(aVal);
        });
    }

    if (filteredCheaters.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-10">Kayıt bulunamadı.</td></tr>`;
    } else {
        tableBody.innerHTML = filteredCheaters.map(cheater => `
            <tr class="stv-table-row relative">
                <td class="p-3">${cheater.playerName}</td>
                <td class="p-3"><code>${cheater.steamId}</code></td>
                <td class="p-3">${cheater.steamProfile ? `<a href="${cheater.steamProfile}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">Profil</a>` : 'Yok'}</td>
                <td class="p-3">${cheater.serverName}</td>
                <td class="p-3"><span class="stv-detection-count">${cheater.detectionCount}</span></td>
                <td class="p-3">${(cheater.cheatTypes || []).map(type => `<span class="stv-cheat-type">${type}</span>`).join('')}</td>
                <td class="p-3">${cheater.fungunReport ? `<a href="${cheater.fungunReport}" target="_blank" rel="noopener noreferrer" class="text-red-400 hover:underline">Rapor</a>` : 'Yok'}</td>
                ${isLoggedIn ? `<td class="p-3"></td>` : ''}
            </tr>
        `).join('');
    }
}
