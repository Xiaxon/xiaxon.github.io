// --- Global Değişkenler ---
let cheaters = [];
let tickets = []; // Yeni bilet verileri için
let authToken = sessionStorage.getItem('stvAuthToken') || null;
let sortColumn = 'createdAt';
let sortDirection = 'desc';
let socket = null;
let editingCheater = null;
let editingHistory = null;
let confirmCallback = null;
let isTicketPage = false; // Sayfa tipini belirler

const WS_URL = 'wss://stv-backend.onrender.com';
const API_BASE_URL = 'https://stv-backend.onrender.com';

// --- Sayfa Yüklendiğinde Başlat ---
document.addEventListener('DOMContentLoaded', () => {
    // URL kontrolü ile sayfa tipini belirle
    isTicketPage = window.location.pathname.includes('tickets.html');

    setupEventListeners();
    connectWebSocket();
    
    // YENİ: Başlatma mantığı sayfa tipine göre ayrıldı
    if (!isTicketPage) {
        // Sadece Hileci Listesi sayfasında çalışacaklar
        showWelcomeModal();
        if (authToken) {
            updateAdminUI();
        }
    }
});

// --- Yardımcı Fonksiyonlar (Arayüz ve Modal) ---
function sanitize(str) {
    if (!str) return '';
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    const color = type === 'error' ? 'bg-red-600' : type === 'warning' ? 'bg-yellow-600' : 'bg-green-600';
    const toast = document.createElement('div');
    toast.className = `stv-toast ${color}`;
    toast.innerHTML = `<p>${message}</p>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('hide');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 4000);
}
function showSuccessToast(message) { showToast(message, 'success'); }
function showErrorToast(message) { showToast(message, 'error'); }
function showConfirmModal(title, message, callback) {
    const confirmModal = document.getElementById('confirmModal');
    if (!confirmModal) return;
    document.getElementById('confirmMessage').textContent = message;
    confirmCallback = callback;
    confirmModal.style.display = 'flex';
}
function closeConfirmModal() {
    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal) { confirmModal.style.display = 'none'; }
    confirmCallback = null;
}
function handleConfirmYes() {
    if (confirmCallback) { confirmCallback(); }
    closeConfirmModal();
}
function showWelcomeModal() {
    if (document.getElementById('welcomeModal')) { document.getElementById('welcomeModal').style.display = 'flex'; }
}
function closeWelcomeModal() {
    if (document.getElementById('welcomeModal')) { document.getElementById('welcomeModal').style.display = 'none'; }
}
function updateFooter(count) {
    const cheaterCountDisplay = document.getElementById('cheaterCountDisplay');
    const lastUpdateTime = document.getElementById('lastUpdateTime');
    if (cheaterCountDisplay) cheaterCountDisplay.textContent = count;
    if (lastUpdateTime) lastUpdateTime.textContent = new Date().toLocaleTimeString();
}
function sortByColumn(a, b) {
    const aVal = a[sortColumn] || '';
    const bVal = b[sortColumn] || '';
    let comparison = 0;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
    } else {
        comparison = aVal.toString().localeCompare(bVal.toString());
    }
    return sortDirection === 'asc' ? comparison : comparison * -1;
}
// Hileci geçmişi fonksiyonları (Kullanıcının eski script'inden geri getirildi)
function closeEditHistoryModal() {
    document.getElementById('editHistoryModal').style.display = 'none';
    editingHistory = null;
}
function handleHistoryEditSubmit(e) {
    e.preventDefault();
    showErrorToast('Bu özellik şimdilik devre dışıdır.'); // Güvenli olması için devre dışı bıraktık.
    closeEditHistoryModal();
}
function deleteHistoryEntry(cheaterId, historyId) {
    showConfirmModal('Bu tespit geçmişi kaydı kalıcı olarak silinecek. Emin misiniz?', () => {
        showErrorToast('Bu özellik şimdilik devre dışıdır.'); // Güvenli olması için devre dışı bıraktık.
    });
}
function editHistoryEntry(cheaterId, historyId) {
    showErrorToast('Bu özellik şimdilik devre dışıdır.'); // Güvenli olması için devre dışı bıraktık.
}
function togglePlayerHistory(rowElement) {
    const cheaterId = rowElement.dataset.id;
    const icon = rowElement.querySelector('.history-icon');
    const isLoggedIn = !!authToken;
    
    // Açık olan geçmişi kapat
    const currentlyOpen = document.querySelectorAll(`.history-for-${cheaterId}`);
    if (currentlyOpen.length > 0) {
        currentlyOpen.forEach(row => row.remove());
        icon?.classList.remove('rotated');
        return;
    }
    // Diğer açık olan geçmişleri kapat
    document.querySelectorAll('.stv-history-row').forEach(row => row.remove());
    document.querySelectorAll('.history-icon.rotated').forEach(i => i.classList.remove('rotated'));

    const cheater = cheaters.find(c => c._id === cheaterId);
    if (!cheater || !cheater.history || cheater.history.length === 0) {
        showToast('Bu oyuncu için geçmiş tespit kaydı bulunmuyor.', 'info');
        return;
    }
    
    // Yeni geçmişi aç
    icon?.classList.add('rotated');
    const historyRowsHTML = cheater.history.map(item => {
        const itemDate = new Date(item.date).toLocaleString('tr-TR');
        const playerName = sanitize(item.playerName || cheater.playerName);
        const steamId = sanitize(item.steamId || cheater.steamId);
        const steamProfile = sanitize(item.steamProfile || cheater.steamProfile);
        const itemServer = sanitize(item.serverName || 'Bilinmiyor');
        const itemCheats = (item.cheatTypes || []).map(type => `<span class="stv-cheat-type">${sanitize(type)}</span>`).join('');
        const fungunReport = item.fungunReport || '';
        
        const adminActionsHTML = isLoggedIn ? `
            <td class="p-3">
                <div class="stv-action-buttons">
                    <button onclick="editHistoryEntry('${cheater._id}', '${item._id}')" class="stv-action-btn stv-edit-btn" title="Bu Tespiti Düzenle"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteHistoryEntry('${cheater._id}', '${item._id}')" class="stv-action-btn stv-delete-btn" title="Bu Tespiti Sil"><i class="fas fa-trash"></i></button>
                </div>
            </td>` : '';

        return `
            <tr class="stv-table-row stv-history-row history-for-${cheaterId}" data-history-id="${item._id}">
                <td class="p-3">${playerName}<span class="stv-history-date-small">${itemDate}</span></td>
                <td class="p-3"><code>${steamId}</code></td>
                <td class="p-3">${steamProfile ? `<a href="${steamProfile}" target="_blank" class="text-blue-400 hover:underline">Profil</a>` : 'Yok'}</td>
                <td class="p-3">${itemServer}</td>
                <td class="p-3">-</td>
                <td class="p-3">${itemCheats}</td>
                <td class="p-3">${(fungunReport).split(',').map(link => link.trim()).filter(Boolean).map(link => `<a href="${sanitize(link)}" target="_blank" class="text-red-400 hover:underline block">Rapor</a>`).join('') || 'Yok'}</td>
                ${adminActionsHTML}
            </tr>`;
    }).join('');
    
    rowElement.insertAdjacentHTML('afterend', historyRowsHTML);
}


// --- Olay Dinleyicileri (SetupEventListeners) ---
function setupEventListeners() {
    // Tüm sayfalarda ortak olanlar
    document.getElementById('confirmYes')?.addEventListener('click', handleConfirmYes);
    document.getElementById('confirmNo')?.addEventListener('click', closeConfirmModal);
    
    // Bilet Sayfasına Özel Dinleyiciler
    if (isTicketPage) {
        document.getElementById('openTicketModalBtn')?.addEventListener('click', showCreateTicketModal);
        document.getElementById('ticketCancelBtn')?.addEventListener('click', closeCreateTicketModal);
        document.getElementById('ticketForm')?.addEventListener('submit', handleCreateTicket);
        document.getElementById('acceptCancelBtn')?.addEventListener('click', closeAcceptTicketModal);
        document.getElementById('acceptTicketForm')?.addEventListener('submit', handleAcceptTicket);
    } 
    // Hileci Sayfasına Özel Dinleyiciler (index.html)
    else {
        document.getElementById('closeModalBtn')?.addEventListener('click', closeWelcomeModal);
        document.getElementById('adminBtn')?.addEventListener('click', toggleAdminPanel);
        document.getElementById('quickAddBtn')?.addEventListener('click', showAdminPanel);
        document.getElementById('adminLoginBtn')?.addEventListener('click', handleAdminLogin);
        document.getElementById('adminCancelBtn')?.addEventListener('click', closeAdminLoginModal);
        document.getElementById('adminCloseBtn')?.addEventListener('click', closeAdminPanel);
        document.getElementById('editCancelBtn')?.addEventListener('click', closeEditModal);
        document.getElementById('cheaterForm')?.addEventListener('submit', handleAddCheater);
        document.getElementById('editForm')?.addEventListener('submit', handleEditSave);
        document.getElementById('searchInput')?.addEventListener('input', handleSearch);
        document.getElementById('adminPassword')?.addEventListener('keypress', e => { if (e.key === 'Enter') handleAdminLogin(e); });
        document.getElementById('editHistoryForm')?.addEventListener('submit', handleHistoryEditSubmit);
        document.getElementById('editHistoryCancelBtn')?.addEventListener('click', closeEditHistoryModal);
        document.querySelectorAll('.stv-table-header[data-sort]').forEach(header => {
            header.addEventListener('click', handleSort);
        });
    }
}


// --- WebSocket Bağlantısı ve Veri Yönetimi ---
function connectWebSocket() {
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
        console.log('WebSocket bağlantısı kuruldu.');
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            const { type, data: payload } = data;

            switch (type) {
                case 'INITIAL_DATA':
                    if (!isTicketPage) { // Sadece Hileci sayfasında yükle
                        cheaters = payload.cheaters;
                        cheaters.sort(sortByColumn);
                        renderCheaters(cheaters);
                        updateFooter(cheaters.length);
                    } else { // Sadece Bilet sayfasında yükle
                        tickets = payload.openTickets;
                        renderTickets(tickets);
                    }
                    break;
                case 'CHEATER_ADDED':
                case 'CHEATER_UPDATED':
                case 'CHEATER_DELETED':
                    if (!isTicketPage) {
                        handleCheaterUpdate(type, payload.data);
                    }
                    break;
                    
                // --- Bilet Güncellemeleri ---
                case 'MATCH_TICKET_ADDED':
                    if (isTicketPage && payload.data.status === 'Açık') {
                        tickets.unshift(payload.data);
                        renderTickets(tickets);
                    }
                    showSuccessToast('Yeni bir 5v5 Maç Bileti açıldı!');
                    break;
                
                case 'MATCH_TICKET_UPDATED':
                    if (isTicketPage) {
                        const index = tickets.findIndex(t => t._id === payload.data._id);
                        if (payload.data.status === 'Eşleşti') {
                            tickets = tickets.filter(t => t._id !== payload.data._id);
                        } else if (index !== -1) {
                            tickets[index] = payload.data;
                        }
                        renderTickets(tickets);
                    }
                    if (payload.data.status === 'Eşleşti') {
                        showSuccessToast(`Maç Bileti (${payload.data.clanName}) eşleşti!`);
                    }
                    break;
                    
                case 'USER_COUNT_UPDATE':
                    // Her iki sayfada da göster
                    const userCountDisplay = document.getElementById('userCountDisplay');
                    if (userCountDisplay) {
                         userCountDisplay.textContent = payload.data.count;
                    }
                    break;
                case 'ERROR_OCCURRED':
                    showErrorToast(`Sunucu Hatası: ${payload.data.message}`);
                    break;
                default:
                    console.log('Bilinmeyen WS tipi:', type);
            }
        } catch (error) {
            console.error('WebSocket veri işleme hatası:', error);
        }
    };
    
    socket.onclose = (e) => {
        console.warn('WebSocket bağlantısı kesildi. Yeniden bağlanılıyor...', e.reason);
        setTimeout(connectWebSocket, 5000);
    };

    socket.onerror = (err) => {
        console.error('WebSocket Hatası:', err);
    };
}


// --- HİLECİ LİSTESİ MANTIĞI (Sadece index.html) ---

function handleCheaterUpdate(type, data) {
    switch (type) {
        case 'CHEATER_ADDED':
            cheaters.push(data);
            break;
        case 'CHEATER_UPDATED':
            const updateIndex = cheaters.findIndex(c => c._id === data._id);
            if (updateIndex !== -1) {
                // Ana kaydı güncelle
                cheaters[updateIndex] = {
                    ...cheaters[updateIndex],
                    ...data,
                    history: cheaters[updateIndex].history // Geçmiş kaydı koru
                };
            }
            break;
        case 'CHEATER_DELETED':
            cheaters = cheaters.filter(c => c._id !== data._id);
            break;
    }
    
    cheaters.sort(sortByColumn);
    renderCheaters(cheaters);
    updateFooter(cheaters.length);
}

function filterAndSort(list) {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return list;
    
    const searchTerm = searchInput.value.toLowerCase();
    
    const filteredList = list.filter(cheater => 
        (cheater.playerName && cheater.playerName.toLowerCase().includes(searchTerm)) ||
        (cheater.steamId && cheater.steamId.toLowerCase().includes(searchTerm)) ||
        (cheater.serverName && cheater.serverName.toLowerCase().includes(searchTerm))
    );
    
    return filteredList;
}

function renderCheaters(cheaterList) {
    const tableBody = document.getElementById('cheaterTableBody');
    if (!tableBody) return; 

    const isLoggedIn = !!authToken;
    const filteredList = filterAndSort(cheaterList);

    const actionsHeader = document.getElementById('actionsHeader');
    if (actionsHeader) actionsHeader.style.display = isLoggedIn ? 'table-cell' : 'none';
    const colSpan = isLoggedIn ? 8 : 7;
    
    if (filteredList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center py-10 text-gray-400">Aradığınız kriterlere uygun hileci bulunamadı.</td></tr>`;
        return;
    }

    tableBody.innerHTML = filteredList.map(cheater => `
        <tr class="stv-table-row" data-id="${cheater._id}">
            <td class="p-3">
                <span class="stv-player-name ${cheater.detectionCount > 1 ? 'clickable' : ''}" ${cheater.detectionCount > 1 ? `onclick="togglePlayerHistory(this.closest('tr'))"` : ''}>
                    ${sanitize(cheater.playerName)}
                    ${cheater.detectionCount > 1 ? `<i class="fas fa-chevron-down ml-2 history-icon"></i>` : ''}
                </span>
            </td>
            <td class="p-3"><code>${sanitize(cheater.steamId)}</code></td>
            <td class="p-3">${cheater.steamProfile ? `<a href="${sanitize(cheater.steamProfile)}" target="_blank" class="text-blue-400 hover:underline">Profil</a>` : 'Yok'}</td>
            <td class="p-3">${sanitize(cheater.serverName)}</td>
            <td class="p-3"><span class="stv-detection-count">${cheater.detectionCount}</span></td>
            <td class="p-3">${(cheater.cheatTypes || []).map(type => `<span class="stv-cheat-type">${sanitize(type)}</span>`).join('')}</td>
            <td class="p-3">${(cheater.fungunReport || '').split(',').map(link => link.trim()).filter(Boolean).map(link => `<a href="${sanitize(link)}" target="_blank" class="text-red-400 hover:underline block">Rapor</a>`).join('') || 'Yok'}</td>
            ${isLoggedIn ? `
                <td class="p-3">
                    <div class="stv-action-buttons">
                        <button onclick="showEditModal('${cheater._id}')" class="stv-action-btn stv-edit-btn" title="Ana Kaydı Düzenle"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteCheater('${cheater._id}')" class="stv-action-btn stv-delete-btn" title="Sil"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            ` : ''}
        </tr>
    `).join('');
}


function handleSort(e) {
    const newSortColumn = e.currentTarget.getAttribute('data-sort');
    if (newSortColumn === sortColumn) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = newSortColumn;
        sortDirection = 'desc';
    }

    document.querySelectorAll('.stv-table-header[data-sort]').forEach(header => {
        header.classList.remove('sorted-asc', 'sorted-desc');
    });

    e.currentTarget.classList.add(`sorted-${sortDirection}`);
    
    cheaters.sort(sortByColumn);
    renderCheaters(cheaters);
}

function handleSearch(e) {
    renderCheaters(cheaters);
}


// Admin Panel Fonksiyonları
function updateAdminUI() {
    const isAdmin = !!authToken;
    const adminBtn = document.getElementById('adminBtn');
    const quickAddBtn = document.getElementById('quickAddBtn');
    
    if (adminBtn) adminBtn.innerHTML = isAdmin ? '<i class="fas fa-user-shield text-lg mr-2"></i>Admin ✓' : '<i class="fas fa-user-shield text-lg mr-2"></i>Admin';
    if (quickAddBtn) quickAddBtn.style.display = isAdmin ? 'flex' : 'none';

    // Logout/Login Event'ını güncelle
    if (isAdmin) {
        if (adminBtn) adminBtn.removeEventListener('click', toggleAdminPanel);
        if (adminBtn) adminBtn.addEventListener('click', handleAdminLogout);
    } else {
        if (adminBtn) adminBtn.removeEventListener('click', handleAdminLogout);
        if (adminBtn) adminBtn.addEventListener('click', toggleAdminPanel);
        closeAdminPanel(); // Çıkış yapınca paneli kapat
    }
    
    renderCheaters(cheaters); // İşlem sütunlarını güncellemek için render et
}

function handleAdminLogout() {
    showConfirmModal('Çıkış Onayı', 'Yönetici panelinden çıkış yapmak istediğinizden emin misiniz?', () => {
        sessionStorage.removeItem('stvAuthToken');
        authToken = null;
        updateAdminUI();
        showSuccessToast('Yönetici panelinden başarıyla çıkış yapıldı.');
    });
}

function toggleAdminPanel() {
    if (authToken) {
        showAdminPanel();
    } else {
        showAdminLoginModal();
    }
}

function showAdminLoginModal() {
    document.getElementById('adminLoginModal').style.display = 'flex';
    document.getElementById('adminPassword').focus();
}

function closeAdminLoginModal() {
    document.getElementById('adminLoginModal').style.display = 'none';
    document.getElementById('adminPassword').value = '';
}

async function handleAdminLogin(e) {
    if(e && e.preventDefault) e.preventDefault(); // Enter tuşu için
    const password = document.getElementById('adminPassword').value;
    const loginBtn = document.getElementById('adminLoginBtn');
    if(loginBtn) loginBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const result = await response.json();

        if (response.ok) {
            authToken = result.token;
            sessionStorage.setItem('stvAuthToken', authToken);
            closeAdminLoginModal();
            updateAdminUI();
            showSuccessToast('Yönetici girişi başarılı!');
        } else {
            showErrorToast(result.message || 'Giriş başarısız.');
        }
    } catch (error) {
        showErrorToast('Sunucuya ulaşılamadı.');
    } finally {
        if(loginBtn) loginBtn.disabled = false;
    }
}

function showAdminPanel() {
    document.getElementById('adminPanelModal').style.display = 'flex';
}

function closeAdminPanel() {
    document.getElementById('adminPanelModal').style.display = 'none';
    document.getElementById('cheaterForm').reset();
}

async function handleAddCheater(e) {
    e.preventDefault();
    if (!authToken) {
        showErrorToast('Bu işlemi yapmak için yönetici olmalısınız!');
        return;
    }

    const cheaterData = {
        playerName: document.getElementById('playerName').value,
        steamId: document.getElementById('steamId').value,
        steamProfile: document.getElementById('steamProfile').value,
        serverName: document.getElementById('serverName').value,
        cheatTypes: document.getElementById('cheatTypes').value.split(',').map(t => t.trim()).filter(Boolean),
        fungunReport: document.getElementById('fungunReport').value.split(',').map(t => t.trim()).filter(Boolean)
    };

    if (!socket || socket.readyState !== WebSocket.OPEN) {
        showErrorToast('Sunucuya bağlı değil.');
        return;
    }

    socket.send(JSON.stringify({
        type: 'CHEATER_ADDED',
        data: cheaterData,
        token: authToken
    }));

    closeAdminPanel();
    showSuccessToast('Hileci verisi gönderildi. Liste güncellenecektir.');
}

function showEditModal(cheaterId) {
    if (!authToken) {
        showErrorToast('Bu işlemi yapmak için yönetici olmalısınız!');
        return;
    }
    
    editingCheater = cheaters.find(c => c._id === cheaterId);
    if (!editingCheater) return;

    document.getElementById('editPlayerName').value = editingCheater.playerName;
    document.getElementById('editSteamId').value = editingCheater.steamId;
    document.getElementById('editSteamProfile').value = editingCheater.steamProfile || '';
    document.getElementById('editServerName').value = editingCheater.serverName;
    document.getElementById('editDetectionCount').value = editingCheater.detectionCount;
    document.getElementById('editCheatTypes').value = (editingCheater.cheatTypes || []).join(', ');
    document.getElementById('editFungunReport').value = (editingCheater.fungunReport || []).join(', ');
    
    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    editingCheater = null;
    document.getElementById('editForm').reset();
}

async function handleEditSave(e) {
    e.preventDefault();
    
    const updatedMainData = {
        _id: editingCheater._id,
        playerName: document.getElementById('editPlayerName').value,
        steamId: document.getElementById('editSteamId').value,
        steamProfile: document.getElementById('editSteamProfile').value,
        serverName: document.getElementById('editServerName').value,
        detectionCount: parseInt(document.getElementById('editDetectionCount').value),
        cheatTypes: document.getElementById('editCheatTypes').value.split(',').map(t => t.trim()).filter(Boolean),
        fungunReport: document.getElementById('editFungunReport').value.split(',').map(t => t.trim()).filter(Boolean)
    };
    
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        showErrorToast('Sunucuya bağlı değil.');
        return;
    }

    socket.send(JSON.stringify({
        type: 'CHEATER_UPDATED',
        data: updatedMainData,
        token: authToken
    }));

    closeEditModal();
    showSuccessToast('Ana kayıt güncellendi. Liste anında güncellenecektir.');
}

function deleteCheater(cheaterId) {
    if (!authToken) {
        showErrorToast('Bu işlemi yapmak için yönetici olmalısınız!');
        return;
    }

    showConfirmModal('Silme Onayı', 'Bu hileci kaydını kalıcı olarak silmek istediğinizden emin misiniz?', () => {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            showErrorToast('Sunucuya bağlı değil.');
            return;
        }

        socket.send(JSON.stringify({
            type: 'CHEATER_DELETED',
            data: { _id: cheaterId },
            token: authToken
        }));
        showSuccessToast('Hileci silme isteği gönderildi. Liste güncellenecektir.');
    });
}


// --- 5V5 MAÇ BİLET MANTIĞI (tickets.html) ---

function renderTickets(ticketList) {
    const tableBody = document.getElementById('ticketTableBody');
    if (!tableBody) return; 

    if (!ticketList || ticketList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-gray-400">Şu anda aktif maç bileti bulunmamaktadır. İlk bileti siz açın!</td></tr>`;
        return;
    }

    tableBody.innerHTML = ticketList.map(ticket => `
        <tr class="stv-table-row stv-ticket-row stv-status-${ticket.status.toLowerCase().replace(' ', '-')}" data-ticket-id="${ticket._id}">
            <td class="p-3">
                <span class="font-bold text-lg text-green-400 block">${sanitize(ticket.clanName)}</span>
                <span class="text-xs text-gray-500 break-all">${sanitize(ticket.contactInfo)}</span>
            </td>
            <td class="p-3">${sanitize(ticket.schedule) || 'Belirtilmemiş'}</td>
            <td class="p-3">
                ${(ticket.mapPreference || []).map(map => `<span class="stv-tag stv-map-tag">${sanitize(map)}</span>`).join('') || 'Fark Etmez'}
            </td>
            <td class="p-3 text-sm text-gray-400">${sanitize(ticket.notes) || 'Yok'}</td>
            <td class="p-3">
                ${ticket.status === 'Açık' ? 
                    `<button onclick="showAcceptTicketModal('${ticket._id}')" class="stv-action-btn stv-accept-btn" title="Kabul Et ve Eşleş">
                        <i class="fas fa-handshake mr-1"></i>Kabul Et
                    </button>` : 
                    `<span class="stv-status-badge stv-status-matched">Eşleşti!</span>`
                }
            </td>
        </tr>
        ${ticket.status === 'Eşleşti' ? 
            `<tr class="stv-table-row stv-matched-info">
                <td colspan="5" class="p-3 text-left bg-gray-900/50">
                    <p class="text-sm font-semibold text-yellow-300">
                        <i class="fas fa-info-circle mr-2"></i>Eşleşme Detayları:
                    </p>
                    <p class="ml-5 text-gray-400 text-sm">
                        Kabul Eden Klan: <span class="font-bold">${sanitize(ticket.challengerInfo.clanName)}</span>
                    </p>
                    <p class="ml-5 text-gray-400 text-sm">
                        İletişim: <span class="break-all">${sanitize(ticket.challengerInfo.contactInfo)}</span>
                    </p>
                </td>
            </tr>` : ''
        }
    `).join('');
}


