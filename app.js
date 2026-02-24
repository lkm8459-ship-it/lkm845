// ===== V2 STATE =====
let sessionStartTime = null;
let sessionEndTime = null;
let mainTimerInterval = null;
let pullupCount = 0;
let currentWeightDot = null;

function formatTime(d) {
    return (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
}

// V2.2: Workout Timer Button Logic
function updateMainTimerDisplay() {
    const btn = document.getElementById('workoutStartBtn');
    if (!sessionStartTime) {
        btn.innerHTML = `<span>🏋️</span> 운동 시작하기`;
        btn.className = 'workout-start-btn';
        return;
    }

    // Running
    const now = new Date();
    const diffMs = now - sessionStartTime;
    const diffMin = Math.floor(diffMs / 60000);
    const diffSec = Math.floor((diffMs % 60000) / 1000);
    const st = formatTime(sessionStartTime);

    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    let elapsedStr = '';
    if (h > 0) elapsedStr += h + '시간 ';
    elapsedStr += String(m).padStart(2, '0') + '분 ' + String(diffSec).padStart(2, '0') + '초';

    // 텍스트 간소화 (예: 22:15 (00분 00초))
    btn.innerHTML = `<span class="glow-icon">⏱️</span> ${st} <span>(${elapsedStr})</span>`;
    btn.className = 'workout-start-btn active';
}

function toggleWorkoutTimer() {
    if (sessionStartTime) {
        if (confirm('운동 타이머를 초기화하시겠습니까?')) {
            sessionStartTime = null;
            clearInterval(mainTimerInterval);
            try { localStorage.removeItem('wm_session'); } catch (e) { }
            updateMainTimerDisplay();
        }
    } else {
        sessionStartTime = new Date();
        try { localStorage.setItem('wm_session', JSON.stringify({ ts: sessionStartTime.getTime() })); } catch (e) { }
        updateMainTimerDisplay();
        mainTimerInterval = setInterval(updateMainTimerDisplay, 1000);
    }
}

// Initialize session
(function initSession() {
    try {
        const saved = localStorage.getItem('wm_session');
        const HOURS_12 = 12 * 60 * 60 * 1000;
        // 과거 완료 상태(오렌지색 버튼) 잔재 삭제
        localStorage.removeItem('wm_session_finished');

        if (saved) {
            const data = JSON.parse(saved);
            if (Date.now() - data.ts < HOURS_12) {
                sessionStartTime = new Date(data.ts);
                mainTimerInterval = setInterval(updateMainTimerDisplay, 1000);
            } else {
                localStorage.removeItem('wm_session');
            }
        }
    } catch (e) { }
    updateMainTimerDisplay();
})();

// ===== DAILY TIPS =====
const dailyTips = {
    pullup: { icon: '💜', title: '턱걸이 체킹!', msg: '+1, +3, +5 버튼으로 오늘의 턱걸이 개수를 채워보세요!' },
    mon: { icon: '💪', title: '상체 폭발의 날!', msg: '견갑 패킹에 집중하고, 턱걸이 20개를 향해 전진!' },
    tue: { icon: '🧘', title: '회복이 곧 성장', msg: '천천히 호흡하며 코어를 깨워주세요.' },
    wed: { icon: '🦵', title: '골반 수평 유지!', msg: '짧은 다리부터 시작. 편측성 운동에 집중!' },
    thu: { icon: '🧘', title: '통증 없는 범위에서', msg: '무리하지 말고, 호흡과 함께 이완하세요.' },
    fri: { icon: '🔥', title: '불금 오운완!', msg: '한 주의 마지막 에너지를 모두 쏟으세요!' }
};

function updateDailyTip(day) {
    const tip = dailyTips[day];
    if (tip) {
        document.getElementById('tipIcon').textContent = tip.icon;
        document.getElementById('tipText').innerHTML = '<b>' + tip.title + '</b> — ' + tip.msg;
    }
}

// ===== TAB SWITCHING =====
document.getElementById('tabBar').addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var day = btn.getAttribute('data-day');
    document.querySelectorAll('.tab-bar button').forEach(b => b.classList.remove('on'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('on'));
    btn.classList.add('on');
    document.getElementById(day).classList.add('on');
    updateDailyTip(day);
    btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    try { localStorage.setItem('wm_tab', day); } catch (e) { }
});

