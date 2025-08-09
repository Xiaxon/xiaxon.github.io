// Global değişkenler
let cheaters = [];
let isLoggedIn = false;
let hasVisited = localStorage.getItem('stvVisited') === 'true';
let sortColumn = null;
let sortDirection = 'asc';
let editingIndex = -1;
let socket = null;

// Admin şifreleri - GitHub deployment için bu şifreleri değiştirin
const ADMIN_PASSWORDS = ['stv2024admin', 'ljupka2024'];

// API endpoints - Backend sunucu URL'inizi buraya yazın
const API_BASE = 'https://your-backend-url.com'; // Bu URL'i backend sunucunuzun URL'i ile değiştirin
const WS_URL = `${API_BASE.replace('http', 'ws')}/ws`;

// Toast notification fonksiyonu
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Toast stilleri ekle
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : '#3b82f6'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    connectWebSocket();
    loadDataFromServer();
    updateLastUpdateTime();
    
    if (!hasVisited) {
        showWelcomeModal();
    }
});

// Event listener'ları kurma
function setupEventListeners() {
    // Modal butonları
    document.getElementById('closeModalBtn').addEventListener('click', closeWelcomeModal);
    document.getElementById('adminBtn').addEventListener('click', toggleAdminPanel);
    document.getElementById('adminLoginBtn').addEventListener('click', handleAdminLogin);
    document.getElementById('adminCancelBtn').addEventListener('click', closeAdminLoginModal);
    document.getElementById('adminCloseBtn').addEventListener('click', closeAdminPanel);
    
    // Form butonları
    document.getElementById('cheaterForm').addEventListener('submit', handleSubmit);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importFile').addEventListener('change', handleImport);
    
    // Onay modal
    document.getElementById('confirmYes').addEventListener('click', handleConfirmYes);
    document.getElementById('confirmNo').addEventListener('click', closeConfirmModal);
    
    // Arama
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    // Enter tuşu ile admin giriş
    document.getElementById('adminPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleAdminLogin();
        }
    });
}

// Son güncelleme zamanını güncelle
function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleDateString('tr-TR') + ' ' + now.toLocaleTimeString('tr-TR');
    document.getElementById('lastUpdateTime').textContent = timeString;
}

// Hoşgeldin modalını göster
function showWelcomeModal() {
    document.getElementById('welcomeModal').style.display = 'flex';
}

// Hoşgeldin modalını kapat
function closeWelcomeModal() {
    document.getElementById('welcomeModal').style.display = 'none';
    localStorage.setItem('stvVisited', 'true');
    hasVisited = true;
}

// Admin panel toggle
function toggleAdminPanel() {
    if (isLoggedIn) {
        showAdminPanel();
    } else {
        showAdminLoginModal();
    }
}

// Admin giriş modalını göster
function showAdminLoginModal() {
    document.getElementById('adminLoginModal').style.display = 'flex';
    document.getElementById('adminPassword').focus();
}

// Admin giriş modalını kapat
function closeAdminLoginModal() {
    document.getElementById('adminLoginModal').style.display = 'none';
    document.getElementById('adminPassword').value = '';
    hideAdminError();
}

// Admin giriş
function handleAdminLogin() {
    const password = document.getElementById('adminPassword').value;
    
    if (ADMIN_PASSWORDS.includes(password)) {
        isLoggedIn = true;
        closeAdminLoginModal();
        showAdminPanel();
        updateAdminButton();
        showToast('Giriş başarılı!', 'success');
    } else {
        showAdminError('Hatalı şifre!');
        showToast('Hatalı şifre!', 'error');
    }
}

// Admin hata göster
function showAdminError(message) {
    const errorDiv = document.getElementById('adminError');
    const errorText = document.getElementById('adminErrorText');
    errorText.textContent = message;
    errorDiv.style.display = 'flex';
    
    setTimeout(() => {
        hideAdminError();
    }, 3000);
}

// Admin hata gizle
function hideAdminError() {
    document.getElementById('adminError').style.display = 'none';
}

// Admin paneli göster
function showAdminPanel() {
    document.getElementById('adminPanelModal').style.display = 'flex';
    updateCheaterCount();
    
    if (editingIndex >= 0) {
        fillForm(cheaters[editingIndex]);
        document.getElementById('submitBtn').innerHTML = '<i class="fas fa-save"></i> Güncelle';
    } else {
        clearForm();
        document.getElementById('submitBtn').innerHTML = '<i class="fas fa-plus"></i> Hileci Ekle';
    }
}

// Admin paneli kapat
function closeAdminPanel() {
    document.getElementById('adminPanelModal').style.display = 'none';
    editingIndex = -1;
    clearForm();
}

