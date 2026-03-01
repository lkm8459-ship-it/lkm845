// ===== V2 STATE =====
let sessionStartTime = null;
let sessionEndTime = null;
let mainTimerInterval = null;
let pullupCount = 0;
let currentWeightDot = null;
let wm_history = JSON.parse(localStorage.getItem('wm_history') || '{}');

// V2.7: Notification & Vibration
function requestNotificationPermission() {
    if (!("Notification" in window)) {
        alert("이 브라우저는 알림을 지원하지 않습니다.");
        return;
    }
    Notification.requestPermission().then(permission => {
        const btn = document.getElementById('btn-notification');
        if (permission === "granted") {
            btn.innerHTML = '🔔';
            btn.style.color = 'var(--purple)';
            triggerNotification("알림이 활성화되었습니다! (3초 후 닫힘)");
        } else {
            btn.innerHTML = '🔕';
            btn.style.color = 'var(--text2)';
        }
    });
}

function triggerNotification(body = "휴식 끝! 다음 세트 준비하십시오.") {
    const title = "MY ROUTINE";
    const options = {
        body: body,
        icon: "assets/icon-512.png",
        badge: "assets/icon-512.png",
        tag: "workout-rest",
        renotify: true,
        vibrate: [500, 200, 500, 200, 500, 200, 500, 200, 500, 200, 500, 200, 500]
    };

    // V2.85: 모바일 시스템/핏3 연동을 위해 서비스 워커 알림 방식으로 전환
    if ('serviceWorker' in navigator && Notification.permission === "granted") {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, options);
        });
    }
}

// V2.7: Rest Time Persistence
document.addEventListener('change', e => {
    if (e.target.classList.contains('rest-time-input')) {
        const exName = e.target.dataset.ex;
        const val = e.target.value;
        if (exName) {
            let rests = JSON.parse(localStorage.getItem('wm_rests') || '{}');
            rests[exName] = val;
            localStorage.setItem('wm_rests', JSON.stringify(rests));
        }
    }
});

// Restore Rests
(function restoreRests() {
    let rests = JSON.parse(localStorage.getItem('wm_rests') || '{}');
    document.querySelectorAll('.rest-time-input').forEach(input => {
        const exName = input.dataset.ex;
        if (exName && rests[exName]) input.value = rests[exName];
    });
})();

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
const TAB_ORDER = ['pullup', 'mon', 'tue', 'wed', 'thu', 'fri'];

function switchTab(day) {
    const btn = document.querySelector(`.tab-bar button[data-day="${day}"]`);
    if (!btn) return;
    document.querySelectorAll('.tab-bar button').forEach(b => b.classList.remove('on'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('on'));
    btn.classList.add('on');
    const targetPage = document.getElementById(day);
    if (targetPage) targetPage.classList.add('on');
    updateDailyTip(day);
    btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    window.scrollTo(0, 0);
    try { localStorage.setItem('wm_tab', day); } catch (e) { }
}

document.getElementById('tabBar').addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var day = btn.getAttribute('data-day');
    switchTab(day);
});

// Restore tab
try {
    var saved = localStorage.getItem('wm_tab');
    if (saved && document.getElementById(saved)) {
        switchTab(saved);
    }
} catch (e) { }

var activeDay = document.querySelector('.tab-bar button.on');
if (activeDay) updateDailyTip(activeDay.getAttribute('data-day'));

