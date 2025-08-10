// --- Global Değişkenler ---
let cheaters = [];
let authToken = sessionStorage.getItem('stvAuthToken') || null;
let sortColumn = 'createdAt';
let sortDirection = 'desc';
let socket = null;
let editingCheater = null;
let confirmCallback = null;

const WS_URL = 'wss://stv-backend.onrender.com';
const API_BASE_URL = 'https://stv-backend.onrender.com';

// --- Sayfa Yüklendiğinde Başlat ---
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    connectWebSocket();
    showWelcomeModal();
    if (authToken) {
        updateAdminUI();
    }
});

// --- Olay Dinleyicileri ---
function setupEventListeners() {
    document.getElementById('closeModalBtn').addEventListener('click', closeWelcomeModal);
    document.getElementById('adminBtn').addEventListener('click', toggleAdminPanel);
    document.getElementById('quickAddBtn').addEventListener('click', showAdminPanel);
    document.getElementById('adminLoginBtn').addEventListener('click', handleAdminLogin);
    document.getElementById('adminCancelBtn').addEventListener('click', closeAdminLoginModal);
    document.getElementById('adminCloseBtn').addEventListener('click', closeAdminPanel);
    document.getElementById('editCancelBtn').addEventListener('click', closeEditModal);
    document.getElementById('confirmYes').addEventListener('click', handleConfirmYes);
    document.getElementById('confirmNo').addEventListener('click', closeConfirmModal);
    document.getElementById('cheaterForm').addEventListener('submit', handleSubmit);
    document.getElementById('editForm').addEventListener('submit', handleEditSubmit);
    document.getElementById('searchInput').addEventListener('input', updateDisplay);
    document.getElementById('adminPassword').addEventListener('keypress', e => { if (e.key === 'Enter') handleAdminLogin(); });
    document.querySelectorAll('.stv-table-header[data-sort]').forEach(th => {
        th.addEventListener('click', () => sortTable(th.dataset.sort));
    });
}

// --- WebSocket Fonksiyonları ---
function connectWebSocket() {
    showConnectionStatus(true, 'Sunucuya bağlanılıyor...');
    socket = new WebSocket(WS_URL);
    socket.onopen = () => showConnectionStatus(false);
    socket.onclose = () => {
        showConnectionStatus(true, 'Bağlantı kesildi, yeniden deneniyor...');
        setTimeout(connectWebSocket, 5000);
    };
    socket.onerror = () => showConnectionStatus(true, 'Bağlantı hatası!');
    socket.onmessage = event => handleWebSocketMessage(JSON.parse(event.data));
}

function handleWebSocketMessage(message) {
    const { type, data } = message;
    let toastMessage = '';
    switch (type) {
        case 'INITIAL_DATA': cheaters = data; break;
        case 'CHEATER_ADDED': cheaters.unshift(data); toastMessage = `${data.playerName} eklendi.`; break;
        case 'CHEATER_UPDATED': {
            const index = cheaters.findIndex(c => c._id === data._id);
            if (index !== -1) cheaters[index] = data;
            toastMessage = `${data.playerName} güncellendi.`;
            break;
        }
        case 'CHEATER_DELETED': {
            cheaters = cheaters.filter(c => c._id !== data._id);
            toastMessage = `Hileci silindi.`;
            break;
        }
        case 'ERROR_OCCURRED': showToast(data.message, 'error'); break;
    }
    if (toastMessage) showToast(toastMessage, 'success');
    updateLastUpdateTime();
    updateDisplay();
}

function sendMessage(type, data) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type, data, token: authToken }));
        return true;
    }
    showToast('Sunucu bağlantısı yok!', 'error');
    return false;
}

// --- Form Gönderme İşlemleri ---
function handleSubmit(e) {
    e.preventDefault();
    const cheaterData = {
        playerName: document.getElementById('playerName').value.trim(),
        steamId: document.getElementById('steamId').value.trim(),
        steamProfile: document.getElementById('steamProfile').value.trim(),
        serverName: document.getElementById('serverName').value.trim() || "Bilinmiyor",
        cheatTypes: document.getElementById('cheatTypes').value.split(',').map(t => t.trim()).filter(Boolean),
        fungunReport: document.getElementById('fungunReport').value.trim()
    };
    if (!cheaterData.playerName || !cheaterData.steamId) {
        showToast('Oyuncu Adı ve Steam ID zorunludur!', 'error');
        return;
    }
    if (sendMessage('CHEATER_ADDED', cheaterData)) closeAdminPanel();
}

function handleEditSubmit(e) {
    e.preventDefault();
    if (!editingCheater) return;
    const updatedData = {
        _id: editingCheater._id,
        playerName: document.getElementById('editPlayerName').value.trim(),
        steamId: document.getElementById('editSteamId').value.trim(),
        steamProfile: document.getElementById('editSteamProfile').value.trim(),
        serverName: document.getElementById('editServerName').value.trim() || "Bilinmiyor",
        detectionCount: parseInt(document.getElementById('editDetectionCount').value),
        cheatTypes: document.getElementById('editCheatTypes').value.split(',').map(t => t.trim()).filter(Boolean),
        fungunReport: document.getElementById('editFungunReport').value.trim()
    };
    if (sendMessage('CHEATER_UPDATED', updatedData)) closeEditModal();
}

