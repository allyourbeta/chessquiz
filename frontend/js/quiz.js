async function startQuiz() {
    AppState.quizCorrect = 0;
    AppState.quizTotal = 0;
    document.getElementById('quiz-answer-area').style.display = 'none';
    let u = API + '/positions/';
    if (AppState.quizTagFilters.length > 0) u += '?tag=' + encodeURIComponent(AppState.quizTagFilters[0]);
    const positions = await (await fetch(u)).json();
    if (!positions.length) { toast('No positions found', true); return; }
    AppState.quizQueue = [...positions].sort(() => Math.random() - .5);
    nextQuizQuestion();
}

function nextQuizQuestion() {
    if (!AppState.quizQueue.length) {
        document.getElementById('quiz-controls').innerHTML =
            `<div style="text-align:center"><p style="font-family:'Instrument Serif',serif;font-size:20px;margin-bottom:12px">Quiz Complete!</p><p style="color:var(--text-muted)">${AppState.quizCorrect}/${AppState.quizTotal} correct</p><button class="btn btn-primary" onclick="startQuiz()" style="margin-top:12px">Restart</button></div>`;
        return;
    }
    AppState.quizCurrent = AppState.quizQueue.pop();
    document.getElementById('quiz-answer-area').style.display = 'none';
    document.getElementById('quiz-title').textContent = AppState.quizCurrent.title || 'What is the best continuation?';
    document.getElementById('quiz-tags-display').innerHTML = AppState.quizCurrent.tags.map(t => `<span class="tag">#${t.name}</span>`).join('');
    BoardManager.create('quiz-board', AppState.quizCurrent.fen, { flipped: false });
    document.getElementById('quiz-controls').innerHTML =
        `<button class="btn btn-primary" onclick="revealAnswer()">Reveal Answer</button><button class="btn" onclick="skipQuestion()">Skip</button>`;
    updateQuizStats();
}

async function revealAnswer() {
    const pos = await (await fetch(API + '/quiz/reveal/' + AppState.quizCurrent.id)).json();
    document.getElementById('quiz-notes').textContent = pos.notes || '(no notes)';
    document.getElementById('quiz-stockfish').textContent = pos.stockfish_analysis || '(no engine analysis)';
    document.getElementById('quiz-answer-area').style.display = 'block';
    document.getElementById('quiz-controls').innerHTML =
        `<button class="btn btn-success" onclick="recordAttempt(true)">✓ Got it</button><button class="btn btn-danger" onclick="recordAttempt(false)">✗ Missed it</button>`;
}

async function recordAttempt(correct) {
    AppState.quizTotal++;
    if (correct) AppState.quizCorrect++;
    await fetch(API + '/quiz/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position_id: AppState.quizCurrent.id, correct })
    });
    updateQuizStats();
    nextQuizQuestion();
}

function skipQuestion() { nextQuizQuestion(); }

function updateQuizStats() {
    const el = document.getElementById('quiz-stats');
    el.innerHTML = AppState.quizTotal === 0
        ? `<span>${AppState.quizQueue.length + 1} positions remaining</span>`
        : `<span class="correct">✓ ${AppState.quizCorrect}</span><span class="incorrect">✗ ${AppState.quizTotal - AppState.quizCorrect}</span><span>${AppState.quizQueue.length} remaining</span>`;
}

function renderQuizTagFilters() {
    document.getElementById('quiz-tag-filters').innerHTML =
        `<span style="font-size:12px;color:var(--text-muted);margin-right:8px">Filter:</span><span class="tag tag-filter ${!AppState.quizTagFilters.length ? 'selected' : ''}" onclick="toggleQuizTag(null)">All</span>` +
        AppState.allTags.map(t => `<span class="tag tag-filter ${AppState.quizTagFilters.includes(t.name) ? 'selected' : ''}" onclick="toggleQuizTag('${t.name}')">#${t.name}</span>`).join('');
}

function toggleQuizTag(t) {
    AppState.quizTagFilters = t ? [t] : [];
    renderQuizTagFilters();
}

window.startQuiz = startQuiz;
window.nextQuizQuestion = nextQuizQuestion;
window.revealAnswer = revealAnswer;
window.recordAttempt = recordAttempt;
window.skipQuestion = skipQuestion;
window.updateQuizStats = updateQuizStats;
window.renderQuizTagFilters = renderQuizTagFilters;
window.toggleQuizTag = toggleQuizTag;
