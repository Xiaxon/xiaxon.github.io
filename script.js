// Data State
const INITIAL_DATA = {
    r1: [
        { name: "TEAM Champs", score: "0" }, 
        { name: "TEAM Joygame", score: "2" }, 
        { name: "TEAM Reckless", score: "0" },  
        { name: "TEAM Ndng", score: "2" },      
        { name: "TEAM Fofg", score: "3" }, 
        { name: "BAY Geçti", score: "0" }, 
        { name: "TEAM Boga", score: "2" }, 
        { name: "TEAM Ads", score: "0" }, 
        { name: "TEAM Vesselam", score: "2" }, 
        { name: "TEAM Lca", score: "0" },      
        { name: "TEAM Dostmeclisi", score: "2" }, 
        { name: "TEAM Legand", score: "0" },     
        { name: "TEAM Tapro", score: "2" },      
        { name: "TEAM Trebles", score: "0" },    
        { name: "TEAM Dereboyu", score: "0" },  
        { name: "TEAM 696", score: "2" }        
    ],
    qf: [
        { name: "TEAM Joygame", score: "" }, 
        { name: "TEAM Ndng", score: "" },     
        { name: "TEAM Fofg", score: "" }, 
        { name: "TEAM Boga", score: "" }, 
        { name: "TEAM Vesselam", score: "0" },    // GÜNCELLENDİ: Vesselam elendi (0)
        { name: "TEAM Dostmeclisi", score: "2" }, // GÜNCELLENDİ: Dostmeclisi kazandı (2)
        { name: "TEAM Tapro", score: "2" },       
        { name: "TEAM 696", score: "0" }         
    ],
    sf: [
        { name: "Boş", score: "" },
        { name: "Boş", score: "" },
        { name: "TEAM Dostmeclisi", score: "" }, // GÜNCELLENDİ: Dostmeclisi Yarı Final'de (index 2).
        { name: "TEAM Tapro", score: "" }         
    ],
    f: Array(2).fill(null).map(() => ({ name: "Boş", score: "" })),
    champ: "Boş"
};

const STORAGE_KEY = "cs16_tournament_data";
const AUTH_KEY = "cs16_admin_auth";
const AUTH_HASH = "6eb38a9a2d9f2b5780a8f3b09b9d9011b692993d1b87041c150f736068a6eb59";

let tournamentData = { ...INITIAL_DATA };

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderBracket();
    renderAdminInputs();
    attachInputListeners();
    checkAuth();
    lucide.createIcons();
    
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
    if (tabId === 'bracket') setTimeout(drawLines, 50);
}

// Authentication Logic
async function handleLogin(event) {
    event.preventDefault();
    const password = document.getElementById('admin-password').value;
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (hashHex === AUTH_HASH) {
        sessionStorage.setItem(AUTH_KEY, 'true');
        showAdminContent();
    } else {
        document.getElementById('login-error').textContent = 'Hatalı şifre!';
    }
}

function checkAuth() {
    if (sessionStorage.getItem(AUTH_KEY) === 'true') showAdminContent();
    else showLogin();
}

function showAdminContent() {
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-content').classList.remove('hidden');
}

function showLogin() {
    document.getElementById('admin-login').classList.remove('hidden');
    document.getElementById('admin-content').classList.add('hidden');
}

// Data Management
function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            tournamentData = JSON.parse(saved);
        } catch (e) {
            tournamentData = JSON.parse(JSON.stringify(INITIAL_DATA));
        }
    } else {
        tournamentData = JSON.parse(JSON.stringify(INITIAL_DATA));
    }
}

function saveData(btn) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tournamentData));
    renderBracket();
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

// --- OTOMATİK İLERLETME MANTIĞI ---
function getWinner(team1, team2) {
    const s1 = parseInt(team1.score);
    const s2 = parseInt(team2.score);
    if (isNaN(s1) || isNaN(s2) || s1 === s2) return null;
    return s1 > s2 ? team1.name : team2.name;
}

function updateTournamentState() {
    const stages = ['r1', 'qf', 'sf'];
    const nextStages = { 'r1': 'qf', 'qf': 'sf', 'sf': 'f' };

    stages.forEach(stage => {
        for (let i = 0; i < tournamentData[stage].length; i += 2) {
            const winner = getWinner(tournamentData[stage][i], tournamentData[stage][i+1]);
            const nextIdx = Math.floor(i / 2);
            const nextStage = nextStages[stage];

            if (winner) {
                if (tournamentData[nextStage][nextIdx].name === 'Boş' || tournamentData[nextStage][nextIdx].name === winner) {
                    tournamentData[nextStage][nextIdx].name = winner;
                }
            }
        }
    });
}