// --- CRUD Buton Fonksiyonları ---
function showEditModal(cheaterId) {
    editingCheater = cheaters.find(c => c._id === cheaterId);
    if (!editingCheater) return;
    document.getElementById('editPlayerName').value = editingCheater.playerName;
    document.getElementById('editSteamId').value = editingCheater.steamId;
    document.getElementById('editSteamProfile').value = editingCheater.steamProfile || '';
    document.getElementById('editServerName').value = editingCheater.serverName;
    document.getElementById('editDetectionCount').value = editingCheater.detectionCount;
    document.getElementById('editCheatTypes').value = (editingCheater.cheatTypes || []).join(', ');
    document.getElementById('editFungunReport').value = editingCheater.fungunReport || '';
    document.getElementById('editModal').style.display = 'flex';
}

function deleteCheater(cheaterId) {
    const cheater = cheaters.find(c => c._id === cheaterId);
    if (!cheater) return;
    showConfirmModal(`${cheater.playerName} adlı hileci silinecek. Emin misiniz?`, () => {
        sendMessage('CHEATER_DELETED', { _id: cheaterId });
    });
}

function togglePlayerHistory(rowElement) {
    const cheaterId = rowElement.dataset.id;
    const existingHistoryRow = document.getElementById(`history-${cheaterId}`);
    const icon = rowElement.querySelector('.history-icon');
    const isLoggedIn = !!authToken;

    document.querySelectorAll('.stv-history-row').forEach(row => { if (row.id !== `history-${cheaterId}`) row.remove(); });
    document.querySelectorAll('.history-icon.rotated').forEach(i => { if (i !== icon) i.classList.remove('rotated'); });

    if (existingHistoryRow) {
        existingHistoryRow.remove();
        icon?.classList.remove('rotated');
    } else {
        const cheater = cheaters.find(c => c._id === cheaterId);
        if (!cheater || !cheater.history || cheater.history.length === 0) {
            showToast('Bu oyuncu için geçmiş tespit kaydı bulunmuyor.', 'info');
            return;
        }
        
        icon?.classList.add('rotated');
        const historyRow = document.createElement('tr');
        historyRow.id = `history-${cheaterId}`;
        historyRow.className = 'stv-history-row';
        const colSpan = isLoggedIn ? 8 : 7;
        
        const historyContent = cheater.history.map(item => `
            <div class="stv-history-item">
                <span class="stv-history-date"><i class="fas fa-calendar-alt mr-2"></i>${new Date(item.date).toLocaleString('tr-TR')}</span>
                <span class="stv-history-server"><i class="fas fa-server mr-2"></i>${item.serverName}</span>
            </div>`).join('');

        historyRow.innerHTML = `<td colspan="${colSpan}"><div class="stv-history-container"><h4 class="stv-history-title"><i class="fas fa-history mr-2"></i>${cheater.playerName} - Tespit Geçmişi</h4><div class="stv-history-list">${historyContent}</div></div></td>`;
        rowElement.parentNode.insertBefore(historyRow, rowElement.nextSibling);
    }
}

// --- Modal Kontrol Fonksiyonları ---
function showWelcomeModal() { document.getElementById('welcomeModal').style.display = 'flex'; }
function closeWelcomeModal() { document.getElementById('welcomeModal').style.display = 'none'; }
function toggleAdminPanel() { authToken ? showAdminPanel() : showAdminLoginModal(); }
function showAdminLoginModal() { document.getElementById('adminLoginModal').style.display = 'flex'; document.getElementById('adminPassword').focus(); }
function closeAdminLoginModal() { document.getElementById('adminLoginModal').style.display = 'none'; document.getElementById('adminPassword').value = ''; }
function showAdminPanel() { document.getElementById('adminPanelModal').style.display = 'flex'; document.getElementById('cheaterForm').reset(); }
function closeAdminPanel() { document.getElementById('adminPanelModal').style.display = 'none'; }
function closeEditModal() { document.getElementById('editModal').style.display = 'none'; editingCheater = null; }
function showConfirmModal(message, callback) { document.getElementById('confirmMessage').textContent = message; document.getElementById('confirmModal').style.display = 'flex'; confirmCallback = callback; }
function closeConfirmModal() { document.getElementById('confirmModal').style.display = 'none'; confirmCallback = null; }
function handleConfirmYes() { if (confirmCallback) { confirmCallback(); } closeConfirmModal(); }

