// ===== 核心狀態與資料設定 =====
const STORAGE_KEY = 'habitualApp'; 
const NOTES_STORAGE_KEY = 'habitual_notes'; 

let appData = {
    checkins: [],  
    mistakes: [],  
    settings: {
        dailyGoal: 30,
        theme: 'light'
    }
};

let savedNotes = [
    { type: 'update', text: '✨ 在編輯 GitHub 程式時要記得按鉛筆 ✏️ 進入編輯狀態！' }
];

const quotes = [
    "「卓越不是一種行為，而是一種習慣。」 - 亞里斯多德",
    "「不積跬步，無以至千里；不積小流，無以成江海。」",
    "「投資知識，投資大腦，利息最高。」 - 班傑明·富蘭克林",
    "「每天進步一點點，持續的力量是驚人的。」"
];

let currentFlashcardIndex = -1;

document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    loadData();
    applyTheme();
    setupNavigation();
    setupForms();
    setupQuickNotesForm(); 
    setDailyQuote();
    renderAll();
}

// ===== 資料管理 (LocalStorage) =====
function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            appData = JSON.parse(saved);
            if (!appData.settings) appData.settings = { dailyGoal: 30, theme: 'light' };
        } catch (e) { console.error("資料載入錯誤", e); }
    }

    const savedNotesData = localStorage.getItem(NOTES_STORAGE_KEY);
    if (savedNotesData) {
        try {
            savedNotes = JSON.parse(savedNotesData);
        } catch (e) { console.error("筆記載入錯誤", e); }
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    renderAll(); 
}

function saveNotesData() {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(savedNotes));
    renderQuickNotes(); 
}

// ===== 介面導覽與基礎設定 =====
function setupNavigation() {
    const links = document.querySelectorAll('.nav-links li');
    const sections = document.querySelectorAll('.page-section');
    const mobileToggle = document.getElementById('mobile-toggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    function closeMobileMenu() {
        sidebar.classList.remove('open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    }

    links.forEach(link => {
        link.addEventListener('click', () => {
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            const targetId = link.getAttribute('data-target');
            sections.forEach(sec => {
                sec.classList.remove('active');
                if (sec.id === targetId) sec.classList.add('active');
            });
            
            if (targetId === 'reports') {
                renderReports(); 
                renderCharts();
            }

            if(window.innerWidth <= 768) {
                closeMobileMenu();
            }
        });
    });

    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            if (sidebarOverlay) sidebarOverlay.classList.toggle('active', sidebar.classList.contains('open'));
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeMobileMenu);
    }
}

function setDailyQuote() {
    const quoteEl = document.getElementById('daily-quote');
    if (quoteEl) {
        const todayIndex = new Date().getDay() % quotes.length;
        quoteEl.innerText = quotes[todayIndex];
    }
}