// Admin buton güncelle
function updateAdminButton() {
    const adminBtn = document.getElementById('adminBtn');
    adminBtn.innerHTML = `<i class="fas fa-user-shield text-lg"></i> ${isLoggedIn ? 'Admin ✓' : 'Admin'}`;
    
    // Admin işlemleri sütununu göster/gizle
    const actionsHeader = document.getElementById('actionsHeader');
    if (isLoggedIn) {
        actionsHeader.style.display = 'table-cell';
    } else {
        actionsHeader.style.display = 'none';
    }
    
    updateDisplay();
}

// Hileci sayısını güncelle
function updateCheaterCount() {
    document.getElementById('cheaterCount').textContent = cheaters.length;
}

// Form temizle
function clearForm() {
    document.getElementById('playerName').value = '';
    document.getElementById('steamId').value = '';
    document.getElementById('steamProfile').value = '';
    document.getElementById('serverName').value = '';
    document.getElementById('detectionCount').value = '1';
    document.getElementById('cheatTypes').value = '';
    document.getElementById('fungunReport').value = '';
}

// Formu doldur (düzenleme için)
function fillForm(cheater) {
    document.getElementById('playerName').value = cheater.playerName;
    document.getElementById('steamId').value = cheater.steamId;
    document.getElementById('steamProfile').value = cheater.steamProfile || '';
    document.getElementById('serverName').value = cheater.serverName;
    document.getElementById('detectionCount').value = cheater.detectionCount;
    document.getElementById('cheatTypes').value = cheater.cheatTypes.join(', ');
    document.getElementById('fungunReport').value = cheater.fungunReport || '';
}

// Form gönder
async function handleSubmit(e) {
    e.preventDefault();
    
    const playerName = document.getElementById('playerName').value.trim();
    const steamId = document.getElementById('steamId').value.trim();
    const steamProfile = document.getElementById('steamProfile').value.trim();
    const serverName = document.getElementById('serverName').value.trim();
    const detectionCount = parseInt(document.getElementById('detectionCount').value) || 1;
    const cheatTypesStr = document.getElementById('cheatTypes').value.trim();
    const fungunReport = document.getElementById('fungunReport').value.trim();
    
    if (!playerName || !steamId || !serverName) {
        showAdminMessage('Lütfen zorunlu alanları doldurun!', false);
        showToast('Lütfen zorunlu alanları doldurun!', 'error');
        return;
    }
    
    const cheatTypes = cheatTypesStr ? cheatTypesStr.split(',').map(type => type.trim()).filter(type => type) : [];
    
    const cheaterData = {
        playerName,
        steamId,
        steamProfile,
        serverName,
        detectionCount,
        cheatTypes,
        fungunReport
    };
    
    try {
        if (editingIndex >= 0) {
            // GitHub deployment için: Backend API'ye güncelleme isteği gönder
            await sendToServer('PUT', `cheaters/${cheaters[editingIndex].id}`, cheaterData);
            showAdminMessage('Hileci başarıyla güncellendi!');
            showToast('Hileci başarıyla güncellendi!', 'success');
            editingIndex = -1;
        } else {
            // GitHub deployment için: Backend API'ye ekleme isteği gönder
            await sendToServer('POST', 'cheaters', cheaterData);
            showAdminMessage('Hileci başarıyla eklendi!');
            showToast('Hileci başarıyla eklendi!', 'success');
        }
        
        clearForm();
        document.getElementById('submitBtn').innerHTML = '<i class="fas fa-plus"></i> Hileci Ekle';
        updateLastUpdateTime();
    } catch (error) {
        showAdminMessage('İşlem başarısız!', false);
        showToast('İşlem başarısız!', 'error');
        console.error('Submit error:', error);
    }
}

// Admin mesaj göster
function showAdminMessage(message, isSuccess = true) {
    const messageDiv = document.getElementById('adminMessage');
    messageDiv.textContent = message;
    messageDiv.className = `rounded-lg p-3 mb-4 text-center ${isSuccess ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}

// Veri export
function exportData() {
    const dataStr = JSON.stringify(cheaters, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `stv-cheaters-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    showToast('Veriler başarıyla indirildi!', 'success');
}

// Veri import
function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const importedData = JSON.parse(event.target.result);
            if (Array.isArray(importedData)) {
                cheaters = importedData;
                updateDisplay();
                updateCheaterCount();
                showAdminMessage('Veriler başarıyla yüklendi!');
                showToast('Veriler başarıyla yüklendi!', 'success');
                updateLastUpdateTime();
            } else {
                throw new Error('Geçersiz dosya formatı');
            }
        } catch (error) {
            showAdminMessage('Dosya yüklenirken hata oluştu!', false);
            showToast('Dosya yüklenirken hata oluştu!', 'error');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

// Onay modalını göster
function showConfirmModal(message, callback) {
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmModal').style.display = 'flex';
    
    // Callback'i geçici olarak sakla
    window.confirmCallback = callback;
}

// Onay modalını kapat
function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    window.confirmCallback = null;
}

