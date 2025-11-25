// Data State
const INITIAL_DATA = {
    r1: Array(16).fill(null).map((_, i) => ({ name: `TBD ${i + 1}`, score: "" })),
    qf: Array(8).fill(null).map((_, i) => ({ name: `TBD ${i + 1}`, score: "" })),
    sf: Array(4).fill(null).map((_, i) => ({ name: `TBD ${i + 1}`, score: "" })),
    f: Array(2).fill(null).map((_, i) => ({ name: `TBD ${i + 1}`, score: "" })),
    champ: "TBD"
};

const AUTH_KEY = "cs16_admin_auth";
// SHA-256 Hash of "ravza2025."
const AUTH_HASH = "6eb38a9a2d9f2b5780a8f3b09b9d9011b692993d1b87041c150f736068a6eb59";

let tournamentData = JSON.parse(JSON.stringify(INITIAL_DATA));

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    // Load saved data from server API
    try {
        const response = await fetch('/api/tournament');
        if (response.ok) {
            const data = await response.json();
            tournamentData = data;
        }
    } catch (err) {
        console.log('API not available, using defaults');
    }
    
    renderBracket();
    renderAdminInputs();
    attachInputListeners();
    checkAuth();
    lucide.createIcons();
    
    // Poll for updates every 2 seconds
    setInterval(async () => {
        try {
            const response = await fetch('/api/tournament');
            if (response.ok) {
                const data = await response.json();
                if (JSON.stringify(data) !== JSON.stringify(tournamentData)) {
                    tournamentData = data;
                    renderBracket();
                    renderAdminInputs();
                }
            }
        } catch (err) {
            console.log('Update poll failed');
        }
    }, 2000);
    
    // Resize listener for svg lines
    window.addEventListener('resize', () => {
        if(document.getElementById('bracket').classList.contains('active')) {
            drawLines();
        }
    });
});

// Tab Switching
function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    btn.classList.add('active');
    
    if (tabId === 'bracket') {
        setTimeout(drawLines, 50);
    }
}

// Authentication Logic
async function handleLogin(event) {
    event.preventDefault();
    const passwordInput = document.getElementById('admin-password');
    const errorMsg = document.getElementById('login-error');
    const password = passwordInput.value;

    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (hashHex === AUTH_HASH) {
        sessionStorage.setItem(AUTH_KEY, 'true');
        showAdminContent();
        passwordInput.value = '';
        errorMsg.textContent = '';
    } else {
        errorMsg.textContent = 'Hatalı şifre!';
        passwordInput.classList.add('shake');
        setTimeout(() => passwordInput.classList.remove('shake'), 500);
    }
}

function checkAuth() {
    if (sessionStorage.getItem(AUTH_KEY) === 'true') {
        showAdminContent();
    } else {
        showLogin();
    }
}

function showAdminContent() {
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-content').classList.remove('hidden');
}

function showLogin() {
    document.getElementById('admin-login').classList.remove('hidden');
    document.getElementById('admin-content').classList.add('hidden');
}

function logout() {
    sessionStorage.removeItem(AUTH_KEY);
    showLogin();
}

function togglePasswordVisibility() {
    const input = document.getElementById('admin-password');
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}

// Save Data
async function saveData(btn) {
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="check"></i> Kaydediliyor...';
    btn.style.background = '#f59e0b';
    lucide.createIcons();
    
    try {
        const response = await fetch('/api/tournament', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tournamentData)
        });
        
        if (response.ok) {
            btn.innerHTML = '<i data-lucide="check"></i> Kaydedildi';
            btn.style.background = '#16a34a';
            lucide.createIcons();
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
                lucide.createIcons();
            }, 2000);
        }
    } catch (err) {
        console.error('Save failed:', err);
        btn.innerHTML = '<i data-lucide="x"></i> Hata!';
        btn.style.background = '#dc2626';
        lucide.createIcons();
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
            lucide.createIcons();
        }, 3000);
    }
}

// Rendering
function renderBracket() {
    document.getElementById('r1-list').innerHTML = tournamentData.r1.map((team, i) => createTeamCard(team, `r1-${i}`)).join('');
    document.getElementById('qf-list').innerHTML = tournamentData.qf.map((team, i) => createTeamCard(team, `qf-${i}`)).join('');
    document.getElementById('sf-list').innerHTML = tournamentData.sf.map((team, i) => createTeamCard(team, `sf-${i}`)).join('');
    document.getElementById('f-list').innerHTML = tournamentData.f.map((team, i) => createTeamCard(team, `f-${i}`)).join('');
    document.getElementById('champion-display').textContent = tournamentData.champ;
    
    setTimeout(drawLines, 50);
}

function createTeamCard(team, id) {
    const name = team.name;
    const score = team.score;
    const isFilled = name !== "TBD";
    const scoreDisplay = score ? ` <span class="team-score">${score}</span>` : '';
    return `
        <div id="${id}" class="team-card ${isFilled ? 'filled' : ''}">
            <span class="team-name">${name}</span>${scoreDisplay}
        </div>
    `;
}

