// script.js - Enhanced Version with User Management and History Features

let cheaters = [];
let isLoggedIn = false;
let hasVisited = localStorage.getItem('stvVisited') === 'true';
let sortColumn = null;
let sortDirection = 'asc';
let socket = null;
let currentEditingCheater = null;
let currentConfirmAction = null;

const ADMIN_PASSWORDS = ['stv2024admin', 'ljupka2024'];
const WS_URL = 'wss://stv-backend.onrender.com';

// Toast notification system
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; 
        top: 20px; 
        right: 20px; 
        background: ${type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : '#3b82f6'}; 
        color: white; 
        padding: 12px 20px; 
        border-radius: 8px; 
        z-index: 10000; 
        box-shadow: 0 4px 12px rgba(0,0,0,0.3); 
        transform: translateX(100%); 
        transition: transform 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => { toast.style.transform = 'translateX(0)'; }, 100);
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => { 
            if (document.body.contains(toast)) {
                document.body.removeChild(toast); 
            }
        }, 300);
    }, 4000);
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    connectWebSocket();
    if (!hasVisited) showWelcomeModal();
});

// Setup all event listeners
function setupEventListeners() {
    // Welcome modal
    document.getElementById('closeModalBtn').addEventListener('click', closeWelcomeModal);
    
    // Admin authentication
    document.getElementById('adminBtn').addEventListener('click', toggleAdminPanel);
    document.getElementById('adminLoginBtn').addEventListener('click', handleAdminLogin);
    document.getElementById('adminCancelBtn').addEventListener('click', closeAdminLoginModal);
    document.getElementById('adminPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleAdminLogin();
    });
    
    // Admin panel
    document.getElementById('adminCloseBtn').addEventListener('click', closeAdminPanel);
    document.getElementById('cheaterForm').addEventListener('submit', handleSubmit);
    
    // Quick add button
    document.getElementById('quickAddBtn').addEventListener('click', showAdminPanel);
    
    // Edit modal
    document.getElementById('editForm').addEventListener('submit', handleEditSubmit);
    document.getElementById('editCancelBtn').addEventListener('click', closeEditModal);
    
    // History modal
    document.getElementById('historyCloseBtn').addEventListener('click', closeHistoryModal);
    
    // Confirmation modal
    document.getElementById('confirmYes').addEventListener('click', handleConfirmYes);
    document.getElementById('confirmNo').addEventListener('click', closeConfirmModal);
    
    // Search functionality
    document.getElementById('searchInput').addEventListener('input', updateDisplay);
    
    // Table sorting
    document.querySelectorAll('.stv-table-header[onclick]').forEach(th => {
        const column = th.getAttribute('onclick').match(/'([^']+)'/)[1];
        th.addEventListener('click', () => sortTable(column));
    });
    
    // Export/Import functionality
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importFile').addEventListener('change', importData);
}

// Welcome modal functions
function showWelcomeModal() { 
    document.getElementById('welcomeModal').style.display = 'flex'; 
}

function closeWelcomeModal() {
    document.getElementById('welcomeModal').style.display = 'none';
    localStorage.setItem('stvVisited', 'true');
    hasVisited = true;
}

// Admin authentication functions
function toggleAdminPanel() { 
    isLoggedIn ? showAdminPanel() : showAdminLoginModal(); 
}

function showAdminLoginModal() { 
    document.getElementById('adminLoginModal').style.display = 'flex'; 
    document.getElementById('adminPassword').focus(); 
}

function closeAdminLoginModal() { 
    document.getElementById('adminLoginModal').style.display = 'none'; 
    document.getElementById('adminPassword').value = ''; 
}

function handleAdminLogin() {
    const password = document.getElementById('adminPassword').value;
    if (ADMIN_PASSWORDS.includes(password)) {
        isLoggedIn = true;
        closeAdminLoginModal();
        updateAdminButton();
        showToast('Giriş başarılı!', 'success');
    } else {
        showToast('Hatalı şifre!', 'error');
        document.getElementById('adminPassword').value = '';
    }
}