function applyTheme() {
    if (appData.settings.theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

function renderAll() {
    renderDashboard();
    renderLogs();
    renderMistakes();
    renderHeatmap();
    renderQuickNotes(); 
    renderReports();    
    renderCharts();     
    updateMistakeFilters();
    
    const today = new Date().toISOString().split('T')[0];
    if(document.getElementById('checkin-date')) document.getElementById('checkin-date').value = today;
    if(document.getElementById('mistake-date')) document.getElementById('mistake-date').value = today;
    if(document.getElementById('setting-goal')) document.getElementById('setting-goal').value = appData.settings.dailyGoal;
}

function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

function calculateStreak() {
    let dates = appData.checkins.map(c => c.date).sort().reverse();
    dates = [...new Set(dates)];
    
    if (dates.length === 0) return 0;
    
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0,0,0,0);
    
    let lastRecordDate = new Date(dates[0]);
    lastRecordDate.setHours(0,0,0,0);
    const diffTime = Math.abs(currentDate - lastRecordDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 1) return 0;
    
    let expectedDate = new Date(dates[0]);
    for (let d of dates) {
        let recordD = new Date(d);
        if (recordD.getTime() === expectedDate.getTime()) {
            streak++;
            expectedDate.setDate(expectedDate.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

// ===== Dashboard 邏輯 =====
function renderDashboard() {
    const today = getTodayString();
    const todayLogs = appData.checkins.filter(c => c.date === today);
    const todayTime = todayLogs.reduce((sum, c) => sum + parseInt(c.time || 0), 0);
    
    const statusEl = document.getElementById('dash-status');
    if (statusEl) {
        if (todayLogs.length > 0) {
            statusEl.innerText = '✅ 已打卡';
            statusEl.className = 'stat-value text-blue';
        } else {
            statusEl.innerText = '❌ 未打卡';
            statusEl.className = 'stat-value text-red';
        }
    }

    const streakEl = document.getElementById('dash-streak');
    if (streakEl) streakEl.innerHTML = `${calculateStreak()} 天 <i class="fa-solid fa-fire"></i>`;
    
    const totalTime = appData.checkins.reduce((sum, c) => sum + parseInt(c.time || 0), 0);
    const timeEl = document.getElementById('dash-time');
    if (timeEl) timeEl.innerText = `${totalTime} 分鐘`;

    const goal = appData.settings.dailyGoal;
    const progressText = document.getElementById('dash-progress-text');
    const progressBar = document.getElementById('dash-progress');
    if (progressText && progressBar) {
        progressText.innerText = `${todayTime} / ${goal} 分鐘`;
        let percent = Math.min((todayTime / goal) * 100, 100);
        progressBar.style.width = `${percent}%`;
    }

    const recentLogs = [...appData.checkins].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
    const logsHtml = recentLogs.map(l => `<li><span>${l.date}</span> <span>${l.content} (${l.time}m)</span></li>`).join('');
    const recentLogsEl = document.getElementById('dash-recent-logs');
    if (recentLogsEl) recentLogsEl.innerHTML = logsHtml || '<li>尚無紀錄</li>';

    const recentMistakes = [...appData.mistakes].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
    const misHtml = recentMistakes.map(m => `<li><span>[${m.lang}]</span> <span>${m.q}</span></li>`).join('');
    const recentMistakesEl = document.getElementById('dash-recent-mistakes');
    if (recentMistakesEl) recentMistakesEl.innerHTML = misHtml || '<li>尚無錯題</li>';
}

// ===== 表單與事件處理 =====
function setupForms() {
    document.getElementById('checkin-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const newRecord = {
            id: Date.now(),
            date: document.getElementById('checkin-date').value,
            content: document.getElementById('checkin-content').value,
            time: document.getElementById('checkin-time').value,
            note: document.getElementById('checkin-note').value
        };
        appData.checkins.push(newRecord);
        saveData();
        e.target.reset();
        document.getElementById('checkin-date').value = getTodayString();
        alert('打卡成功！持續累積！');
    });

    document.getElementById('mistake-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const newMistake = {
            id: Date.now(),
            lang: document.getElementById('mistake-lang').value,
            date: document.getElementById('mistake-date').value,
            q: document.getElementById('mistake-q').value,
            myans: document.getElementById('mistake-myans').value,
            correct: document.getElementById('mistake-correct').value,
            reason: document.getElementById('mistake-reason').value
        };
        appData.mistakes.push(newMistake);
        saveData();
        e.target.reset();
        document.getElementById('mistake-date').value = getTodayString();
        alert('紀錄新增成功！');
    });

    document.getElementById('search-logs')?.addEventListener('input', renderLogs);
    document.getElementById('search-mistakes')?.addEventListener('input', renderMistakes);
    document.getElementById('filter-mistakes')?.addEventListener('change', renderMistakes);

    document.getElementById('btn-toggle-theme')?.addEventListener('click', () => {
        appData.settings.theme = appData.settings.theme === 'light' ? 'dark' : 'light';
        applyTheme();
        saveData();
    });

    document.getElementById('btn-save-goal')?.addEventListener('click', () => {
        const goal = document.getElementById('setting-goal').value;
        appData.settings.dailyGoal = parseInt(goal) || 30;
        saveData();
        alert('每日目標已更新！');
    });

    document.getElementById('btn-export')?.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "Habitual_Backup.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    document.getElementById('file-import')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const importedData = JSON.parse(event.target.result);
                if(importedData.checkins && importedData.mistakes) {
                    appData = importedData;
                    saveData();
                    alert('資料匯入成功！');
                } else {
                    alert('無效的備份檔案格式。');
                }
            } catch(err) {
                alert('匯入失敗，檔案可能損毀。');
            }
        };
        reader.readAsText(file);
    });

    document.getElementById('flashcard')?.addEventListener('click', toggleFlashcard);
    document.getElementById('btn-show-answer')?.addEventListener('click', toggleFlashcard);
    document.getElementById('btn-next-card')?.addEventListener('click', loadRandomFlashcard);
    document.querySelector('[data-target="review"]')?.addEventListener('click', loadRandomFlashcard);
}

