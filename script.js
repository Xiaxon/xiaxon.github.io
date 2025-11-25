// Data State
const INITIAL_DATA = {
    r1: Array(16).fill(null).map(() => ({ name: "Boş", score: "" })),
    qf: Array(8).fill(null).map(() => ({ name: "Boş", score: "" })),
    sf: Array(4).fill(null).map(() => ({ name: "Boş", score: "" })),
    f: Array(2).fill(null).map(() => ({ name: "Boş", score: "" })),
    champ: "Boş"
};

const STORAGE_KEY = "cs16_tournament_data";
const AUTH_KEY = "cs16_admin_auth";
// SHA-256 Hash of "ravza2025."
const AUTH_HASH = "6eb38a9a2d9f2b5780a8f3b09b9d9011b692993d1b87041c150f736068a6eb59";

let tournamentData = { ...INITIAL_DATA };

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderBracket();
    renderAdminInputs();
    attachInputListeners();
    checkAuth(); // Check if already logged in
    lucide.createIcons();
    
    // Resize listener for svg lines
    window.addEventListener('resize', () => {
        if(document.getElementById('bracket').classList.contains('active')) {
            drawLines();
        }
    });
});

// Tab Switching
function switchTab(tabId, btn) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    // Show selected
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

    // Client-side hashing
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
    const icon = document.querySelector('.toggle-password i');
    
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}

// Data Management
function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            tournamentData = {
                r1: parsed.r1 || INITIAL_DATA.r1,
                qf: parsed.qf || INITIAL_DATA.qf,
                sf: parsed.sf || INITIAL_DATA.sf,
                f: parsed.f || INITIAL_DATA.f,
                champ: parsed.champ || "TBD"
            };
        } catch (e) {
            console.error("Parse error", e);
            tournamentData = JSON.parse(JSON.stringify(INITIAL_DATA));
        }
    } else {
        tournamentData = JSON.parse(JSON.stringify(INITIAL_DATA));
    }
}

function saveData(btn) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tournamentData));
    
    // Update UI
    renderBracket();
    
    // Feedback
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="check"></i> Kaydedildi';
    btn.style.background = '#16a34a';
    lucide.createIcons();
    
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.background = '';
        lucide.createIcons();
    }, 2000);
}

// Rendering
function renderBracket() {
    // Fill Round of 16
    const r1List = document.getElementById('r1-list');
    r1List.innerHTML = tournamentData.r1.map((team, i) => createTeamCard(team, `r1-${i}`)).join('');

    // Fill Quarter Finals
    const qfList = document.getElementById('qf-list');
    qfList.innerHTML = tournamentData.qf.map((team, i) => createTeamCard(team, `qf-${i}`)).join('');

    // Fill Semi Finals
    const sfList = document.getElementById('sf-list');
    sfList.innerHTML = tournamentData.sf.map((team, i) => createTeamCard(team, `sf-${i}`)).join('');

    // Fill Finals
    const fList = document.getElementById('f-list');
    fList.innerHTML = tournamentData.f.map((team, i) => createTeamCard(team, `f-${i}`)).join('');

    // Fill Champion
    document.getElementById('champion-display').textContent = tournamentData.champ;

    // Draw lines
    setTimeout(drawLines, 50);
}

function createTeamCard(team, id) {
    const name = typeof team === 'string' ? team : team.name;
    const score = typeof team === 'string' ? '' : team.score;
    const isFilled = name !== "TBD";
    const scoreDisplay = score ? ` <span class="team-score">${score}</span>` : '';
    return `
        <div id="${id}" class="team-card ${isFilled ? 'filled' : ''}">
            <span class="team-name">${name}</span>${scoreDisplay}
        </div>
    `;
}

function renderAdminInputs() {
    // R1 Inputs
    const r1Container = document.getElementById('admin-r1');
    r1Container.innerHTML = tournamentData.r1.map((val, i) => `
        <div class="input-row">
            <span class="input-num">${String(i+1).padStart(2, '0')}</span>
            <input type="text" value="${val.name === 'TBD' ? '' : val.name}" placeholder="Takım Adı" data-section="r1" data-index="${i}" data-field="name">
            <input type="text" value="${val.score}" placeholder="Skor" data-section="r1" data-index="${i}" data-field="score" class="score-input">
        </div>
    `).join('');

    // QF Inputs
    const qfContainer = document.getElementById('admin-qf');
    qfContainer.innerHTML = tournamentData.qf.map((val, i) => `
        <div class="input-row-qf">
            <input type="text" value="${val.name === 'TBD' ? '' : val.name}" placeholder="ÇF ${i+1}" data-section="qf" data-index="${i}" data-field="name">
            <input type="text" value="${val.score}" placeholder="Skor" data-section="qf" data-index="${i}" data-field="score" class="score-input">
        </div>
    `).join('');

    // SF Inputs
    const sfContainer = document.getElementById('admin-sf');
    sfContainer.innerHTML = tournamentData.sf.map((val, i) => `
        <div class="input-row-sf">
            <input type="text" value="${val.name === 'TBD' ? '' : val.name}" placeholder="YF ${i+1}" data-section="sf" data-index="${i}" data-field="name">
            <input type="text" value="${val.score}" placeholder="Skor" data-section="sf" data-index="${i}" data-field="score" class="score-input">
        </div>
    `).join('');

    // F Inputs
    const fContainer = document.getElementById('admin-f');
    fContainer.innerHTML = tournamentData.f.map((val, i) => `
        <div class="input-row-f">
            <input type="text" value="${val.name === 'TBD' ? '' : val.name}" placeholder="Finalist ${i+1}" data-section="f" data-index="${i}" data-field="name">
            <input type="text" value="${val.score}" placeholder="Skor" data-section="f" data-index="${i}" data-field="score" class="score-input">
        </div>
    `).join('');

    // Champ Input
    const champInput = document.getElementById('input-champ');
    champInput.value = tournamentData.champ === 'TBD' ? '' : tournamentData.champ;
    champInput.setAttribute('data-section', 'champ');
}

function attachInputListeners() {
    // Listen for all input changes
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

            // Update localStorage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tournamentData));

            // Update bracket in real-time
            renderBracket();
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

            // Create Path
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