// Rendering
function renderBracket() {
    updateTournamentState();
    
    document.getElementById('r1-list').innerHTML = tournamentData.r1.map((t, i) => createTeamCard(t, `r1-${i}`)).join('');
    document.getElementById('qf-list').innerHTML = tournamentData.qf.map((t, i) => createTeamCard(t, `qf-${i}`)).join('');
    document.getElementById('sf-list').innerHTML = tournamentData.sf.map((t, i) => createTeamCard(t, `sf-${i}`)).join('');
    document.getElementById('f-list').innerHTML = tournamentData.f.map((t, i) => createTeamCard(t, `f-${i}`)).join('');
    document.getElementById('champion-display').textContent = tournamentData.champ;

    setTimeout(drawLines, 50);
}

function createTeamCard(team, id) {
    const name = team.name;
    const score = team.score;
    let isFilled = name !== "Boş" && name !== "TBD";
    const isLoser = (score === "0" || score === "00") && name !== "Boş";
    
    let style = isLoser ? 'style="opacity: 0.5;"' : '';
    if (isLoser) isFilled = false;

    return `
        <div id="${id}" class="team-card ${isFilled ? 'filled' : ''}" ${style}>
            <span class="team-name">${name}</span>
            ${score ? `<span class="team-score">${score}</span>` : ''}
        </div>
    `;
}

function renderAdminInputs() {
    const sections = ['r1', 'qf', 'sf', 'f'];
    sections.forEach(s => {
        const container = document.getElementById(`admin-${s}`);
        if(container) {
            container.innerHTML = tournamentData[s].map((val, i) => `
                <div class="input-row">
                    <input type="text" value="${val.name.includes('Boş') ? '' : val.name}" placeholder="Takım" data-section="${s}" data-index="${i}" data-field="name">
                    <input type="text" value="${val.score}" placeholder="S" data-section="${s}" data-index="${i}" data-field="score" class="score-input">
                </div>
            `).join('');
        }
    });
    document.getElementById('input-champ').value = tournamentData.champ;
}

function attachInputListeners() {
    document.addEventListener('input', (e) => {
        if (e.target.dataset.section) {
            const { section, index, field } = e.target.dataset;
            const val = e.target.value;

            if (section === 'champ') tournamentData.champ = val || "Boş";
            else tournamentData[section][index][field] = val || (field === 'name' ? 'Boş' : '');

            localStorage.setItem(STORAGE_KEY, JSON.stringify(tournamentData));
            renderBracket();
        }
    });
}

function drawLines() {
    const svg = document.getElementById('bracketSvg');
    const container = document.querySelector('.bracket-container');
    if (!svg || !container) return;
    svg.innerHTML = '';
    svg.setAttribute('width', container.scrollWidth);
    svg.setAttribute('height', container.scrollHeight);

    const stages = [
        { p: 'r1', c: 16 }, { p: 'qf', c: 8 }, { p: 'sf', c: 4 }, { p: 'f', c: 2 }
    ];

    for (let s = 0; s < stages.length - 1; s++) {
        for (let i = 0; i < stages[s+1].c; i++) {
            const el1 = document.getElementById(`${stages[s].p}-${i*2}`);
            const el2 = document.getElementById(`${stages[s].p}-${i*2+1}`);
            const nextEl = document.getElementById(`${stages[s+1].p}-${i}`);
            if (!el1 || !el2 || !nextEl) continue;

            const r1 = el1.getBoundingClientRect();
            const r2 = el2.getBoundingClientRect();
            const rn = nextEl.getBoundingClientRect();
            const cR = container.getBoundingClientRect();

            const x1 = r1.right - cR.left + container.scrollLeft;
            const y1 = r1.top - cR.top + container.scrollTop + r1.height/2;
            const y2 = r2.top - cR.top + container.scrollTop + r2.height/2;
            const nx = rn.left - cR.left + container.scrollLeft;
            const ny = rn.top - cR.top + container.scrollTop + rn.height/2;
            const mx = x1 + (nx - x1) / 2;

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', `M${x1} ${y1} L${mx} ${y1} L${mx} ${y2} L${x1} ${y2} M${mx} ${(y1+y2)/2} L${nx} ${ny}`);
            path.setAttribute('stroke', 'rgba(220, 38, 38, 0.4)');
            path.setAttribute('fill', 'none');
            svg.appendChild(path);
        }
    }
}
