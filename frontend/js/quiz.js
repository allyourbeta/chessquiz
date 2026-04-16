async function startQuiz() {
    AppState.quizCorrect = 0;
    AppState.quizTotal = 0;
    document.getElementById('quiz-answer-area').style.display = 'none';
    let u = API + '/positions/';
    const tags = AppState.quizTagFilters || [];
    if (tags.length) {
        u += '?' + tags.map(t => 'tags=' + encodeURIComponent(t)).join('&');
    }
    const positions = await (await fetch(u)).json();
    if (!positions.length) { toast('No positions found', true); return; }
    AppState.quizQueue = [...positions].sort(() => Math.random() - .5);
    nextQuizQuestion();
}

function nextQuizQuestion() {
    if (!AppState.quizQueue.length) {
        document.getElementById('quiz-controls').innerHTML =
            `<div style="text-align:center"><p class="section-title" style="margin-bottom:12px">Quiz Complete!</p><p class="text-muted">${AppState.quizCorrect}/${AppState.quizTotal} correct</p><button class="btn btn-primary" onclick="startQuiz()" style="margin-top:12px">Restart</button></div>`;
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

function mountQuizTagFilter() {
    TagFilter.mount({
        containerId: 'quiz-tag-filters',
        state: { tags: AppState.quizTagFilters },
        onChange: tags => { AppState.quizTagFilters = tags; },
        placeholder: 'Filter by tag...',
    });
}

window.startQuiz = startQuiz;
window.nextQuizQuestion = nextQuizQuestion;
window.revealAnswer = revealAnswer;
window.recordAttempt = recordAttempt;
window.skipQuestion = skipQuestion;
window.updateQuizStats = updateQuizStats;
window.mountQuizTagFilter = mountQuizTagFilter;