function setupQuickNotesForm() {
    const noteForm = document.getElementById('note-form');
    if (noteForm) {
        noteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const type = document.getElementById('note-type').value;
            const noteTextInput = document.getElementById('note-text');
            const text = noteTextInput.value.trim();
            const prefix = type === 'update' ? '✨ ' : '📖 ';

            if (text) {
                savedNotes.push({ type: type, text: prefix + text });
                saveNotesData(); 
                noteTextInput.value = ''; 
            }
        });
    }
}

function renderQuickNotes() {
    const updateList = document.getElementById('update-list');
    const memoList = document.getElementById('memo-list');
    if (!updateList || !memoList) return; 

    updateList.innerHTML = '';
    memoList.innerHTML = '';
    let hasUpdate = false;
    let hasMemo = false;

    savedNotes.forEach((note, index) => {
        const li = document.createElement('li');
        li.style.padding = '8px 0';
        li.style.borderBottom = '1px solid rgba(0,0,0,0.05)';
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        li.innerHTML = `
            <span>${note.text}</span>
            <button class="btn-delete-note" data-index="${index}" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0 5px;">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        `;

        if (note.type === 'update' || note.type === 'reminder') { 
            updateList.appendChild(li);
            hasUpdate = true;
        } else {
            memoList.appendChild(li);
            hasMemo = true;
        }
    });

    if (!hasUpdate) updateList.innerHTML = '<li style="padding: 8px 0; color: gray;">💡 目前尚無待更新或優化想法。</li>';
    if (!hasMemo) memoList.innerHTML = '<li style="padding: 8px 0; color: gray;">💡 目前尚無學習備忘紀錄。</li>';

    document.querySelectorAll('.btn-delete-note').forEach(btn => {
        btn.onclick = (e) => {
            const indexToRemove = e.currentTarget.getAttribute('data-index');
            savedNotes.splice(indexToRemove, 1);
            saveNotesData();
        };
    });
}

