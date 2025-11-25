// Data State
const INITIAL_DATA = {
    r1: Array(16).fill("TBD"),
    qf: Array(8).fill("TBD"),
    sf: Array(4).fill("TBD"),
    f: Array(2).fill("TBD"),
    champ: "TBD"
};

const STORAGE_KEY = "cs16_tournament_data";
let tournamentData = { ...INITIAL_DATA };

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderBracket();
    renderAdminInputs();
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

// Data Management
function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            tournamentData = JSON.parse(saved);
        } catch (e) {
            console.error("Parse error", e);
        }
    }
}

function saveData(btn) {
    // Collect data from inputs
    const r1Inputs = document.querySelectorAll('#admin-r1 input');
    const qfInputs = document.querySelectorAll('#admin-qf input');
    const sfInputs = document.querySelectorAll('#admin-sf input');
    const fInputs = document.querySelectorAll('#admin-f input');
    const champInput = document.getElementById('input-champ');

    tournamentData.r1 = Array.from(r1Inputs).map(i => i.value || "TBD");
    tournamentData.qf = Array.from(qfInputs).map(i => i.value || "TBD");
    tournamentData.sf = Array.from(sfInputs).map(i => i.value || "TBD");
    tournamentData.f = Array.from(fInputs).map(i => i.value || "TBD");
    tournamentData.champ = champInput.value || "TBD";

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

function createTeamCard(name, id) {
    const isFilled = name !== "TBD";
    return `
        <div id="${id}" class="team-card ${isFilled ? 'filled' : ''}">
            ${name}
        </div>
    `;
}

function renderAdminInputs() {
    // R1 Inputs
    const r1Container = document.getElementById('admin-r1');
    r1Container.innerHTML = tournamentData.r1.map((val, i) => `
        <div class="input-row">
            <span class="input-num">${String(i+1).padStart(2, '0')}</span>
            <input type="text" value="${val === 'TBD' ? '' : val}" placeholder="Takım Adı">
        </div>
    `).join('');

    // QF Inputs
    const qfContainer = document.getElementById('admin-qf');
    qfContainer.innerHTML = tournamentData.qf.map((val, i) => `
        <input type="text" value="${val === 'TBD' ? '' : val}" placeholder="ÇF ${i+1}">
    `).join('');

    // SF Inputs
    const sfContainer = document.getElementById('admin-sf');
    sfContainer.innerHTML = tournamentData.sf.map((val, i) => `
        <input type="text" value="${val === 'TBD' ? '' : val}" placeholder="YF ${i+1}">
    `).join('');

    // F Inputs
    const fContainer = document.getElementById('admin-f');
    fContainer.innerHTML = tournamentData.f.map((val, i) => `
        <input type="text" value="${val === 'TBD' ? '' : val}" placeholder="Finalist ${i+1}">
    `).join('');

    // Champ Input
    const champInput = document.getElementById('input-champ');
    champInput.value = tournamentData.champ === 'TBD' ? '' : tournamentData.champ;
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