function updateAdminButton() {
    document.getElementById('adminBtn').innerHTML = `<i class="fas fa-user-shield text-lg"></i> ${isLoggedIn ? 'Admin ✓' : 'Admin'}`;
    document.getElementById('actionsHeader').style.display = isLoggedIn ? 'table-cell' : 'none';
    document.getElementById('quickAddBtn').style.display = isLoggedIn ? 'block' : 'none';
    updateDisplay();
}

// Admin panel functions
function showAdminPanel() {
    document.getElementById('adminPanelModal').style.display = 'flex';
    document.getElementById('cheaterForm').reset();
    document.getElementById('submitBtn').innerHTML = '<i class="fas fa-plus"></i> Hileci Ekle';
}

function closeAdminPanel() { 
    document.getElementById('adminPanelModal').style.display = 'none'; 
}

function handleSubmit(e) {
    e.preventDefault();
    const playerName = document.getElementById('playerName').value.trim();
    const steamId = document.getElementById('steamId').value.trim();
    
    if (!playerName || !steamId) {
        showToast('Oyuncu Adı ve Steam ID zorunludur!', 'error');
        return;
    }
    
    // Check for duplicate Steam ID
    if (cheaters.some(c => c.steamId === steamId)) {
        showToast('Bu Steam ID zaten kayıtlı!', 'error');
        return;
    }
    
    const cheaterData = {
        playerName, 
        steamId,
        steamProfile: document.getElementById('steamProfile').value.trim(),
        serverName: document.getElementById('serverName').value.trim() || "Bilinmiyor",
        detectionCount: parseInt(document.getElementById('detectionCount').value) || 1,
        cheatTypes: document.getElementById('cheatTypes').value.split(',').map(t => t.trim()).filter(Boolean),
        fungunReport: document.getElementById('fungunReport').value.trim(),
        id: Date.now().toString(), // Generate unique ID
        dateAdded: new Date().toISOString(),
        history: []
    };
    
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'CHEATER_ADDED', data: cheaterData }));
        showToast('Hileci ekleniyor...', 'info');
        document.getElementById('cheaterForm').reset();
        closeAdminPanel();
    } else {
        showToast('Sunucu bağlantısı yok!', 'error');
    }
}

// Edit modal functions
function showEditModal(cheater) {
    currentEditingCheater = cheater;
    
    // Populate form fields
    document.getElementById('editPlayerName').value = cheater.playerName || '';
    document.getElementById('editSteamId').value = cheater.steamId || '';
    document.getElementById('editSteamProfile').value = cheater.steamProfile || '';
    document.getElementById('editServerName').value = cheater.serverName || '';
    document.getElementById('editDetectionCount').value = cheater.detectionCount || 1;
    document.getElementById('editCheatTypes').value = (cheater.cheatTypes || []).join(', ');
    document.getElementById('editFungunReport').value = cheater.fungunReport || '';
    
    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    currentEditingCheater = null;
}

function handleEditSubmit(e) {
    e.preventDefault();
    
    if (!currentEditingCheater) {
        showToast('Düzenleme hatası!', 'error');
        return;
    }
    
    const playerName = document.getElementById('editPlayerName').value.trim();
    const steamId = document.getElementById('editSteamId').value.trim();
    
    if (!playerName || !steamId) {
        showToast('Oyuncu Adı ve Steam ID zorunludur!', 'error');
        return;
    }
    
    // Check for duplicate Steam ID (excluding current cheater)
    if (cheaters.some(c => c.steamId === steamId && c.id !== currentEditingCheater.id)) {
        showToast('Bu Steam ID başka bir kayıtta kullanılıyor!', 'error');
        return;
    }
    
    const updatedData = {
        ...currentEditingCheater,
        playerName,
        steamId,
        steamProfile: document.getElementById('editSteamProfile').value.trim(),
        serverName: document.getElementById('editServerName').value.trim() || "Bilinmiyor",
        detectionCount: parseInt(document.getElementById('editDetectionCount').value) || 1,
        cheatTypes: document.getElementById('editCheatTypes').value.split(',').map(t => t.trim()).filter(Boolean),
        fungunReport: document.getElementById('editFungunReport').value.trim(),
        lastModified: new Date().toISOString()
    };
    
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'CHEATER_UPDATED', data: updatedData }));
        showToast('Hileci güncelleniyor...', 'info');
        closeEditModal();
    } else {
        showToast('Sunucu bağlantısı yok!', 'error');
    }
}