// ===== SWIPE NAVIGATION (v2.6) =====
function setupSwipe() {
    let touchStartX = 0;
    let touchStartY = 0;

    document.addEventListener('touchstart', e => {
        // 탭바 자체에서의 스와이프는 무시 (가로 스크롤 방해 금지)
        if (e.target.closest('#tabBar')) return;
        // 타이머 영역이나 입력 폼 등에서는 무시
        if (e.target.closest('.timer-bar') || e.target.closest('.weight-modal')) return;

        touchStartX = e.changedTouches[0].clientX;
        touchStartY = e.changedTouches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', e => {
        if (e.target.closest('#tabBar')) return;
        if (e.target.closest('.timer-bar') || e.target.closest('.weight-modal')) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;

        // 횡방향 이동 거리가 종방향보다 크고 일정 임계값(80px) 이상일 때만 전환
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 80) {
            const currentActivePage = document.querySelector('.page.on');
            if (!currentActivePage) return;

            const currentIndex = TAB_ORDER.indexOf(currentActivePage.id);
            let nextIndex = currentIndex;

            if (dx < 0) nextIndex = Math.min(currentIndex + 1, TAB_ORDER.length - 1);
            else nextIndex = Math.max(currentIndex - 1, 0);

            if (nextIndex !== currentIndex) {
                switchTab(TAB_ORDER[nextIndex]);
            }
        }
    }, { passive: true });
}
setupSwipe();

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
    const exCard = el.closest('.ex');
    const exName = exCard ? (exCard.querySelector('.ex-name')?.textContent || '') : '';

    // V2.7: Auto-Rest Logic
    const restInput = exCard?.querySelector('.rest-time-input');
    const restSeconds = restInput ? parseInt(restInput.value) : null;
    const dots = exCard ? Array.from(exCard.querySelectorAll('.dot')) : [];
    const isLastSet = dots.indexOf(el) === dots.length - 1;

    if (isStrengthDay) {
        // 턱걸이/딥스는 자체중량 → 무게 입력 불필요
        const bodyweightExercises = ['턱걸이', '딥스'];
        const isBodyweight = bodyweightExercises.some(bw => exName.includes(bw));

        if (isBodyweight) {
            el.classList.add('done');

            // V2.86: 요일별 마지막 세트 지능형 휴식
            let finalRest = restSeconds;
            if (isLastSet) {
                if (['mon', 'wed', 'fri'].includes(pageId)) finalRest = 120;
                else finalRest = restSeconds;
            }
            if (finalRest) setTimer(finalRest);

            saveChecks();
            return;
        }

        currentWeightDot = el;
        const dotNum = el.textContent.trim().replace(/[^0-9]/g, '');
        document.getElementById('wmTitle').textContent = exName;
        document.getElementById('wmSet').textContent = '세트 ' + dotNum;

        // V2.7: PR Tracker Hint
        const hintEl = document.getElementById('wmHint');
        const lastPR = wm_history[exName];
        if (lastPR) {
            hintEl.textContent = `지난 기록: ${lastPR.weight}kg (${lastPR.date})`;
            hintEl.style.display = 'inline-block';
        } else {
            hintEl.textContent = '지난 기록: 없음';
            hintEl.style.display = 'none';
        }

        // 이전 세트 무게를 자동 프리필
        let prevWeight = '';
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

        // V2.86: 요일별 마지막 세트 지능형 휴식
        let finalRest = restSeconds;
        if (isLastSet) {
            if (['mon', 'wed', 'fri'].includes(pageId)) finalRest = 120;
            else finalRest = restSeconds;
        }
        if (finalRest) setTimer(finalRest);

        saveChecks();
    }
}

function confirmWeight() {
    if (!currentWeightDot) return;
    const val = document.getElementById('wmInput').value;
    const exName = document.getElementById('wmTitle').textContent;
    currentWeightDot.classList.add('done');
    currentWeightDot.querySelector('.dot-kg')?.remove();

    if (val && parseFloat(val) > 0) {
        const span = document.createElement('span');
        span.className = 'dot-kg';
        span.textContent = val + 'kg';
        currentWeightDot.appendChild(span);

        // V2.7: Save to PR History
        const weight = parseFloat(val);
        if (!wm_history[exName] || weight >= wm_history[exName].weight) {
            const today = new Date();
            const dateStr = (today.getMonth() + 1) + '/' + today.getDate();
            wm_history[exName] = { weight: weight, date: dateStr };
            localStorage.setItem('wm_history', JSON.stringify(wm_history));
        }
    }

    // Auto-rest after confirming weight
    const exCard = currentWeightDot.closest('.ex');
    const restInput = exCard?.querySelector('.rest-time-input');
    const restSeconds = restInput ? parseInt(restInput.value) : null;
    const dots = Array.from(exCard.querySelectorAll('.dot'));
    const isLastSet = dots.indexOf(currentWeightDot) === dots.length - 1;

    // V2.86: 요일별 마지막 세트 지능형 휴식
    const page = currentWeightDot.closest('.page');
    const pageId = page ? page.id : '';
    let finalRest = restSeconds;
    if (isLastSet) {
        if (['mon', 'wed', 'fri'].includes(pageId)) finalRest = 120;
        else finalRest = restSeconds;
    }

    if (finalRest) {
        setTimer(finalRest);
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
                triggerNotification();
                // 3초 후 타이머 바 리셋 (00:00으로)
                setTimeout(() => {
                    document.getElementById('timerBar').classList.remove('alarm');
                    resetTimer();
                }, 3000);
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
            btn.innerHTML = "✅ 기록이 복사되었습니다!<br><small>카톡에 붙여넣어 보관하세요</small>";
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
        updateMainTimerDisplay();
    }

    // [V2.8] 사령관님 요청: 기록은 직접 초기화하기 전까지 유지합니다.
}