// --- Admin Giriş Fonksiyonları (Sunucuya Bağlı) ---
async function handleAdminLogin() {
    const password = document.getElementById('adminPassword').value;
    if (!password) {
        showToast('Lütfen şifreyi girin.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: password })
        });

        const result = await response.json();

        if (response.ok && result.token) {
            authToken = result.token;
            sessionStorage.setItem('stvAuthToken', authToken);
            closeAdminLoginModal();
            updateAdminUI();
            showToast('Giriş başarılı!', 'success');
        } else {
            showToast(result.message || 'Hatalı şifre!', 'error');
        }
    } catch (error) {
        showToast('Giriş yapılırken bir sunucu hatası oluştu.', 'error');
        console.error('Login Error:', error);
    }
}

function updateAdminUI() {
    const isLoggedIn = !!authToken;
    document.getElementById('adminBtn').innerHTML = `<i class="fas fa-user-shield mr-2"></i> ${isLoggedIn ? 'Admin ✓' : 'Admin'}`;
    document.getElementById('quickAddBtn').style.display = isLoggedIn ? 'flex' : 'none';
    document.getElementById('actionsHeader').style.display = isLoggedIn ? 'table-cell' : 'none';
    updateDisplay();
}

// --- Arayüz Güncelleme ve Yardımcı Fonksiyonlar ---
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `position: fixed; top: 20px; right: 20px; background: ${type === 'error' ? '#b91c1c' : type === 'success' ? '#16a34a' : '#2563eb'}; color: white; padding: 14px 22px; border-radius: 8px; z-index: 10001; font-weight: 500; box-shadow: 0 5px 15px rgba(0,0,0,0.3); transform: translateX(120%); transition: transform 0.4s ease;`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.transform = 'translateX(0)'; }, 100);
    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => { if (document.body.contains(toast)) document.body.removeChild(toast); }, 400);
    }, 4000);
}
function showConnectionStatus(isConnecting, message = '') {
    const statusDiv = document.getElementById('connectionStatus');
    statusDiv.style.display = isConnecting ? 'block' : 'none';
    if (isConnecting) statusDiv.innerHTML = `<div class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-900/20 text-yellow-400 border border-yellow-500/30">${message}</div>`;
}
function updateLastUpdateTime() { document.getElementById('lastUpdateTime').textContent = new Date().toLocaleString('tr-TR'); }

// --- Tablo Sıralama ve Görüntüleme ---
function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    } else {
        sortColumn = column;
        sortDirection = 'desc';
    }
    updateDisplay();
}

function updateDisplay() {
    const tableBody = document.getElementById('cheaterTableBody');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const isLoggedIn = !!authToken;
    
    let filteredCheaters = cheaters.filter(c =>
        (c.playerName && c.playerName.toLowerCase().includes(searchTerm)) ||
        (c.steamId && c.steamId.toLowerCase().includes(searchTerm))
    );

    filteredCheaters.sort((a, b) => {
        const aVal = a[sortColumn] || '';
        const bVal = b[sortColumn] || '';
        const comparison = String(aVal).localeCompare(String(bVal), undefined, {numeric: true});
        return sortDirection === 'asc' ? comparison : -comparison;
    });

    const colSpan = isLoggedIn ? 8 : 7;
    document.getElementById('actionsHeader').style.display = isLoggedIn ? 'table-cell' : 'none';
    if (filteredCheaters.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center py-10 text-gray-400">Kayıt bulunamadı.</td></tr>`;
    } else {
        tableBody.innerHTML = filteredCheaters.map(cheater => `
            <tr class="stv-table-row" data-id="${cheater._id}">
                <td class="p-3">
                    <span class="stv-player-name ${cheater.detectionCount > 1 ? 'clickable' : ''}" ${cheater.detectionCount > 1 ? `onclick="togglePlayerHistory(this.closest('tr'))"` : ''}>
                        ${cheater.playerName}
                        ${cheater.detectionCount > 1 ? `<i class="fas fa-chevron-down ml-2 history-icon"></i>` : ''}
                    </span>
                </td>
                <td class="p-3"><code>${cheater.steamId}</code></td>
                <td class="p-3">${cheater.steamProfile ? `<a href="${cheater.steamProfile}" target="_blank" class="text-blue-400 hover:underline">Profil</a>` : 'Yok'}</td>
                <td class="p-3">${cheater.serverName}</td>
                <td class="p-3"><span class="stv-detection-count">${cheater.detectionCount}</span></td>
                <td class="p-3">${(cheater.cheatTypes || []).map(type => `<span class="stv-cheat-type">${type}</span>`).join('')}</td>
                <td class="p-3">${(cheater.fungunReport || '').split(',').map(link => link.trim()).filter(Boolean).map(link => `<a href="${link}" target="_blank" class="text-red-400 hover:underline block">Rapor</a>`).join('') || 'Yok'}</td>
                ${isLoggedIn ? `
                    <td class="p-3">
                        <div class="stv-action-buttons">
                            <button onclick="showEditModal('${cheater._id}')" class="stv-action-btn stv-edit-btn" title="Düzenle"><i class="fas fa-edit"></i></button>
                            <button onclick="deleteCheater('${cheater._id}')" class="stv-action-btn stv-delete-btn" title="Sil"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                ` : ''}
            </tr>
        `).join('');
    }
    document.getElementById('cheaterCountDisplay').textContent = cheaters.length;
}