// History modal functions
function showHistoryModal(cheater) {
    document.getElementById('historyPlayerName').textContent = cheater.playerName;
    document.getElementById('historyDetectionCount').textContent = cheater.detectionCount || 1;
    
    const historyTableBody = document.getElementById('historyTableBody');
    
    // Generate mock history data based on detection count
    // In a real application, this would come from the backend
    const history = generateMockHistory(cheater);
    
    if (history.length === 0) {
        historyTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-10 text-gray-400">
                    Geçmiş tespit bulunamadı.
                </td>
            </tr>
        `;
    } else {
        historyTableBody.innerHTML = history.map(record => `
            <tr class="stv-table-row">
                <td class="p-3">
                    <span class="stv-history-date">${new Date(record.date).toLocaleDateString('tr-TR')}</span>
                </td>
                <td class="p-3">
                    <span class="stv-history-server">${record.serverName}</span>
                </td>
                <td class="p-3">
                    ${record.cheatTypes.map(type => `<span class="stv-history-cheat-type">${type}</span>`).join('')}
                </td>
                <td class="p-3">
                    ${record.reportUrl ? `<a href="${record.reportUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">Rapor</a>` : 'Yok'}
                </td>
            </tr>
        `).join('');
    }
    
    document.getElementById('historyModal').style.display = 'flex';
}

function closeHistoryModal() {
    document.getElementById('historyModal').style.display = 'none';
}

function generateMockHistory(cheater) {
    const history = [];
    const detectionCount = cheater.detectionCount || 1;
    
    for (let i = 0; i < detectionCount; i++) {
        const daysAgo = Math.floor(Math.random() * 30) + i * 7; // Spread over time
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        
        const servers = ['STV Server #1', 'STV Server #2', 'Public Server', 'Community Server', cheater.serverName];
        const cheatTypesList = cheater.cheatTypes && cheater.cheatTypes.length > 0 
            ? cheater.cheatTypes 
            : ['Aimbot', 'Wallhack', 'Speed', 'No Recoil'];
        
        history.push({
            date: date.toISOString(),
            serverName: servers[Math.floor(Math.random() * servers.length)],
            cheatTypes: cheatTypesList.slice(0, Math.floor(Math.random() * cheatTypesList.length) + 1),
            reportUrl: Math.random() > 0.5 ? cheater.fungunReport : null
        });
    }
    
    return history.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Confirmation modal functions
function showConfirmModal(message, action) {
    document.getElementById('confirmMessage').textContent = message;
    currentConfirmAction = action;
    document.getElementById('confirmModal').style.display = 'flex';
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    currentConfirmAction = null;
}

function handleConfirmYes() {
    if (currentConfirmAction) {
        currentConfirmAction();
    }
    closeConfirmModal();
}

// Delete functionality
function deleteCheater(cheater) {
    showConfirmModal(
        `"${cheater.playerName}" adlı hileciyi silmek istediğinizden emin misiniz?`,
        () => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'CHEATER_DELETED', data: { id: cheater.id } }));
                showToast('Hileci siliniyor...', 'info');
            } else {
                showToast('Sunucu bağlantısı yok!', 'error');
            }
        }
    );
}

// WebSocket connection management
function connectWebSocket() {
    showConnectionStatus('Sunucuya bağlanılıyor...', 'info');
    socket = new WebSocket(WS_URL);
    
    socket.onopen = () => { 
        console.log('WebSocket connected'); 
        hideConnectionStatus(); 
    };
    
    socket.onmessage = event => handleWebSocketMessage(JSON.parse(event.data));
    
    socket.onclose = () => {
        showConnectionStatus('Bağlantı kesildi, 3 saniyede yeniden deneniyor...', 'warning');
        setTimeout(connectWebSocket, 3000);
    };
    
    socket.onerror = (error) => { 
        console.error('WebSocket error:', error);
        showConnectionStatus('Bağlantı hatası!', 'error'); 
    };
}

function showConnectionStatus(message, type) {
    const statusDiv = document.getElementById('connectionStatus');
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = `
        <div class="inline-flex items-center gap-2 p-2 rounded-lg ${
            type === 'error' ? 'bg-red-900/20 text-red-400' : 'bg-yellow-900/20 text-yellow-400'
        }">
            <span>${message}</span>
        </div>
    `;
}

function hideConnectionStatus() { 
    document.getElementById('connectionStatus').style.display = 'none'; 
}

// WebSocket message handling
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
            
        case 'CHEATER_UPDATED':
            const updatedIndex = cheaters.findIndex(c => c.id === message.data.id);
            if (updatedIndex !== -1) {
                cheaters[updatedIndex] = message.data;
                showToast(`Hileci güncellendi: ${message.data.playerName}`, 'success');
            }
            break;
            
        case 'CHEATER_DELETED':
            const deletedIndex = cheaters.findIndex(c => c.id === message.data.id);
            if (deletedIndex !== -1) {
                const deletedCheater = cheaters[deletedIndex];
                cheaters.splice(deletedIndex, 1);
                showToast(`Hileci silindi: ${deletedCheater.playerName}`, 'success');
            }
            break;
            
        case 'ERROR_OCCURRED':
            showToast(message.data.message, 'error');
            break;
            
        default:
            console.log('Bilinmeyen mesaj türü:', message.type);
    }
    
    document.getElementById('cheaterCount').textContent = cheaters.length;
    updateLastUpdateTime();
    updateDisplay();
}

// Table sorting functionality
function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    
    // Update sort indicators
    document.querySelectorAll('[id^="sort-"]').forEach(icon => {
        icon.className = 'fas fa-sort ml-2';
        icon.style.opacity = '0.5';
    });
    
    const sortIcon = document.getElementById(`sort-${column}`);
    if (sortIcon) {
        sortIcon.className = `fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} ml-2`;
        sortIcon.style.opacity = '1';
    }
    
    updateDisplay();
}

// Display update functionality
function updateDisplay() {
    const tableBody = document.getElementById('cheaterTableBody');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    let filteredCheaters = cheaters.filter(c => 
        c.playerName.toLowerCase().includes(searchTerm) || 
        c.steamId.toLowerCase().includes(searchTerm) ||
        (c.serverName && c.serverName.toLowerCase().includes(searchTerm))
    );

    // Apply sorting
    if (sortColumn) {
        filteredCheaters.sort((a, b) => {
            let aVal = a[sortColumn] || '';
            let bVal = b[sortColumn] || '';
            
            // Handle numeric sorting for detection count
            if (sortColumn === 'detectionCount') {
                aVal = parseInt(aVal) || 0;
                bVal = parseInt(bVal) || 0;
                return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
            }
            
            // Handle string sorting
            aVal = ('' + aVal).toLowerCase();
            bVal = ('' + bVal).toLowerCase();
            
            if (sortDirection === 'asc') {
                return aVal.localeCompare(bVal);
            }
            return bVal.localeCompare(aVal);
        });
    }

    if (filteredCheaters.length === 0) {
        const colspan = isLoggedIn ? '8' : '7';
        tableBody.innerHTML = `
            <tr>
                <td colspan="${colspan}" class="text-center py-10 text-gray-400">
                    ${cheaters.length === 0 ? 'Henüz hiç hileci kaydı yok.' : 'Arama kriterinize uygun kayıt bulunamadı.'}
                </td>
            </tr>
        `;
    } else {
        tableBody.innerHTML = filteredCheaters.map(cheater => {
            const hasMultipleDetections = (cheater.detectionCount || 1) > 1;
            const playerNameClass = hasMultipleDetections ? 'stv-player-name-clickable' : 'stv-player-name';
            const playerNameClick = hasMultipleDetections ? `onclick="showHistoryModal(${JSON.stringify(cheater).replace(/"/g, '&quot;')})"` : '';
            
            return `
                <tr class="stv-table-row">
                    <td class="p-3">
                        <span class="${playerNameClass}" ${playerNameClick} title="${hasMultipleDetections ? 'Geçmişi görüntülemek için tıklayın' : ''}">${cheater.playerName}</span>
                    </td>
                    <td class="p-3"><code>${cheater.steamId}</code></td>
                    <td class="p-3">
                        ${cheater.steamProfile ? 
                            `<a href="${cheater.steamProfile}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">Profil</a>` : 
                            'Yok'
                        }
                    </td>
                    <td class="p-3">${cheater.serverName || 'Bilinmiyor'}</td>
                    <td class="p-3">
                        <span class="stv-detection-count">${cheater.detectionCount || 1}</span>
                    </td>
                    <td class="p-3">
                        ${(cheater.cheatTypes || []).map(type => `<span class="stv-cheat-type">${type}</span>`).join('')}
                    </td>
                    <td class="p-3">
                        ${cheater.fungunReport ? 
                            `<a href="${cheater.fungunReport}" target="_blank" rel="noopener noreferrer" class="text-red-400 hover:underline">Rapor</a>` : 
                            'Yok'
                        }
                    </td>
                    ${isLoggedIn ? `
                        <td class="p-3">
                            <div class="stv-table-actions">
                                <button class="stv-edit-btn" onclick="showEditModal(${JSON.stringify(cheater).replace(/"/g, '&quot;')})" title="Düzenle">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="stv-delete-btn" onclick="deleteCheater(${JSON.stringify(cheater).replace(/"/g, '&quot;')})" title="Sil">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    ` : ''}
                </tr>
            `;
        }).join('');
    }
}