function renderLogs() {
    const container = document.getElementById('logs-timeline');
    if (!container) return;
    const keyword = document.getElementById('search-logs')?.value.toLowerCase() || '';
    
    let filtered = [...appData.checkins].sort((a,b) => new Date(b.date) - new Date(a.date));
    if (keyword) {
        filtered = filtered.filter(l => l.content.toLowerCase().includes(keyword) || (l.note && l.note.toLowerCase().includes(keyword)));
    }
    container.innerHTML = filtered.length ? '' : '<p class="text-gray">無相符紀錄。</p>';
    
    filtered.forEach(log => {
        const div = document.createElement('div');
        div.className = 'log-item card';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <div>
                    <h4 style="font-size:1rem;">${log.date} - ${log.content}</h4>
                    <p style="color:gray; margin-top:3px; font-size:0.85rem;"><i class="fa-regular fa-clock"></i> ${log.time} 分鐘 | 備註: ${log.note || '無'}</p>
                </div>
                <button class="btn" style="background-color:#ef4444; padding:4px 8px; font-size:0.85rem;" onclick="deleteData('checkins', ${log.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderMistakes() {
    const container = document.getElementById('mistakes-list');
    if (!container) return;
    const keyword = document.getElementById('search-mistakes')?.value.toLowerCase() || '';
    const langFilter = document.getElementById('filter-mistakes')?.value || '';

    let filtered = [...appData.mistakes].sort((a,b) => new Date(b.date) - new Date(a.date));
    if (keyword) filtered = filtered.filter(m => m.q.toLowerCase().includes(keyword) || m.reason.toLowerCase().includes(keyword));
    if (langFilter) filtered = filtered.filter(m => m.lang === langFilter);

    container.innerHTML = filtered.length ? '' : '<p class="text-gray">無相符紀錄。</p>';

    filtered.forEach(m => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:start; flex-direction:column; gap:6px; position:relative;">
                <span class="badge-blue" style="padding:2px 6px; font-size:0.75rem; border-radius:4px;">${m.lang} (${m.date})</span>
                <h4 style="margin-top:3px; font-size:1rem;">盲點：${m.q}</h4>
                <p class="text-red" style="font-size:0.9rem;">舊理解：${m.myans || '未填'}</p>
                <p class="text-green" style="font-size:0.9rem;">正確答案：${m.correct}</p>
                <p style="font-size:0.9rem; color: var(--text-muted);"><strong>解析：</strong>${m.reason}</p>
                <button class="btn" style="background-color:#ef4444; padding:3px 6px; font-size:0.8rem; position:absolute; right:0; top:0;" onclick="deleteData('mistakes', ${m.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        container.appendChild(div);
    });
}

function updateMistakeFilters() {
    const filterSelect = document.getElementById('filter-mistakes');
    if (!filterSelect) return;
    const langs = [...new Set(appData.mistakes.map(m => m.lang))];
    filterSelect.innerHTML = '<option value="">所有科目</option>';
    langs.forEach(lang => {
        if(lang) filterSelect.innerHTML += `<option value="${lang}">${lang}</option>`;
    });
}

function deleteData(type, id) {
    if (confirm('確定要刪除此筆紀錄嗎？')) {
        appData[type] = appData[type].filter(item => item.id !== id);
        saveData();
    }
}

// ===== 🎴 隨機複習閃卡 =====
function loadRandomFlashcard() {
    const contentEl = document.getElementById('flashcard-content');
    const answerEl = document.getElementById('flashcard-answer');
    if (!contentEl || !answerEl) return;

    answerEl.classList.add('hidden'); 

    if (appData.mistakes.length === 0) {
        contentEl.innerHTML = '<p class="text-gray">目前沒有紀錄可以複習，先去新增一些吧！</p>';
        currentFlashcardIndex = -1;
        return;
    }

    const randIndex = Math.floor(Math.random() * appData.mistakes.length);
    currentFlashcardIndex = randIndex;
    const card = appData.mistakes[randIndex];

    contentEl.innerHTML = `
        <span class="badge-blue" style="padding:2px 6px; font-size:0.75rem; border-radius:4px;">${card.lang}</span>
        <h3 style="margin-top:10px; font-size:1.15rem;">🎯 核心問題：${card.q}</h3>
        <p class="text-gray" style="margin-top:8px; font-size:0.85rem;"><i class="fa-solid fa-pointer"></i> 點擊卡片或下方按鈕顯示答案</p>
    `;

    document.getElementById('fc-correct').innerText = card.correct;
    document.getElementById('fc-myans').innerText = card.myans || '未填';
    document.getElementById('fc-reason').innerText = card.reason;
}

function toggleFlashcard() {
    const answerEl = document.getElementById('flashcard-answer');
    if (answerEl && currentFlashcardIndex !== -1) {
        answerEl.classList.toggle('hidden');
    }
}

// ===== 📊 圖表與報告 =====
function renderHeatmap() {
    const heatmapContainer = document.getElementById('heatmap');
    if (!heatmapContainer) return;
    heatmapContainer.innerHTML = '';
    for(let i=0; i<35; i++) { 
        const box = document.createElement('div');
        box.style.width = '11px';
        box.style.height = '11px';
        box.style.backgroundColor = appData.checkins.length > 0 ? '#63BCE0' : (appData.settings.theme === 'dark' ? '#374151' : '#e5e7eb');
        box.style.borderRadius = '2px';
        box.style.display = 'inline-block';
        box.style.margin = '2px';
        heatmapContainer.appendChild(box);
    }
}

function renderCharts() {
    const ctx = document.getElementById('timeChart');
    if (!ctx) return;
    if (window.myDailyChart) window.myDailyChart.destroy();

    const labels = [];
    const dataset = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        labels.push(dateStr.slice(5)); 
        const logs = appData.checkins.filter(c => c.date === dateStr);
        const mins = logs.reduce((sum, c) => sum + parseInt(c.time || 0), 0);
        dataset.push(Math.round((mins / 60) * 10) / 10);
    }

    if (typeof Chart !== 'undefined') {
        window.myDailyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '學習時間 (小時)', 
                    data: dataset,
                    backgroundColor: '#63BCE0',
                    borderRadius: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: '小時 (h)' } }
                }
            }
        });
    }
}