// Restore tab
try {
    var saved = localStorage.getItem('wm_tab');
    if (saved && document.getElementById(saved)) {
        document.querySelectorAll('.tab-bar button').forEach(b => b.classList.remove('on'));
        document.querySelectorAll('.page').forEach(p => p.classList.remove('on'));
        document.getElementById(saved).classList.add('on');
        document.querySelector('[data-day="' + saved + '"]').classList.add('on');
    }
} catch (e) { }

var activeDay = document.querySelector('.tab-bar button.on');
if (activeDay) updateDailyTip(activeDay.getAttribute('data-day'));

// ===== V2: WEIGHT INPUT via DOT CLICK =====
function tog(el) {
    if (el.classList.contains('done')) {
        el.classList.remove('done');
        el.querySelector('.dot-kg')?.remove();
        saveChecks();
        return;
    }
    const page = el.closest('.page');
    const pageId = page ? page.id : '';
    const isStrengthDay = ['mon', 'wed', 'fri'].includes(pageId);

    if (isStrengthDay) {
        const exCard = el.closest('.ex');
        const exName = exCard ? (exCard.querySelector('.ex-name')?.textContent || '') : '';
        // 턱걸이/딥스는 자체중량 → 무게 입력 불필요
        const bodyweightExercises = ['턱걸이', '딥스'];
        const isBodyweight = bodyweightExercises.some(bw => exName.includes(bw));

        if (isBodyweight) {
            el.classList.add('done');
            saveChecks();
            return;
        }

        currentWeightDot = el;
        const dotNum = el.textContent.trim().replace(/[^0-9]/g, '');
        document.getElementById('wmTitle').textContent = exName;
        document.getElementById('wmSet').textContent = '세트 ' + dotNum;

        // 이전 세트 무게를 자동 프리필
        let prevWeight = '';
        const dots = exCard ? Array.from(exCard.querySelectorAll('.dot')) : [];
        const myIndex = dots.indexOf(el);
        for (let i = myIndex - 1; i >= 0; i--) {
            const kg = dots[i].querySelector('.dot-kg');
            if (kg) { prevWeight = kg.textContent.replace('kg', ''); break; }
        }
        document.getElementById('wmInput').value = prevWeight;

        document.getElementById('weightOverlay').style.display = 'flex';
        setTimeout(() => document.getElementById('wmInput').focus(), 100);
    } else {
        el.classList.add('done');
        saveChecks();
    }
}

function confirmWeight() {
    if (!currentWeightDot) return;
    const val = document.getElementById('wmInput').value;
    currentWeightDot.classList.add('done');
    // Remove old kg label if exists
    currentWeightDot.querySelector('.dot-kg')?.remove();
    if (val && parseFloat(val) > 0) {
        const span = document.createElement('span');
        span.className = 'dot-kg';
        span.textContent = val + 'kg';
        currentWeightDot.appendChild(span);
    }
    closeWeight();
    saveChecks();
}

function closeWeight() {
    document.getElementById('weightOverlay').style.display = 'none';
    currentWeightDot = null;
}

// Enter key in weight modal
document.getElementById('wmInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') confirmWeight();
});

// ===== SAVE/RESTORE CHECKS & WEIGHTS =====
function saveChecks() {
    try {
        var state = [];
        var weights = {};
        document.querySelectorAll('.dot').forEach(function (d, i) {
            if (d.classList.contains('done')) state.push(i);
            const kg = d.querySelector('.dot-kg');
            if (kg) weights[i] = kg.textContent;
        });
        localStorage.setItem('wm_checks', JSON.stringify({ checks: state, weights: weights, savedAt: Date.now() }));
    } catch (e) { }
}

// Restore checks on load
try {
    var raw = JSON.parse(localStorage.getItem('wm_checks') || '{}');
    var HOURS_24 = 24 * 60 * 60 * 1000;
    if (raw.savedAt && (Date.now() - raw.savedAt < HOURS_24)) {
        var dots = document.querySelectorAll('.dot');
        (raw.checks || []).forEach(function (i) {
            if (dots[i]) dots[i].classList.add('done');
        });
        var weights = raw.weights || {};
        Object.keys(weights).forEach(function (i) {
            if (dots[i]) {
                var span = document.createElement('span');
                span.className = 'dot-kg';
                span.textContent = weights[i];
                dots[i].appendChild(span);
            }
        });
    } else {
        localStorage.removeItem('wm_checks');
    }
} catch (e) { }