// Export/Import functionality
function exportData() {
    try {
        const data = {
            exportDate: new Date().toISOString(),
            totalCheaters: cheaters.length,
            cheaters: cheaters
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `stv-hileci-listesi-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        showToast('Veri başarıyla indirildi!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Veri indirme hatası!', 'error');
    }
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (!data.cheaters || !Array.isArray(data.cheaters)) {
                throw new Error('Geçersiz dosya formatı');
            }
            
            showConfirmModal(
                `${data.cheaters.length} hileci kaydı içeren dosyayı yüklemek istediğinizden emin misiniz? Mevcut veriler korunacak.`,
                () => {
                    if (socket && socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({ type: 'IMPORT_DATA', data: data.cheaters }));
                        showToast('Veriler yükleniyor...', 'info');
                    } else {
                        showToast('Sunucu bağlantısı yok!', 'error');
                    }
                }
            );
            
        } catch (error) {
            console.error('Import error:', error);
            showToast('Dosya okuma hatası! Geçerli bir JSON dosyası seçin.', 'error');
        }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
}

// Utility functions
function updateLastUpdateTime() {
    document.getElementById('lastUpdateTime').textContent = new Date().toLocaleString('tr-TR');
}

// Global functions for onclick handlers (needed for HTML onclick attributes)
window.sortTable = sortTable;
window.showEditModal = showEditModal;
window.deleteCheater = deleteCheater;
window.showHistoryModal = showHistoryModal;