// Onay işlemi
function handleConfirmYes() {
    if (window.confirmCallback) {
        window.confirmCallback();
    }
    closeConfirmModal();
}

// Arama işlemi
function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    updateDisplay(searchTerm);
}

// Tablo sıralama
function sortTable(column) {
    // Önceki sıralama ikonlarını temizle
    document.querySelectorAll('[id^="sort-"]').forEach(icon => {
        icon.className = 'fas fa-sort ml-2';
        icon.style.opacity = '0.5';
    });
    
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    
    // Aktif sıralama ikonunu güncelle
    const icon = document.getElementById(`sort-${column}`);
    if (icon) {
        icon.className = `fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} ml-2`;
        icon.style.opacity = '1';
    }
    
    updateDisplay();
}

// WebSocket bağlantısı
function connectWebSocket() {
    try {
        if (API_BASE === 'https://your-backend-url.com') {
            // Backend URL'i ayarlanmamış, WebSocket bağlantısını atla
            console.log('Backend URL not configured, skipping WebSocket connection');
            showConnectionStatus('Backend bağlantısı yapılandırılmamış', 'warning');
            return;
        }
        
        socket = new WebSocket(WS_URL);
        
        socket.onopen = function() {
            console.log('WebSocket connected');
            hideConnectionStatus();
        };
        
        socket.onmessage = function(event) {
            const message = JSON.parse(event.data);
            handleWebSocketMessage(message);
        };
        
        socket.onclose = function() {
            console.log('WebSocket disconnected');
            showConnectionStatus('Bağlantı kesildi, yeniden bağlanılıyor...', 'warning');
            // Reconnect after 3 seconds
            setTimeout(connectWebSocket, 3000);
        };
        
        socket.onerror = function(error) {
            console.error('WebSocket error:', error);
            showConnectionStatus('Bağlantı hatası', 'error');
        };
    } catch (error) {
        console.error('WebSocket connection failed:', error);
        showConnectionStatus('Bağlantı kurulamadı', 'error');
        // Fallback to polling
        setTimeout(() => loadDataFromServer(), 1000);
    }
}

// Bağlantı durumu göster
function showConnectionStatus(message, type = 'info') {
    const statusDiv = document.getElementById('connectionStatus');
    const textSpan = document.getElementById('connectionText');
    textSpan.textContent = message;
    
    statusDiv.className = `text-center mb-4`;
    statusDiv.innerHTML = `
        <div class="inline-flex items-center gap-2 ${type === 'error' ? 'bg-red-900/20 border-red-500 text-red-400' : type === 'warning' ? 'bg-yellow-900/20 border-yellow-500 text-yellow-400' : 'bg-blue-900/20 border-blue-500 text-blue-400'} px-4 py-2 rounded-lg border">
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    statusDiv.style.display = 'block';
}

// Bağlantı durumunu gizle
function hideConnectionStatus() {
    document.getElementById('connectionStatus').style.display = 'none';
}

// WebSocket mesaj işleme
function handleWebSocketMessage(message) {
    switch (message.type) {
        case 'INITIAL_DATA':
            cheaters = message.data;
            updateDisplay();
            updateCheaterCount();
            updateLastUpdateTime();
            break;
        case 'CHEATER_ADDED':
            cheaters.push(message.data);
            updateDisplay();
            updateCheaterCount();
            updateLastUpdateTime();
            break;
        case 'CHEATER_UPDATED':
            if (message.data.index >= 0 && message.data.index < cheaters.length) {
                cheaters[message.data.index] = message.data.cheater;
                updateDisplay();
                updateLastUpdateTime();
            }
            break;
        case 'CHEATER_DELETED':
            if (message.data.index >= 0 && message.data.index < cheaters.length) {
                cheaters.splice(message.data.index, 1);
                updateDisplay();
                updateCheaterCount();
                updateLastUpdateTime();
            }
            break;
    }
}

// Sunucudan veri yükle
async function loadDataFromServer() {
    try {
        if (API_BASE === 'https://your-backend-url.com') {
            // Backend URL'i ayarlanmamış, demo data kullan
            console.log('Backend URL not configured, using demo data');
            cheaters = [];
            updateDisplay();
            updateCheaterCount();
            return;
        }
        
        const response = await fetch(`${API_BASE}/api/cheaters`);
        if (response.ok) {
            cheaters = await response.json();
            updateDisplay();
            updateCheaterCount();
            updateLastUpdateTime();
        }
    } catch (error) {
        console.error('Veri yüklenirken hata:', error);
        showConnectionStatus('Veri yüklenirken hata oluştu', 'error');
    }
}

// Sunucuya veri gönder
async function sendToServer(method, endpoint, data = null) {
    if (API_BASE === 'https://your-backend-url.com') {
        throw new Error('Backend URL not configured');
    }
    
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${document.getElementById('adminPassword').value}`
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(`${API_BASE}/api/${endpoint}`, options);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Sunucu iletişim hatası:', error);
        throw error;
    }
}