// ===== V2.1: BIG PULLUP COUNTER =====
let pullupLog = []; // [{time: '14:32', count: 5}]

(function initBigPullup() {
    try {
        const data = JSON.parse(localStorage.getItem('wm_pullups') || '{}');
        const today = new Date().toDateString();
        if (data.date === today) {
            pullupCount = data.count || 0;
            pullupLog = data.log || [];
        } else {
            pullupCount = 0;
            pullupLog = [];
        }
        document.getElementById('bigPullupCount').textContent = pullupCount;
        renderPullupHistory();
    } catch (e) { }
})();

function bigPullup(n) {
    pullupCount = Math.max(0, pullupCount + n);
    document.getElementById('bigPullupCount').textContent = pullupCount;
    // Log this action
    if (n > 0) {
        const now = new Date();
        pullupLog.push({ time: formatTime(now), count: n });
        renderPullupHistory();
    }
    saveBigPullup();
    // Bounce animation
    const el = document.getElementById('bigPullupCount');
    el.style.transform = 'scale(1.15)';
    setTimeout(() => el.style.transform = 'scale(1)', 150);
}

function resetBigPullup() {
    if (confirm('오늘의 턱걸이 기록을 초기화할까요?')) {
        pullupCount = 0;
        pullupLog = [];
        document.getElementById('bigPullupCount').textContent = 0;
        renderPullupHistory();
        saveBigPullup();
    }
}

function saveBigPullup() {
    try {
        localStorage.setItem('wm_pullups', JSON.stringify({ count: pullupCount, log: pullupLog, date: new Date().toDateString() }));
    } catch (e) { }
}

function renderPullupHistory() {
    const container = document.getElementById('pullupHistory');
    if (!container) return;
    if (pullupLog.length === 0) { container.innerHTML = ''; return; }
    let html = '<div style="font-size:0.75rem;color:var(--text2);margin-bottom:8px;text-align:left">오늘의 기록</div>';
    pullupLog.slice(-10).reverse().forEach(item => {
        html += `<div class="pullup-history-item"><span class="phi-time">${item.time}</span><span class="phi-count">+${item.count}개</span></div>`;
    });
    container.innerHTML = html;
}

// ===== V2: CARDIO TIME SAVE/RESTORE =====
document.querySelectorAll('.cardio-input').forEach(input => {
    input.addEventListener('change', function () {
        try {
            const data = JSON.parse(localStorage.getItem('wm_cardio') || '{}');
            data[this.dataset.cardio] = this.value;
            data.date = new Date().toDateString();
            localStorage.setItem('wm_cardio', JSON.stringify(data));
        } catch (e) { }
    });
});

// Restore cardio
try {
    const cd = JSON.parse(localStorage.getItem('wm_cardio') || '{}');
    if (cd.date === new Date().toDateString()) {
        document.querySelectorAll('.cardio-input').forEach(input => {
            if (cd[input.dataset.cardio]) input.value = cd[input.dataset.cardio];
        });
    }
} catch (e) { }

// ===== TIMER =====
let timerInterval;
let seconds = 0;
let isRunning = false;
let isCountdown = false;