function renderAdminInputs() {
    document.getElementById('admin-r1').innerHTML = tournamentData.r1.map((val, i) => `
        <div class="input-row">
            <span class="input-num">${String(i+1).padStart(2, '0')}</span>
            <input type="text" value="${val.name === 'TBD' ? '' : val.name}" placeholder="Takım Adı" data-section="r1" data-index="${i}" data-field="name">
            <input type="text" value="${val.score}" placeholder="Skor" data-section="r1" data-index="${i}" data-field="score" class="score-input">
        </div>
    `).join('');

    document.getElementById('admin-qf').innerHTML = tournamentData.qf.map((val, i) => `
        <div class="input-row-qf">
            <input type="text" value="${val.name === 'TBD' ? '' : val.name}" placeholder="ÇF ${i+1}" data-section="qf" data-index="${i}" data-field="name">
            <input type="text" value="${val.score}" placeholder="Skor" data-section="qf" data-index="${i}" data-field="score" class="score-input">
        </div>
    `).join('');

    document.getElementById('admin-sf').innerHTML = tournamentData.sf.map((val, i) => `
        <div class="input-row-sf">
            <input type="text" value="${val.name === 'TBD' ? '' : val.name}" placeholder="YF ${i+1}" data-section="sf" data-index="${i}" data-field="name">
            <input type="text" value="${val.score}" placeholder="Skor" data-section="sf" data-index="${i}" data-field="score" class="score-input">
        </div>
    `).join('');

    document.getElementById('admin-f').innerHTML = tournamentData.f.map((val, i) => `
        <div class="input-row-f">
            <input type="text" value="${val.name === 'TBD' ? '' : val.name}" placeholder="Finalist ${i+1}" data-section="f" data-index="${i}" data-field="name">
            <input type="text" value="${val.score}" placeholder="Skor" data-section="f" data-index="${i}" data-field="score" class="score-input">
        </div>
    `).join('');

    const champInput = document.getElementById('input-champ');
    champInput.value = tournamentData.champ === 'TBD' ? '' : tournamentData.champ;
    champInput.setAttribute('data-section', 'champ');
}

function attachInputListeners() {
    let saveTimeout;
    
    document.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT' && e.target.dataset.section) {
            const section = e.target.dataset.section;
            const index = parseInt(e.target.dataset.index);
            const field = e.target.dataset.field;
            const value = e.target.value;

            if (section === 'champ') {
                tournamentData.champ = value || "TBD";
            } else {
                if (field === 'name') {
                    tournamentData[section][index].name = value || "TBD";
                } else if (field === 'score') {
                    tournamentData[section][index].score = value;
                }
            }

            renderBracket();
            
            // Auto-save to API after 1 second of inactivity
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                fetch('/api/tournament', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(tournamentData)
                }).catch(err => console.log('Auto-save failed:', err));
            }, 1000);
        }
    });
}

function drawLines() {
    const svg = document.getElementById('bracketSvg');
    const container = document.querySelector('.bracket-container');
    
    if (!container || !svg) return;

    svg.innerHTML = '';
    svg.setAttribute('width', container.scrollWidth);
    svg.setAttribute('height', container.scrollHeight);

    const containerRect = container.getBoundingClientRect();
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    const stages = [
        { prefix: 'r1', count: 16 },
        { prefix: 'qf', count: 8 },
        { prefix: 'sf', count: 4 },
        { prefix: 'f', count: 2 }
    ];

    for (let s = 0; s < stages.length - 1; s++) {
        const currentStage = stages[s];
        const nextStage = stages[s+1];
        const ratio = currentStage.count / nextStage.count;

        for (let i = 0; i < nextStage.count; i++) {
            const startIdx = i * ratio;
            const endIdx = startIdx + ratio;

            const el1 = document.getElementById(`${currentStage.prefix}-${startIdx}`);
            const el2 = document.getElementById(`${currentStage.prefix}-${endIdx - 1}`);
            const nextEl = document.getElementById(`${nextStage.prefix}-${i}`);

            if (!el1 || !el2 || !nextEl) continue;

            const rect1 = el1.getBoundingClientRect();
            const rect2 = el2.getBoundingClientRect();
            const nextRect = nextEl.getBoundingClientRect();

            const x1 = rect1.right - containerRect.left + scrollLeft;
            const y1 = rect1.top - containerRect.top + scrollTop + rect1.height / 2;
            const y2 = rect2.top - containerRect.top + scrollTop + rect2.height / 2;
            
            const nextX = nextRect.left - containerRect.left + scrollLeft;
            const nextY = nextRect.top - containerRect.top + scrollTop + nextRect.height / 2;

            const midX = x1 + (nextX - x1) / 2;

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const d = `
                M ${x1} ${y1}
                L ${midX} ${y1}
                L ${midX} ${y2}
                L ${x1} ${y2}
                M ${midX} ${(y1 + y2) / 2}
                L ${nextX} ${(y1 + y2) / 2}
                L ${nextX} ${nextY}
            `;
            
            path.setAttribute('d', d);
            path.setAttribute('stroke', 'rgba(220, 38, 38, 0.4)');
            path.setAttribute('stroke-width', '1.5');
            path.setAttribute('fill', 'none');
            path.setAttribute('class', 'line-shadow');
            
            svg.appendChild(path);
        }
    }
}
