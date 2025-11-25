const STORAGE_DATA_KEY = 'tournament_data';
const STORAGE_PAGE_KEY = 'tournament_page';

function showPage(id, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    const page = document.getElementById(id);
    if (page) {
        page.classList.add('active');
    }
    
    if (btn) {
        btn.classList.add('active');
    }
    
    localStorage.setItem(STORAGE_PAGE_KEY, id);
    
    if (id === 'bracket') {
        setTimeout(drawBracketLines, 100);
    }
}

function drawBracketLines() {
    const svg = document.getElementById('bracketSvg');
    const container = document.querySelector('.bracket-container');
    
    svg.innerHTML = '';
    
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;
    
    svg.setAttribute('width', container.scrollWidth);
    svg.setAttribute('height', container.scrollHeight);
    
    const stages = [
        { container: 'r1-container', count: 16 },
        { container: 'qf-container', count: 8 },
        { container: 'sf-container', count: 4 },
        { container: 'f-container', count: 2 }
    ];
    
    for (let s = 0; s < stages.length - 1; s++) {
        const currentStage = stages[s];
        const nextStage = stages[s + 1];
        const currentContainer = document.getElementById(currentStage.container);
        const nextContainer = document.getElementById(nextStage.container);
        
        if (!currentContainer || !nextContainer) continue;
        
        const teamBoxes = currentContainer.querySelectorAll('.team-box');
        const nextTeamBoxes = nextContainer.querySelectorAll('.team-box');
        
        const teamsPerMatch = currentStage.count / nextStage.count;
        
        for (let i = 0; i < nextStage.count; i++) {
            const startIdx = i * teamsPerMatch;
            const endIdx = startIdx + teamsPerMatch;
            
            const firstTeam = teamBoxes[startIdx];
            const lastTeam = teamBoxes[endIdx - 1];
            const nextTeam = nextTeamBoxes[i];
            
            if (!firstTeam || !lastTeam || !nextTeam) continue;
            
            const rect1 = firstTeam.getBoundingClientRect();
            const rect2 = lastTeam.getBoundingClientRect();
            const nextRect = nextTeam.getBoundingClientRect();
            
            const y1 = rect1.top - containerRect.top + container.scrollTop + rect1.height / 2;
            const y2 = rect2.top - containerRect.top + container.scrollTop + rect2.height / 2;
            const x1 = rect1.right - containerRect.left + container.scrollLeft;
            const nextY = nextRect.top - containerRect.top + container.scrollTop + nextRect.height / 2;
            const nextX = nextRect.left - containerRect.left + container.scrollLeft;
            
            const midX = x1 + (nextX - x1) / 2;
            
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('stroke', 'rgba(255, 255, 255, 0.3)');
            g.setAttribute('stroke-width', '0.8');
            g.setAttribute('fill', 'none');
            
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
            g.appendChild(path);
            svg.appendChild(g);
        }
    }
}

function updateBracketDisplay(data) {
    data.r1.forEach((team, i) => {
        const el = document.getElementById(`r1t${i+1}`);
        if (el) {
            el.textContent = team;
            team !== 'TBD' ? el.classList.add('filled') : el.classList.remove('filled');
        }
    });

    data.qf.forEach((team, i) => {
        const el = document.getElementById(`qf${i+1}`);
        if (el) {
            el.textContent = team;
            team !== 'TBD' ? el.classList.add('filled') : el.classList.remove('filled');
        }
    });

    data.sf.forEach((team, i) => {
        const el = document.getElementById(`sf${i+1}`);
        if (el) {
            el.textContent = team;
            team !== 'TBD' ? el.classList.add('filled') : el.classList.remove('filled');
        }
    });

    const f1 = document.getElementById('f1');
    const f2 = document.getElementById('f2');
    if (f1) {
        f1.textContent = data.f[0];
        data.f[0] !== 'TBD' ? f1.classList.add('filled') : f1.classList.remove('filled');
    }
    if (f2) {
        f2.textContent = data.f[1];
        data.f[1] !== 'TBD' ? f2.classList.add('filled') : f2.classList.remove('filled');
    }

    const champ = document.getElementById('champ');
    if (champ) {
        champ.textContent = data.champ;
    }
    
    drawBracketLines();
}

function saveTournament() {
    const data = {
        r1: Array.from({length: 16}, (_, i) => {
            const el = document.getElementById(`inR1T${i+1}`);
            return el ? (el.value || 'TBD') : 'TBD';
        }),
        qf: Array.from({length: 8}, (_, i) => {
            const el = document.getElementById(`inQF${i+1}`);
            return el ? (el.value || 'TBD') : 'TBD';
        }),
        sf: Array.from({length: 4}, (_, i) => {
            const el = document.getElementById(`inSF${i+1}`);
            return el ? (el.value || 'TBD') : 'TBD';
        }),
        f: [
            (document.getElementById('inF1')?.value || 'TBD'),
            (document.getElementById('inF2')?.value || 'TBD')
        ],
        champ: (document.getElementById('inChamp')?.value || 'TBD')
    };

    updateBracketDisplay(data);
    localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(data));

    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '✓ Kaydedildi';
    btn.disabled = true;
    
    setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
    }, 2000);
}

function loadTournamentData() {
    const saved = localStorage.getItem(STORAGE_DATA_KEY);
    
    if (saved) {
        try {
            const data = JSON.parse(saved);
            
            data.r1.forEach((team, i) => {
                const el = document.getElementById(`inR1T${i+1}`);
                if (el) el.value = team === 'TBD' ? '' : team;
            });
            
            data.qf.forEach((team, i) => {
                const el = document.getElementById(`inQF${i+1}`);
                if (el) el.value = team === 'TBD' ? '' : team;
            });
            
            data.sf.forEach((team, i) => {
                const el = document.getElementById(`inSF${i+1}`);
                if (el) el.value = team === 'TBD' ? '' : team;
            });
            
            const f1 = document.getElementById('inF1');
            const f2 = document.getElementById('inF2');
            const champ = document.getElementById('inChamp');
            
            if (f1) f1.value = data.f[0] === 'TBD' ? '' : data.f[0];
            if (f2) f2.value = data.f[1] === 'TBD' ? '' : data.f[1];
            if (champ) champ.value = data.champ === 'TBD' ? '' : data.champ;
            
            updateBracketDisplay(data);
        } catch (e) {
            console.error('Error loading tournament data:', e);
        }
    }
}

function initializeUI() {
    const page = localStorage.getItem(STORAGE_PAGE_KEY) || 'bracket';
    const btn = document.querySelector(`button[onclick="showPage('${page}', this)"]`);
    
    if (btn) {
        showPage(page, btn);
    } else {
        const defaultBtn = document.querySelector('nav button:first-child');
        if (defaultBtn) {
            showPage('bracket', defaultBtn);
        }
    }
}

window.addEventListener('resize', () => {
    if (document.getElementById('bracket')?.classList.contains('active')) {
        drawBracketLines();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    loadTournamentData();
    initializeUI();
});
