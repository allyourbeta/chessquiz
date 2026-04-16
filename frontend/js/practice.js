// Practice sessions (Phase 10) — core state + API calls.
// UI rendering lives in practice-ui.js.
//
// Failure modes:
//   - PGN must be collected from playChess before stopPlayMode destroys it.
//   - If user clicks Stop we still prompt to save — only Discard should skip.
//   - After save, reload detail so history reflects the new row.

const Practice = (function () {
    let engineLevels = null;
    let active = null;       // { rootPositionId, startFen, userColor, level, startingEval }
    let pendingSave = null;  // { pgn, finalFen, moveCount, finalEval } when game ends

    async function loadLevels() {
        if (engineLevels) return engineLevels;
        engineLevels = await (await fetch(API + '/practice/engine-levels')).json();
        return engineLevels;
    }

    function getLevels() { return engineLevels; }

    async function startFromDetail() {
        if (!AppState.currentDetailId || !AppState.currentDetailFen) return;
        await loadLevels();
        const levelSel = document.getElementById('practice-level');
        const colorSel = document.getElementById('practice-color');
        const level = levelSel ? levelSel.value : 'medium';
        const turnColor = (AppState.currentDetailFen.split(' ')[1] === 'b') ? 'black' : 'white';
        const userColor = colorSel && colorSel.value ? colorSel.value : turnColor;

        active = {
            rootPositionId: AppState.currentDetailId,
            startFen: AppState.currentDetailFen,
            userColor,
            level,
            startingEval: null,
        };

        AppState.boardFen = AppState.currentDetailFen;
        startPlayMode('detail-board', AppState.currentDetailFen);
        if (AppState.engineEval && typeof AppState.engineEval.score === 'string') {
            const s = parseFloat(AppState.engineEval.score);
            if (!isNaN(s)) active.startingEval = s;
        }
        toast(`Practice started: ${userColor} vs Stockfish (${level})`);
    }

    function _movesToPgn(chess, startFen) {
        try {
            const hist = chess.history();
            const hdr = `[FEN "${startFen}"]\n[SetUp "1"]\n\n`;
            const startTurn = startFen.split(' ')[1] === 'b' ? 'b' : 'w';
            let body = '';
            let moveNum = parseInt(startFen.split(' ')[5], 10) || 1;
            let i = 0;
            if (startTurn === 'b' && hist.length) {
                body += `${moveNum}... ${hist[0]} `;
                i = 1;
                moveNum++;
            }
            while (i < hist.length) {
                const white = hist[i];
                const black = hist[i + 1];
                body += `${moveNum}. ${white}`;
                if (black) body += ` ${black}`;
                body += ' ';
                moveNum++;
                i += 2;
            }
            return hdr + body.trim() + '\n';
        } catch (_) {
            return `[FEN "${startFen}"]\n[SetUp "1"]\n\n`;
        }
    }

    function captureEndOfGame() {
        if (!active || !AppState.playChess) return;
        const chess = AppState.playChess;
        const pgn = _movesToPgn(chess, active.startFen);
        const finalFen = chess.fen();
        const moveCount = chess.history().length;
        const finalEval = (AppState.engineEval && typeof AppState.engineEval.score === 'string')
            ? parseFloat(AppState.engineEval.score)
            : null;
        pendingSave = {
            pgn,
            finalFen,
            moveCount,
            finalEval: isNaN(finalEval) ? null : finalEval,
        };
        PracticeUI.showSaveModal(active, pendingSave);
    }

    function guessVerdict() {
        if (!pendingSave || !active) return '?';
        if (pendingSave.finalEval == null || active.startingEval == null) return '?';
        let d = pendingSave.finalEval - active.startingEval;
        if (active.userColor === 'black') d = -d;
        if (d > 1.0) return 'win';
        if (d < -1.0) return 'loss';
        return 'draw';
    }

    async function confirmSave(userVerdict) {
        if (!pendingSave || !active) { PracticeUI.hideSaveModal(); return; }
        const notesEl = document.getElementById('practice-save-notes');
        const body = {
            root_position_id: active.rootPositionId,
            pgn_text: pendingSave.pgn,
            user_color: active.userColor,
            final_fen: pendingSave.finalFen,
            move_count: pendingSave.moveCount,
            engine_name: 'Stockfish',
            engine_level: active.level,
            starting_eval: active.startingEval,
            final_eval: pendingSave.finalEval,
            user_verdict: userVerdict || null,
            notes: notesEl ? notesEl.value.trim() || null : null,
        };
        const r = await fetch(API + '/practice/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (r.ok) {
            toast('Practice game saved');
            _reset();
            PracticeUI.hideSaveModal();
            if (AppState.currentDetailId) loadPracticeHistory(AppState.currentDetailId);
        } else {
            toast('Save failed', true);
        }
    }

    function discard() {
        _reset();
        PracticeUI.hideSaveModal();
        toast('Practice game discarded');
    }

    function _reset() { active = null; pendingSave = null; }
    function isActive() { return !!active; }
    function getActive() { return active; }
    function getPendingSave() { return pendingSave; }

    async function loadPracticeHistory(positionId) {
        try {
            const [stats, games, tree] = await Promise.all([
                fetch(`${API}/practice/stats/${positionId}`).then(r => r.json()),
                fetch(`${API}/practice/?root_position_id=${positionId}`).then(r => r.json()),
                fetch(`${API}/practice/tree/${positionId}`).then(r => r.json()),
            ]);
            PracticeUI.renderHistory(stats, games, tree);
        } catch (_) {
            const el = document.getElementById('practice-stats');
            if (el) el.innerHTML = '<p class="text-muted">Could not load practice history</p>';
        }
    }

    async function editVerdict(id) {
        const v = prompt('Verdict (win / draw / loss / abandoned):', '');
        if (v == null) return;
        const trimmed = v.trim().toLowerCase();
        if (!['win', 'draw', 'loss', 'abandoned', ''].includes(trimmed)) {
            toast('Invalid verdict', true); return;
        }
        const r = await fetch(`${API}/practice/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_verdict: trimmed }),
        });
        if (r.ok) {
            toast('Verdict updated');
            if (AppState.currentDetailId) loadPracticeHistory(AppState.currentDetailId);
        } else {
            toast('Update failed', true);
        }
    }

    async function deleteGame(id) {
        if (!confirm('Delete this practice game?')) return;
        const r = await fetch(`${API}/practice/${id}`, { method: 'DELETE' });
        if (r.ok) {
            toast('Practice game deleted');
            if (AppState.currentDetailId) loadPracticeHistory(AppState.currentDetailId);
            const cur = Router.current();
            if (cur && cur.view === 'practice') loadPracticeTab();
        }
    }

    async function loadPracticeTab() {
        await loadLevels();
        PracticeUI.populateLevelSelect(engineLevels);
        const summaries = await (await fetch(API + '/practice/positions')).json();
        PracticeUI.renderPositionsList(summaries);
    }

    return {
        startFromDetail, captureEndOfGame, confirmSave, discard, isActive,
        loadPracticeHistory, loadPracticeTab, loadLevels, getLevels,
        editVerdict, deleteGame, guessVerdict, getActive, getPendingSave,
    };
})();

// Wrap stopPlayMode so practice captures before teardown.
(function () {
    const origStop = window.stopPlayMode;
    window.stopPlayMode = function () {
        if (Practice.isActive() && AppState.playChess) {
            Practice.captureEndOfGame();
        }
        return origStop.apply(this, arguments);
    };
})();

window.Practice = Practice;
