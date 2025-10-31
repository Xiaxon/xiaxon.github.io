// --- Global Değişkenler ---
let cheaters = [];
let authToken = sessionStorage.getItem('stvAuthToken') || null;
let sortColumn = 'createdAt';
let sortDirection = 'desc';
let socket = null;
let editingCheater = null;
let editingHistory = null;
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
    document.getElementById('editHistoryForm').addEventListener('submit', handleHistoryEditSubmit);
    document.getElementById('editHistoryCancelBtn').addEventListener('click', closeEditHistoryModal);
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
    let needsUpdate = true;

    switch (type) {
        case 'INITIAL_DATA': cheaters = data; break;
        case 'CHEATER_ADDED': cheaters.unshift(data); toastMessage = `${data.playerName} eklendi.`; break;
        case 'CHEATER_UPDATED': {
            const index = cheaters.findIndex(c => c._id === data._id);
            if (index !== -1) cheaters[index] = data;
            toastMessage = `${data.playerName} güncellendi.`;
            const existingHistoryRow = document.querySelector(`.history-for-${data._id}`);
            if (existingHistoryRow) {
                const mainRow = document.querySelector(`tr[data-id="${data._id}"]`);
                if (mainRow) {
                    const icon = mainRow.querySelector('.history-icon');
                    icon?.classList.remove('rotated');
                    document.querySelectorAll(`.history-for-${data._id}`).forEach(row => row.remove());
                    togglePlayerHistory(mainRow);
                }
            }
            break;
        }
        case 'CHEATER_DELETED': {
            cheaters = cheaters.filter(c => c._id !== data._id);
            toastMessage = `Hileci silindi.`;
            break;
        }
        case 'ERROR_OCCURRED': 
            showToast(data.message, 'error'); 
            needsUpdate = false;
            break;
    }
    
    if (needsUpdate) {
        if (toastMessage) showToast(toastMessage, 'success');
        updateLastUpdateTime();
        updateDisplay();
    }
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

function handleHistoryEditSubmit(e) {
    e.preventDefault();
    if (!editingHistory) return;
    const updatedHistoryData = {
        playerName: document.getElementById('editHistoryPlayerName').value.trim(),
        steamId: document.getElementById('editHistorySteamId').value.trim(),
        steamProfile: document.getElementById('editHistorySteamProfile').value.trim(),
        serverName: document.getElementById('editHistoryServerName').value.trim(),
        cheatTypes: document.getElementById('editHistoryCheatTypes').value.split(',').map(t => t.trim()).filter(Boolean),
        fungunReport: document.getElementById('editHistoryFungunReport').value.trim()
    };
    sendMessage('HISTORY_ENTRY_UPDATED', {
        cheaterId: editingHistory.cheaterId,
        historyId: editingHistory.historyId,
        updatedHistoryData
    });
    closeEditHistoryModal();
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
    showConfirmModal(`'${cheater.playerName}' adlı ana kayıt silinecek. Tüm geçmişi de silinir. Emin misiniz?`, () => {
        sendMessage('CHEATER_DELETED', { _id: cheaterId });
    });
}

function deleteHistoryEntry(cheaterId, historyId) {
    showConfirmModal('Bu tespit geçmişi kaydı kalıcı olarak silinecek. Emin misiniz?', () => {
        sendMessage('HISTORY_ENTRY_DELETED', { cheaterId, historyId });
    });
}

function editHistoryEntry(cheaterId, historyId) {
    const cheater = cheaters.find(c => c._id === cheaterId);
    if (!cheater) return;
    const historyEntry = cheater.history.find(h => h._id === historyId);
    if (!historyEntry) return;
    edit
