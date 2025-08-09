// script.js - Final Sürüm (Tüm Özellikler Dahil)

let cheaters = [];
let isLoggedIn = false;
const ADMIN_PASSWORDS = ['stv2024admin', 'ljupka2024'];
const WS_URL = 'wss://stv-backend.onrender.com';
let socket = null;
let editingCheater = null;
let confirmCallback = null;

// Olay dinleyicilerini kurma
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    connectWebSocket();
});

function setupEventListeners() {
    // Modal butonları
    document.getElementById('closeModalBtn')?.addEventListener('click', closeWelcomeModal);
    document.getElementById('adminBtn').addEventListener('click', toggleAdminPanel);
    document.getElementById('quickAddBtn').addEventListener('click', showAdminPanel);
    document.getElementById('adminLoginBtn').addEventListener('click', handleAdminLogin);
    document.getElementById('adminCancelBtn').addEventListener('click', () => document.getElementById('adminLoginModal').style.display = 'none');
    document.getElementById('adminCloseBtn').addEventListener('click', closeAdminPanel);
    document.getElementById('editCancelBtn').addEventListener('click', closeEditModal);
    document.getElementById('confirmYes').addEventListener('click', () => {
        if (confirmCallback) confirmCallback();
        closeConfirmModal();
    });
    document.getElementById('confirmNo').addEventListener('click', closeConfirmModal);

    // Formlar
    document.getElementById('cheaterForm').addEventListener('submit', handleSubmit);
    document.getElementById('editForm').addEventListener('submit', handleEditSubmit);

    // Arama
    document.getElementById('searchInput').addEventListener('input', updateDisplay);
}

// Admin İşlemleri
function handleAdminLogin() {
    const password = document.getElementById('adminPassword').value;
    if (ADMIN_PASSWORDS.includes(password)) {
        isLoggedIn = true;
        document.getElementById('adminLoginModal').style.display = 'none';
        document.getElementById('adminPassword').value = '';
        updateAdminUI();
        showToast('Giriş başarılı!', 'success');
    } else {
        showToast('Hatalı şifre!', 'error');
    }
}

function updateAdminUI() {
    document.getElementById('adminBtn').innerHTML = `<i class="fas fa-user-shield"></i> ${isLoggedIn ? 'Admin ✓' : 'Admin'}`;
    document.getElementById('actionsHeader').style.display = isLoggedIn ? 'table-cell' : 'none';
    document.getElementById('quickAddBtn').style.display = isLoggedIn ? 'flex' : 'none';
    updateDisplay();
}

// WebSocket Bağlantısı ve Mesajlaşma
function connectWebSocket() {
    socket = new WebSocket(WS_URL);
    socket.onopen = () => showConnectionStatus(false);
    socket.onclose = () => {
        showConnectionStatus(true, 'Bağlantı kesildi, yeniden deneniyor...');
        setTimeout(connectWebSocket, 3000);
    };
    socket.onerror = () => showConnectionStatus(true, 'Bağlantı hatası!');
    socket.onmessage = event => handleWebSocketMessage(JSON.parse(event.data));
}

function handleWebSocketMessage(message) {
    const { type, data } = message;
    switch (type) {
        case 'INITIAL_DATA': cheaters = data; break;
        case 'CHEATER_ADDED': cheaters.push(data); showToast(`${data.playerName} eklendi.`, 'success'); break;
        case 'CHEATER_UPDATED': {
            const index = cheaters.findIndex(c => c._id === data._id);
            if (index !== -1) cheaters[index] = data;
            showToast(`${data.playerName} güncellendi.`, 'success');
            break;
        }
        case 'CHEATER_DELETED': {
            cheaters = cheaters.filter(c => c._id !== data._id);
            showToast(`Hileci silindi.`, 'success');
            break;
        }
        case 'ERROR_OCCURRED': showToast(data.message, 'error'); break;
    }
    updateDisplay();
}

function sendMessage(type, data) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type, data }));
        return true;
    }
    showToast('Sunucu bağlantısı yok!', 'error');
    return false;
}

// Form Gönderme
function handleSubmit(e) {
    e.preventDefault();
    const cheaterData = {
        playerName: document.getElementById('playerName').value.trim(),
        steamId: document.getElementById('steamId').value.trim(),
        steamProfile: document.getElementById('steamProfile').value.trim(),
        serverName: document.getElementById('serverName').value.trim() || "Bilinmiyor",
        detectionCount: 1, // Artık backend karar veriyor
        cheatTypes: document.getElementById('cheatTypes').value.split(',').map(t => t.trim()).filter(Boolean),
        fungunReports: document.getElementById('fungunReports').value.split(',').map(link => link.trim()).filter(Boolean)
    };
    if (sendMessage('CHEATER_ADDED', cheaterData)) {
        closeAdminPanel();
    }
}

function handleEditSubmit(e) {
    e.preventDefault();
    if (!editingCheater) return;
    const updatedData = {
        _id: editingCheater._id, // ID'yi gönder
        playerName: document.getElementById('editPlayerName').value.trim(),
        steamId: document.getElementById('editSteamId').value.trim(),
        steamProfile: document.getElementById('editSteamProfile').value.trim(),
        serverName: document.getElementById('editServerName').value.trim() || "Bilinmiyor",
        detectionCount: parseInt(document.getElementById('editDetectionCount').value),
        cheatTypes: document.getElementById('editCheatTypes').value.split(',').map(t => t.trim()).filter(Boolean),
        fungunReports: document.getElementById('editFungunReports').value.split(',').map(link => link.trim()).filter(Boolean)
    };
    if (sendMessage('CHEATER_UPDATED', updatedData)) {
        closeEditModal();
    }
}

// CRUD Fonksiyonları
function showEditModal(cheaterId) {
    editingCheater = cheaters.find(c => c._id === cheaterId);
    if (!editingCheater) return;
    document.getElementById('editPlayerName').value = editingCheater.playerName;
    document.getElementById('editSteamId').value = editingCheater.steamId;
    document.getElementById('editSteamProfile').value = editingCheater.steamProfile || '';
    document.getElementById('editServerName').value = editingCheater.serverName;
    document.getElementById('editDetectionCount').value = editingCheater.detectionCount;
    document.getElementById('editCheatTypes').value = editingCheater.cheatTypes.join(', ');
    document.getElementById('editFungunReports').value = (editingCheater.fungunReports || []).join(', ');
    document.getElementById('editModal').style.display = 'flex';
}

function deleteCheater(cheaterId) {
    const cheater = cheaters.find(c => c._id === cheaterId);
    if (!cheater) return;
    showConfirmModal(`${cheater.playerName} adlı hileci silinecek. Emin misiniz?`, () => {
        sendMessage('CHEATER_DELETED', { _id: cheaterId });
    });
}

// Diğer Modal ve UI Fonksiyonları
// ... (closeAdminPanel, closeEditModal, showConfirmModal vb. fonksiyonlar buraya eklenecek)

// Arayüzü Güncelleme
function updateDisplay() {
    // ... (Mevcut updateDisplay fonksiyonunuz, ama action butonlarını aşağıdaki gibi güncelleyin)
    // Örnek butonlar:
    // <button onclick="showEditModal('${cheater._id}')" ...>
    // <button onclick="deleteCheater('${cheater._id}')" ...>
}
// Gerekli diğer tüm fonksiyonlar (showToast, modals vs.) burada yer almalı.
// Bu kod, ana mantığı içerir. Mevcut script.js'inizdeki diğer yardımcı fonksiyonları koruyun.