function renderReports() {
    const weekDaysEl = document.getElementById('report-week-days');
    const weekTimeEl = document.getElementById('report-week-time');
    const monthRateEl = document.getElementById('report-month-rate');
    const topLangEl = document.getElementById('report-top-lang');
    const reportMessageEl = document.getElementById('report-message');

    if (!weekDaysEl) return; 

    const today = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;
    let weekTimeSum = 0;
    let weekCheckedDates = new Set();
    
    for (let i = 0; i < 7; i++) {
        const d = new Date(today.getTime() - (i * oneDayMs));
        const dateStr = d.toISOString().split('T')[0];
        const dayLogs = appData.checkins.filter(c => c.date === dateStr);
        if (dayLogs.length > 0) {
            weekCheckedDates.add(dateStr);
            weekTimeSum += dayLogs.reduce((sum, c) => sum + parseInt(c.time || 0), 0);
        }
    }
    
    weekDaysEl.innerText = `${weekCheckedDates.size} / 7 天`;
    weekTimeEl.innerText = `${Math.round((weekTimeSum / 60) * 10) / 10} 小時`;

    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); 
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    let monthCheckedDates = new Set();
    appData.checkins.forEach(c => {
        if (c.date) {
            const cParts = c.date.split('-'); 
            if (parseInt(cParts[0]) === currentYear && parseInt(cParts[1]) === (currentMonth + 1)) {
                monthCheckedDates.add(c.date);
            }
        }
    });
    
    monthRateEl.innerText = `${Math.round((monthCheckedDates.size / totalDaysInMonth) * 100)}%`;

    if (appData.mistakes && appData.mistakes.length > 0) {
        const langCounts = {};
        appData.mistakes.forEach(m => { if (m.lang) langCounts[m.lang] = (langCounts[m.lang] || 0) + 1; });
        let topLang = '無資料', maxCount = 0;
        for (let lang in langCounts) { if (langCounts[lang] > maxCount) { maxCount = langCounts[lang]; topLang = lang; } }
        if (topLangEl) topLangEl.innerText = topLang;
    } else {
        if (topLangEl) topLangEl.innerText = '無資料';
    }

    if (reportMessageEl) {
        if (weekCheckedDates.size >= 5) {
            reportMessageEl.innerText = "🔥 太強了！這週你的好習慣堅不可摧，簡直就是自律大師，繼續保持！";
            reportMessageEl.style.backgroundColor = "rgba(99, 188, 224, 0.08)";
            reportMessageEl.style.color = "#63BCE0";
        } else if (weekCheckedDates.size >= 1) {
            reportMessageEl.innerText = "💪 棒極了！每一步前進都在累積實力，這週也一起讓習慣成自然吧！";
            reportMessageEl.style.backgroundColor = "rgba(122, 197, 240, 0.08)";
            reportMessageEl.style.color = "#7AC5F0";
        } else {
            reportMessageEl.innerText = "🌱 優秀是一種習慣。今天就是重新啟航的好日子，立刻出發打卡吧！";
            reportMessageEl.style.backgroundColor = "rgba(229, 231, 235, 0.2)";
            reportMessageEl.style.color = "var(--text-muted)";
        }
    }
}