// Ekranı güncelle
function updateDisplay(searchTerm = '') {
    const tableBody = document.getElementById('cheaterTableBody');
    
    let filteredCheaters = cheaters;
    
    // Arama filtresi
    if (searchTerm) {
        filteredCheaters = cheaters.filter(cheater => {
            return (
                cheater.playerName.toLowerCase().includes(searchTerm) ||
                cheater.steamId.toLowerCase().includes(searchTerm) ||
                cheater.serverName.toLowerCase().includes(searchTerm) ||
                cheater.cheatTypes.some(type => type.toLowerCase().includes(searchTerm))
            );
        });
    }
    
    // Sıralama
    if (sortColumn) {
        filteredCheaters.sort((a, b) => {
            let aVal = a[sortColumn];
            let bVal = b[sortColumn];
            
            if (sortColumn === 'cheatTypes') {
                aVal = aVal.join(', ');
                bVal = bVal.join(', ');
            }
            
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }
            
            if (sortDirection === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
    }
    
    // Tablo içeriğini güncelle
    if (filteredCheaters.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="${isLoggedIn ? '8' : '7'}" class="text-center py-10 text-gray-500 text-lg">
                    <i class="fas fa-search mb-3 text-2xl block"></i>
                    ${searchTerm ? 'Arama kriterine uygun hileci bulunamadı.' : 'Henüz hileci eklenmemiş.'}
                </td>
            </tr>
        `;
    } else {
        tableBody.innerHTML = filteredCheaters.map((cheater, index) => `
            <tr class="stv-table-row relative">
                <td class="p-3">
                    <div class="stv-player-name">
                        ${cheater.playerName}
                    </div>
                    ${isLoggedIn ? `
                        <button onclick="deleteCheater(${index})" class="stv-quick-delete-btn" title="Hileciyi sil">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </td>
                <td class="p-3">
                    <code class="text-blue-300">${cheater.steamId}</code>
                </td>
                <td class="p-3">
                    ${cheater.steamProfile ? `
                        <a href="${cheater.steamProfile}" target="_blank" rel="noopener noreferrer" 
                           class="text-blue-400 hover:text-blue-300 hover:underline font-bold">
                            <i class="fab fa-steam mr-1"></i>
                            Profil
                        </a>
                    ` : '<span class="text-gray-500">Yok</span>'}
                </td>
                <td class="p-3">
                    <span class="text-gray-300">${cheater.serverName}</span>
                </td>
                <td class="p-3">
                    <span class="stv-detection-count">${cheater.detectionCount}</span>
                </td>
                <td class="p-3">
                    <div class="flex flex-wrap gap-1">
                        ${cheater.cheatTypes.map(type => `
                            <span class="stv-cheat-type">${type}</span>
                        `).join('')}
                    </div>
                </td>
                <td class="p-3">
                    ${cheater.fungunReport ? `
                        <a href="${cheater.fungunReport}" target="_blank" rel="noopener noreferrer" 
                           class="text-red-400 hover:text-red-300 hover:underline font-bold">
                            Rapor
                        </a>
                    ` : '<span class="text-gray-500">Yok</span>'}
                </td>
                ${isLoggedIn ? `
                    <td class="p-3">
                        <div class="flex gap-2">
                            <button onclick="editCheater(${index})" 
                                    class="bg-green-600 hover:bg-green-500 text-white border-none px-3 py-1 rounded cursor-pointer text-xs transition-all duration-300 hover:-translate-y-0.5">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteCheater(${index})" 
                                    class="bg-red-700 hover:bg-red-600 text-white border-none px-3 py-1 rounded cursor-pointer text-xs transition-all duration-300 hover:-translate-y-0.5">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                ` : ''}
            </tr>
        `).join('');
    }
}

// Hileci düzenle
function editCheater(index) {
    editingIndex = index;
    showAdminPanel();
}

// Hileci sil
function deleteCheater(index) {
    const cheater = cheaters[index];
    showConfirmModal(
        `"${cheater.playerName}" adlı hileci silinecek. Emin misiniz?`,
        async () => {
            try {
                if (API_BASE !== 'https://your-backend-url.com') {
                    await sendToServer('DELETE', `cheaters/${cheater.id}`);
                }
                
                cheaters.splice(index, 1);
                updateDisplay();
                updateCheaterCount();
                updateLastUpdateTime();
                showToast('Hileci silindi!', 'success');
            } catch (error) {
                showToast('Silme işlemi başarısız!', 'error');
                console.error('Delete error:', error);
            }
        }
    );
}
