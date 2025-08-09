// Global değişkenler
let cheaters = [];
let isLoggedIn = false;
let hasVisited = localStorage.getItem('stvVisited') === 'true';
let sortColumn = null;
let sortDirection = 'asc';
let editingIndex = -1;

// Admin şifresi kontrolü
const ADMIN_PASSWORD = 'stv2024admin';

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    setupEventListeners();
    
    if (!hasVisited) {
        showWelcomeModal();
    }
    
    updateDisplay();
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
    document.getElementById('submitBtn').addEventListener('click', handleSubmit);
    document.getElementById('clearFormBtn').addEventListener('click', clearForm);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importFile').addEventListener('change', handleImport);
    document.getElementById('clearAllBtn').addEventListener('click', confirmClearAll);
    
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
    
    if (password === ADMIN_PASSWORD) {
        isLoggedIn = true;
        closeAdminLoginModal();
        showAdminPanel();
        updateAdminButton();
    } else {
        showAdminError('Hatalı şifre!');
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
function handleSubmit() {
    const playerName = document.getElementById('playerName').value.trim();
    const steamId = document.getElementById('steamId').value.trim();
    const steamProfile = document.getElementById('steamProfile').value.trim();
    const serverName = document.getElementById('serverName').value.trim();
    const detectionCount = parseInt(document.getElementById('detectionCount').value) || 1;
    const cheatTypesStr = document.getElementById('cheatTypes').value.trim();
    const fungunReport = document.getElementById('fungunReport').value.trim();
    
    if (!playerName || !steamId || !serverName) {
        showAdminMessage('Lütfen zorunlu alanları doldurun!', false);
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
    
    if (editingIndex >= 0) {
        cheaters[editingIndex] = cheaterData;
        showAdminMessage('Hileci başarıyla güncellendi!');
        editingIndex = -1;
    } else {
        cheaters.push(cheaterData);
        showAdminMessage('Hileci başarıyla eklendi!');
    }
    
    saveData();
    updateDisplay();
    updateCheaterCount();
    clearForm();
    document.getElementById('submitBtn').innerHTML = '<i class="fas fa-plus"></i> Hileci Ekle';
}

// Admin mesaj göster
function showAdminMessage(message, isSuccess = true) {
    const messageDiv = document.getElementById('adminMessage');
    messageDiv.textContent = message;
    messageDiv.className = `rounded-lg p-3 mb-4 text-center ${isSuccess ? 'bg-green-900/20 border border-green-500 text-green-400' : 'bg-red-900/20 border border-red-500 text-red-400'}`;
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
                saveData();
                updateDisplay();
                updateCheaterCount();
                showAdminMessage('Veriler başarıyla yüklendi!');
            } else {
                throw new Error('Geçersiz dosya formatı');
            }
        } catch (error) {
            showAdminMessage('Dosya yüklenirken hata oluştu!', false);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

// Tümünü temizle onayı
function confirmClearAll() {
    showConfirmModal('Tüm hileci verileri silinecek. Bu işlem geri alınamaz!', clearAllData);
}

// Tüm veriyi temizle
function clearAllData() {
    cheaters = [];
    saveData();
    updateDisplay();
    updateCheaterCount();
    showAdminMessage('Tüm veriler temizlendi!');
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

// Veriyi localStorage'a kaydet
function saveData() {
    localStorage.setItem('stvCheaters', JSON.stringify(cheaters));
}

// Veriyi localStorage'dan yükle
function loadData() {
    const savedData = localStorage.getItem('stvCheaters');
    if (savedData) {
        try {
            cheaters = JSON.parse(savedData);
        } catch (error) {
            console.error('Veri yüklenirken hata:', error);
            cheaters = [];
        }
    }
}

// Ekranı güncelle
function updateDisplay(searchTerm = '') {
    const tableBody = document.getElementById('cheaterTableBody');
    const actionsHeader = document.getElementById('actionsHeader');
    
    // Admin işlemleri sütununu göster/gizle
    if (isLoggedIn) {
        actionsHeader.style.display = 'table-cell';
    } else {
        actionsHeader.style.display = 'none';
    }
    
    // Filtreleme
    let filteredCheaters = cheaters;
    if (searchTerm) {
        filteredCheaters = cheaters.filter(cheater =>
            cheater.playerName.toLowerCase().includes(searchTerm) ||
            cheater.steamId.toLowerCase().includes(searchTerm) ||
            cheater.serverName.toLowerCase().includes(searchTerm) ||
            cheater.cheatTypes.some(type => type.toLowerCase().includes(searchTerm))
        );
    }
    
    // Sıralama
    if (sortColumn) {
        filteredCheaters = [...filteredCheaters].sort((a, b) => {
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
        const message = searchTerm ? 'Sonuç bulunamadı.' : 'Henüz hileci eklenmemiş.';
        const colspan = isLoggedIn ? '8' : '7';
        tableBody.innerHTML = `
            <tr>
                <td colspan="${colspan}" class="text-center py-10 text-gray-500 text-lg">
                    <i class="fas fa-search mb-3 text-2xl block"></i>
                    ${message}
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = filteredCheaters.map((cheater, index) => {
        const originalIndex = cheaters.findIndex(c => c === cheater);
        
        return `
            <tr class="stv-table-row relative">
                <td class="p-3">
                    <span class="stv-player-name">${escapeHtml(cheater.playerName)}</span>
                    ${isLoggedIn ? `
                        <button onclick="deleteCheater(${originalIndex})" class="stv-quick-delete-btn" title="Hilenecyi sil">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </td>
                <td class="p-3 text-gray-300">${escapeHtml(cheater.steamId)}</td>
                <td class="p-3">
                    ${cheater.steamProfile ? `
                        <a href="${escapeHtml(cheater.steamProfile)}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 hover:underline font-bold">
                            <i class="fab fa-steam mr-1"></i>
                            Profil
                        </a>
                    ` : '<span class="text-gray-500">Yok</span>'}
                </td>
                <td class="p-3 text-gray-300">${escapeHtml(cheater.serverName)}</td>
                <td class="p-3">
                    <span class="stv-detection-count">${cheater.detectionCount}</span>
                </td>
                <td class="p-3">
                    <div class="flex flex-wrap gap-1">
                        ${cheater.cheatTypes.map(type => `
                            <span class="stv-cheat-type">${escapeHtml(type)}</span>
                        `).join('')}
                    </div>
                </td>
                <td class="p-3">
                    ${cheater.fungunReport ? `
                        <a href="${escapeHtml(cheater.fungunReport)}" target="_blank" rel="noopener noreferrer" class="text-red-400 hover:text-red-300 hover:underline font-bold">
                            Rapor
                        </a>
                    ` : '<span class="text-gray-500">Yok</span>'}
                </td>
                ${isLoggedIn ? `
                    <td class="p-3">
                        <div class="flex gap-2">
                            <button onclick="editCheater(${originalIndex})" class="bg-green-600 hover:bg-green-500 text-white border-none px-3 py-1 rounded cursor-pointer text-xs transition-all duration-300 hover:-translate-y-0.5">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteCheater(${originalIndex})" class="bg-red-700 hover:bg-red-600 text-white border-none px-3 py-1 rounded cursor-pointer text-xs transition-all duration-300 hover:-translate-y-0.5">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                ` : ''}
            </tr>
        `;
    }).join('');
}

// Tablo sıralama
function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    
    // Sıralama ikonlarını güncelle
    document.querySelectorAll('[id^="sort-"]').forEach(icon => {
        icon.className = 'fas fa-sort ml-2';
    });
    
    const icon = document.getElementById(`sort-${column}`);
    if (icon) {
        icon.className = `fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} ml-2`;
    }
    
    updateDisplay(document.getElementById('searchInput').value.toLowerCase());
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
        () => {
            cheaters.splice(index, 1);
            saveData();
            updateDisplay();
            updateCheaterCount();
            showAdminMessage('Hileci silindi!');
        }
    );
}

// HTML escape
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
