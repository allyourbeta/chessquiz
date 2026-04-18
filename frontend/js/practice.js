// Practice sessions (Phase 10) — core state + API calls. UI in practice-ui.js.
// Failure modes: PGN must be captured before stopPlayMode tears down playChess.
const Practice = (function () {
    let engineLevels = null;
    let active = null;       // { rootPositionId, startFen, userColor, level, startingEval }
    let pendingSave = null;  // { pgn, finalFen, moveCount, finalEval } when game ends
    let forcedVerdict = null; // 'loss' (resign) or 'abandoned' (stop) — bypass modal

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
        _showPracticeButtons(true);
        toast(`Practice started: ${userColor} vs Stockfish (${level})`);
    }

    function _showPracticeButtons(show) {
        ['gv-resign-btn', 'detail-resign-btn', 'gv-draw-btn', 'detail-draw-btn']
            .forEach(id => {
                const b = document.getElementById(id);
                if (b) b.style.display = show ? '' : 'none';
            });
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
        if (forcedVerdict) {
            // Resign / abandon path: save immediately, no modal.
            const verdict = forcedVerdict;
            forcedVerdict = null;
            confirmSave(verdict);
            return;
        }
        PracticeUI.showSaveModal(active, pendingSave);
    }

    function resign() {
        if (!active) { toast('No practice game in progress', true); return; }
        if (!confirm('Resign this game? It will be saved as a loss.')) return;
        forcedVerdict = 'loss';
        _showPracticeButtons(false);
        stopPlayMode();  // wrapper calls captureEndOfGame -> confirmSave('loss')
        toast('Resigned');
    }

    // Offer draw: probe Stockfish for an eval of the current position at
    // depth 12, flip to Stockfish's own perspective, accept iff sf is <= 0.
    // On accept, save as draw and stop. On decline, toast and continue.
    function offerDraw() {
        if (!active) { toast('No practice game in progress', true); return; }
        if (!AppState.sfWorker || !AppState.playChess) {
            toast('Engine not available', true); return;
        }
        const fen = AppState.playChess.fen();
        const sideToMove = fen.split(' ')[1];
        const sfIsWhite = active.userColor === 'black';
        const sfToMove = (sideToMove === 'w' && sfIsWhite) || (sideToMove === 'b' && !sfIsWhite);
        toast('Offering draw...');
        let latest = null;
        const onMsg = (e) => {
            const l = e.data;
            if (typeof l !== 'string') return;
            if (l.startsWith('info depth')) {
                const m = l.match(/depth (\d+).*score (cp|mate) (-?\d+)/);
                if (m) latest = { type: m[2], val: parseInt(m[3], 10) };
            } else if (l.startsWith('bestmove')) {
                AppState.sfWorker.onmessage = null;
                _handleDrawResponse(latest, sfToMove);
            }
        };
        AppState.sfWorker.onmessage = onMsg;
        AppState.sfWorker.postMessage('ucinewgame');
        AppState.sfWorker.postMessage('position fen ' + fen);
        AppState.sfWorker.postMessage('go depth 12');
    }

    function _handleDrawResponse(latest, sfToMove) {
        if (!latest) { toast('Stockfish declined the draw'); return; }
        // latest.val is from side-to-move's perspective. Normalize to Stockfish's.
        let sfScore = latest.val * (sfToMove ? 1 : -1);
        if (latest.type === 'mate') sfScore = sfScore > 0 ? 99999 : -99999;
        // Accept only if Stockfish is equal or worse. Threshold in centipawns.
        if (sfScore <= 0) {
            forcedVerdict = 'draw';
            _showPracticeButtons(false);
            toast('Stockfish accepted the draw');
            stopPlayMode();
        } else {
            toast('Stockfish declined the draw');
        }
    }

    function stopAndAbandon() {
        // Called when user clicks "Stop Playing" during an active practice.
        // The wrapper on stopPlayMode will still call captureEndOfGame; we
        // mark the verdict as 'abandoned' so modal is skipped.
        forcedVerdict = 'abandoned';
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

    function _reset() {
        active = null;
        pendingSave = null;
        forcedVerdict = null;
        _showPracticeButtons(false);
    }
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
        // Get the game details first to know user color
        const game = await (await fetch(`${API}/practice/${id}`)).json();
        const userColor = game.user_color;
        
        const options = [
            '1-0 (White wins)',
            '0-1 (Black wins)', 
            '½-½ (Draw)',
            '— (Abandoned)'
        ];
        const v = prompt('Select verdict:\n' + options.join('\n'), '');
        if (v == null) return;
        
        let verdict = '';
        if (v.includes('1-0')) {
            verdict = userColor === 'white' ? 'win' : 'loss';
        } else if (v.includes('0-1')) {
            verdict = userColor === 'black' ? 'win' : 'loss';
        } else if (v.includes('½-½')) {
            verdict = 'draw';
        } else if (v.includes('—')) {
            verdict = 'abandoned';
        } else {
            toast('Invalid verdict format. Please use 1-0, 0-1, ½-½, or —', true);
            return;
        }
        
        const r = await fetch(`${API}/practice/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_verdict: verdict }),
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
        resign, stopAndAbandon, offerDraw,
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