function showCreateTicketModal() {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const answer = num1 + num2;

    const spamCheckHtml = `
        <label for="spamAnswer" class="stv-form-label">Anti-Spam Kontrolü: ${num1} + ${num2} = ? <span class="text-red-500">*</span></label>
        <input type="number" id="spamAnswer" class="stv-form-input" required placeholder="Cevabınız">
        <input type="hidden" id="spamCorrectAnswer" value="${answer}">
    `;
    const spamContainer = document.getElementById('spamCheckContainer');
    if (spamContainer) spamContainer.innerHTML = spamCheckHtml;

    document.getElementById('createTicketModal').style.display = 'flex';
}

function closeCreateTicketModal() {
    document.getElementById('createTicketModal').style.display = 'none';
    document.getElementById('ticketForm').reset();
}

function showAcceptTicketModal(ticketId) {
    document.getElementById('acceptingTicketId').value = ticketId;
    document.getElementById('acceptTicketModal').style.display = 'flex';
}

function closeAcceptTicketModal() {
    document.getElementById('acceptTicketModal').style.display = 'none';
    document.getElementById('acceptTicketForm').reset();
}

async function handleCreateTicket(e) {
    e.preventDefault();
    
    const userAnswer = parseInt(document.getElementById('spamAnswer').value);
    const correctAnswer = parseInt(document.getElementById('spamCorrectAnswer').value);
    
    if (userAnswer !== correctAnswer) {
        showErrorToast('Anti-Spam kontrolü hatalı! Lütfen doğru hesaplayın.');
        return;
    }
    
    const ticketData = {
        clanName: document.getElementById('ticketClanName').value,
        contactInfo: document.getElementById('ticketContactInfo').value,
        schedule: document.getElementById('ticketSchedule').value,
        mapPreference: document.getElementById('ticketMapPreference').value, 
        notes: document.getElementById('ticketNotes').value
    };

    const submitBtn = document.getElementById('ticketSubmitBtn');
    if(submitBtn) submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/tickets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ticketData)
        });

        const result = await response.json();
        
        if (response.ok) {
            showSuccessToast('Maç bileti başarıyla açıldı! Liste anında güncellenecek.');
            closeCreateTicketModal();
        } else if (response.status === 429) {
            showErrorToast(`Hata: ${result.message}`);
        } else {
            showErrorToast(`Bilet oluşturma başarısız: ${result.message || 'Bilinmeyen Hata'}`);
        }
    } catch (error) {
        showErrorToast('Sunucuya ulaşılamadı veya bir hata oluştu.');
        console.error('Bilet oluşturma hatası:', error);
    } finally {
        if(submitBtn) submitBtn.disabled = false;
    }
}

async function handleAcceptTicket(e) {
    e.preventDefault();
    
    const ticketId = document.getElementById('acceptingTicketId').value;
    const challengerData = {
        clanName: document.getElementById('acceptClanName').value,
        contactInfo: document.getElementById('acceptContactInfo').value
    };
    
    const submitBtn = document.getElementById('acceptSubmitBtn');
    if(submitBtn) submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}/accept`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(challengerData)
        });

        const result = await response.json();
        
        if (response.ok) {
            showSuccessToast('Maç bileti başarıyla kabul edildi! İlan sahibiyle iletişime geçin.');
            closeAcceptTicketModal();
        } else {
            showErrorToast(`Kabul etme başarısız: ${result.message || 'Bilinmeyen Hata'}`);
        }
    } catch (error) {
        showErrorToast('Sunucuya ulaşılamadı veya bir hata oluştu.');
        console.error('Bilet kabul etme hatası:', error);
    } finally {
        if(submitBtn) submitBtn.disabled = false;
    }
}