function updateDisplay() {
    const m = Math.floor(Math.abs(seconds) / 60);
    const s = Math.abs(seconds) % 60;
    document.getElementById('timerDisplay').innerText = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

function startTimer() {
    if (isRunning) return;
    isRunning = true;
    document.getElementById('timerBar').classList.remove('alarm');
    timerInterval = setInterval(() => {
        if (isCountdown) {
            seconds--;
            if (seconds <= 0) {
                stopTimer();
                document.getElementById('timerBar').classList.add('alarm');
                setTimeout(() => document.getElementById('timerBar').classList.remove('alarm'), 5000);
            }
        } else {
            seconds++;
        }
        updateDisplay();
    }, 1000);
}

function stopTimer() { clearInterval(timerInterval); isRunning = false; }

function resetTimer() {
    stopTimer(); isCountdown = false; seconds = 0;
    document.getElementById('timerBar').classList.remove('alarm');
    updateDisplay();
}

function setTimer(s) { resetTimer(); seconds = s; isCountdown = true; updateDisplay(); startTimer(); }

// ===== V2: ENHANCED REPORT =====
function copyReport() {
    const activeTab = document.querySelector('.tab-bar button.on');
    const dayLabel = activeTab ? activeTab.innerText : '';
    const dayId = activeTab ? activeTab.getAttribute('data-day') : '';
    const now = new Date();
    const dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const endTime = formatTime(now);
    const startTime = sessionStartTime ? formatTime(sessionStartTime) : '--:--';
    const elapsedMin = sessionStartTime ? Math.floor((now - sessionStartTime) / 60000) : 0;

    let report = `📅 ${dateStr} 마이루틴 리포트\n`;
    report += `요일: ${dayLabel}\n`;
    report += `⏰ ${startTime} ~ ${endTime} (총 ${elapsedMin}분)\n\n`;

    // Cardio time
    const cardioInput = document.querySelector(`.page.on .cardio-input`);
    const cardioMin = cardioInput ? (parseInt(cardioInput.value) || 0) : 0;
    const strengthMin = Math.max(0, elapsedMin - cardioMin);

    if (cardioMin > 0) {
        report += `🏋️ 근력 운동: ${strengthMin}분\n`;
        report += `🏃 유산소: ${cardioMin}분\n\n`;
    }

    // Exercises
    let hasData = false;
    let totalVolume = 0;
    document.querySelectorAll('.page.on .ex').forEach(ex => {
        const name = ex.querySelector('.ex-name')?.innerText;
        const checked = ex.querySelectorAll('.dot.done').length;
        const total = ex.querySelectorAll('.dot').length;
        if (checked > 0 && name) {
            let weights = [];
            ex.querySelectorAll('.dot.done .dot-kg').forEach(kg => {
                const v = parseFloat(kg.textContent);
                if (v) { weights.push(v); totalVolume += v; }
            });
            const weightStr = weights.length > 0 ? ` (${weights.join('/')})kg` : '';
            report += `✅ ${name}: ${checked}/${total} 세트${weightStr}\n`;
            hasData = true;
        }
    });

    // Pullup tab report
    if (dayId === 'pullup') {
        if (pullupCount > 0) {
            report += `💜 턱걸이: 총 ${pullupCount}개\n`;
            if (pullupLog.length > 0) {
                pullupLog.forEach((item, i) => {
                    report += `  ${i + 1}. ${item.time} → +${item.count}개\n`;
                });
            }
            hasData = true;
        }
    }

    // Pullup counter (always)
    if (pullupCount > 0) {
        report += `\n💜 오늘의 턱걸이 총합: ${pullupCount}개\n`;
        hasData = true;
    }

    if (totalVolume > 0) {
        report += `\n📊 총 볼륨: ${totalVolume.toLocaleString()}kg\n`;
    }

    if (!hasData) {
        alert("체크된 운동이 없습니다. 운동 후 눌러주세요!");
        return;
    }

    report += "\n#오운완 #마이루틴 #독기";

    navigator.clipboard.writeText(report).then(() => {
        const btn = document.querySelector('.page.on .final-btn');
        if (btn) {
            btn.innerText = "✅ 기록이 복사되었습니다!";
            btn.style.background = "var(--green)";
            setTimeout(() => { btn.innerText = "✨ 오운완!! ✨"; btn.style.background = ""; }, 2000);
        }
    });

    // 1. 타이머 관련 초기화 (타이머가 시작된 경우에만)
    if (sessionStartTime) {
        sessionStartTime = null;
        if (mainTimerInterval) clearInterval(mainTimerInterval);
        try {
            localStorage.removeItem('wm_session');
            localStorage.removeItem('wm_session_finished');
        } catch (e) { }
        updateMainTimerDisplay(); // 🏋️ 운동 시작으로 돌아감
    }

    // 2. 해당 요일 초록색 체크 초기화 (타이머 여부와 상관없이 무조건)
    const activePage = document.querySelector('.page.on');
    if (activePage) {
        activePage.querySelectorAll('.dot.done').forEach(dot => {
            dot.classList.remove('done');
            dot.querySelector('.dot-kg')?.remove();
        });
    }
    saveChecks(); // 로컬 스토리지에 체크 상태 해제 반영

    // 3. 턱걸이 기록 초기화 (타이머 여부와 상관없이 무조건)
    pullupCount = 0;
    pullupLog = [];
    const pullupCountEl = document.getElementById('bigPullupCount');
    if (pullupCountEl) pullupCountEl.textContent = 0;
    renderPullupHistory();
    saveBigPullup(); // 로컬 스토리지에 턱걸이 0 반영
}