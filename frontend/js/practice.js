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
        toast('Practice mode is currently disabled (Stockfish removed)', true);
        return;
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
        toast('Practice mode is currently disabled', true);
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
            topBanner('Practice game saved');
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

    let currentFilters = { verdict: '', engine_level: '', sort: 'recent' };
    let currentOffset = 0;
    let totalCount = 0;
    const PAGE_SIZE = 10;

    async function loadPracticeHistory(positionId, append = false) {
        if (!positionId) return;
        
        try {
            // Build query params
            const params = new URLSearchParams({
                root_position_id: positionId,
                limit: PAGE_SIZE,
                offset: append ? currentOffset : 0,
                sort: currentFilters.sort || 'recent'
            });
            if (currentFilters.verdict) params.append('verdict', currentFilters.verdict);
            if (currentFilters.engine_level) params.append('engine_level', currentFilters.engine_level);
            
            // Also build stats params
            const statsParams = new URLSearchParams();
            if (currentFilters.verdict) statsParams.append('verdict', currentFilters.verdict);
            if (currentFilters.engine_level) statsParams.append('engine_level', currentFilters.engine_level);
            
            const [stats, gamesData, tree] = await Promise.all([
                fetch(`${API}/practice/stats/${positionId}?${statsParams}`).then(r => r.json()),
                fetch(`${API}/practice/?${params}`).then(r => r.json()),
                fetch(`${API}/practice/tree/${positionId}`).then(r => r.json()),
            ]);
            
            // Extract games and total_count from response
            const games = gamesData.games || gamesData;
            totalCount = gamesData.total_count || games.length;
            
            if (!append) currentOffset = 0;
            currentOffset += games.length;
            
            // Update filter info display
            const filterInfo = document.getElementById('practice-filter-info');
            const filterText = document.getElementById('practice-filter-text');
            if (currentFilters.verdict || currentFilters.engine_level) {
                filterInfo.style.display = 'block';
                filterText.textContent = `Showing ${stats.total_games} of ${totalCount} games (filtered)`;
            } else {
                filterInfo.style.display = 'none';
            }
            
            // Show pagination button if needed
            const paginationEl = document.getElementById('practice-pagination');
            if (paginationEl) {
                paginationEl.style.display = currentOffset < totalCount ? 'block' : 'none';
            }
            
            PracticeUI.renderHistory(stats, games, tree, append);
        } catch (_) {
            const el = document.getElementById('practice-stats');
            if (el) el.innerHTML = '<p class="text-muted">Could not load practice history</p>';
        }
    }
    
    function applyFilters() {
        const verdictEl = document.getElementById('practice-verdict-filter');
        const levelEl = document.getElementById('practice-level-filter');
        const sortEl = document.getElementById('practice-sort');
        
        currentFilters = {
            verdict: verdictEl ? verdictEl.value : '',
            engine_level: levelEl ? levelEl.value : '',
            sort: sortEl ? sortEl.value : 'recent'
        };
        
        currentOffset = 0;
        if (AppState.currentDetailId) {
            loadPracticeHistory(AppState.currentDetailId, false);
        }
    }
    
    function clearFilters() {
        document.getElementById('practice-verdict-filter').value = '';
        document.getElementById('practice-level-filter').value = '';
        document.getElementById('practice-sort').value = 'recent';
        applyFilters();
    }
    
    function showMore() {
        if (AppState.currentDetailId) {
            loadPracticeHistory(AppState.currentDetailId, true);
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
        applyFilters, clearFilters, showMore,
    };
})();

// STOCKFISH DISABLED: stopPlayMode wrapper removed

window.Practice = Practice;
