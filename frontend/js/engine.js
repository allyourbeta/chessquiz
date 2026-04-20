let _evalTimer = null;
let _evalId = 0;
let _pendingBestMove = false;

function toggleEngine(boardId) {
    AppState.engineOn = !AppState.engineOn;
    const btn = document.getElementById('engine-toggle-btn');
    if (btn) btn.textContent = AppState.engineOn ? 'Hide Engine' : 'Show Engine';
    const detailBtn = document.getElementById('detail-engine-toggle-btn');
    if (detailBtn) detailBtn.textContent = AppState.engineOn ? 'Hide Engine' : 'Show Engine';

    if (AppState.engineOn) {
        requestEval(boardId);
    } else {
        clearEvalDisplay();
    }
}

function requestEval(boardId) {
    if (!AppState.engineOn || !AppState.sfWorker) return;
    clearTimeout(_evalTimer);
    _evalTimer = setTimeout(() => _doEval(boardId), 150);
}

function _doEval(boardId) {
    if (!AppState.engineOn || !AppState.sfWorker || _pendingBestMove) return;
    const fen = BoardManager.getPosition(boardId);
    if (!fen) return;

    const myId = ++_evalId;
    const evalEl = document.getElementById('engine-eval-display');
    if (evalEl) evalEl.textContent = 'Thinking...';

    const handler = (e) => {
        if (myId !== _evalId) return;
        const l = e.data;
        if (typeof l !== 'string') return;

        if (l.startsWith('info depth')) {
            const m = l.match(/depth (\d+).*score (cp|mate) (-?\d+).*pv (.+)/);
            if (m && parseInt(m[1]) >= 8) {
                const scoreText = m[2] === 'mate' ? `M${m[3]}` : (parseInt(m[3]) / 100).toFixed(2);
                const uciMoves = m[4].trim().split(/\s+/).slice(0, 5);
                fetch(API + '/chess/uci-to-san', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fen, uci_moves: uciMoves })
                }).then(r => r.json()).then(d => {
                    if (myId !== _evalId) return;
                    AppState.engineEval = { score: scoreText, line: d.san, depth: m[1] };
                    renderEvalDisplay();
                    updateEvalBar(fen, m[2], parseInt(m[3]));
                }).catch(() => {
                    if (myId !== _evalId) return;
                    AppState.engineEval = { score: scoreText, line: m[4], depth: m[1] };
                    renderEvalDisplay();
                    updateEvalBar(fen, m[2], parseInt(m[3]));
                });
            }
        }
    };

    AppState.sfWorker.onmessage = handler;
    AppState.sfWorker.postMessage('ucinewgame');
    AppState.sfWorker.postMessage('position fen ' + fen);
    AppState.sfWorker.postMessage('go depth 18');
}

function renderEvalDisplay() {
    const el = document.getElementById('engine-eval-display');
    if (!el || !AppState.engineEval) return;
    const ev = AppState.engineEval;
    el.innerHTML = `<span style="font-weight:600;font-size:14px">${ev.score}</span> <span class="text-muted" style="font-size:11px">d${ev.depth}</span> <span style="font-size:12px">${ev.line}</span>`;
}

function updateEvalBar(fen, scoreType, scoreVal) {
    const bar = document.getElementById('eval-bar-fill');
    if (!bar) return;
    let whitePct;
    if (scoreType === 'mate') {
        whitePct = scoreVal > 0 ? 100 : 0;
    } else {
        const clamped = Math.max(-500, Math.min(500, scoreVal));
        whitePct = 50 + (clamped / 500) * 50;
    }
    const isBlackToMove = fen.split(' ')[1] === 'b';
    if (isBlackToMove) whitePct = 100 - whitePct;
    bar.style.height = whitePct + '%';
}

function clearEvalDisplay() {
    if (_evalTimer) clearTimeout(_evalTimer);
    AppState.engineEval = null;
    _multiPVLines = {};
    const el = document.getElementById('engine-eval-display');
    if (el) el.textContent = '';
    const bar = document.getElementById('eval-bar-fill');
    if (bar) bar.style.height = '50%';
    
    // Stop Stockfish if it's running
    if (AppState.sfWorker) {
        AppState.sfWorker.postMessage('stop');
    }
}

function startPlayMode(boardId, fen) {
    if (!window.Chess) { toast('chess.js not loaded', true); return; }
    AppState.playMode = true;
    AppState.playBoardId = boardId;
    AppState.playStartFen = fen;
    AppState.playChess = new Chess(fen);

    const playControls = document.getElementById('play-controls');
    if (playControls) playControls.style.display = 'flex';
    const viewerBtns = document.getElementById('gv-nav-btns');
    if (viewerBtns) viewerBtns.style.display = 'none';

    const detailPlayControls = document.getElementById('detail-play-controls');
    if (detailPlayControls) detailPlayControls.style.display = 'flex';

    const userColor = AppState.playChess.turn();
    const shouldFlip = userColor === 'b';

    BoardManager.create(boardId, fen, {
        flipped: shouldFlip,
        mode: 'play',
        onMove: onPlayerMove,
    });

    const youColor = userColor === 'w' ? 'White' : 'Black';
    const sfColor = userColor === 'w' ? 'Black' : 'White';
    const label = 'You: ' + youColor + ' vs Stockfish: ' + sfColor;
    toast(label);

    const playMsg = document.getElementById('play-side-msg');
    if (playMsg) { playMsg.textContent = label; playMsg.style.display = 'block'; }
    const detailPlayMsg = document.getElementById('detail-play-side-msg');
    if (detailPlayMsg) { detailPlayMsg.textContent = label; detailPlayMsg.style.display = 'block'; }
}

function onPlayerMove(event) {
    const chess = AppState.playChess;
    if (!chess) return false;

    const from = event.squareFrom;
    const to = event.squareTo;
    const piece = chess.get(from);
    if (!piece) return false;

    let promotion = undefined;
    if (piece.type === 'p') {
        const targetRank = piece.color === 'w' ? '8' : '1';
        if (to[1] === targetRank) promotion = 'q';
    }

    const move = chess.move({ from, to, promotion });
    if (!move) return false;

    BoardManager.setPosition(AppState.playBoardId, chess.fen());

    if (chess.game_over()) {
        _showGameOverMessage();
        return true;
    }

    setTimeout(() => makeEngineMove(), 200);
    return true;
}

function makeEngineMove() {
    if (!AppState.playMode || !AppState.sfWorker || !AppState.playChess) return;
    const chess = AppState.playChess;
    if (chess.game_over()) { _showGameOverMessage(); return; }

    _pendingBestMove = true;
    const fen = chess.fen();

    AppState.sfWorker.onmessage = (e) => {
        const l = e.data;
        if (typeof l !== 'string') return;
        if (l.startsWith('bestmove')) {
            _pendingBestMove = false;
            const parts = l.split(' ');
            const uci = parts[1];
            if (!uci || uci === '(none)') return;
            const from = uci.substring(0, 2);
            const to = uci.substring(2, 4);
            const promotion = uci.length > 4 ? uci[4] : undefined;
            chess.move({ from, to, promotion });
            BoardManager.setPosition(AppState.playBoardId, chess.fen());
            if (chess.game_over()) _showGameOverMessage();
        }
    };

    AppState.sfWorker.postMessage('ucinewgame');
    AppState.sfWorker.postMessage('position fen ' + fen);
    AppState.sfWorker.postMessage('go depth 12');
}

function _showGameOverMessage() {
    const chess = AppState.playChess;
    if (!chess) return;
    let msg = 'Game over: ';
    if (chess.in_checkmate()) msg += chess.turn() === 'w' ? 'Black wins!' : 'White wins!';
    else if (chess.in_stalemate()) msg += 'Stalemate';
    else if (chess.in_draw()) msg += 'Draw';
    else msg += 'Game ended';
    toast(msg);
}

function stopPlayMode() {
    if (!AppState.playMode) return;
    const boardId = AppState.playBoardId;
    AppState.playMode = false;
    AppState.playChess = null;

    const playControls = document.getElementById('play-controls');
    if (playControls) playControls.style.display = 'none';
    const viewerBtns = document.getElementById('gv-nav-btns');
    if (viewerBtns) viewerBtns.style.display = '';

    const detailPlayControls = document.getElementById('detail-play-controls');
    if (detailPlayControls) detailPlayControls.style.display = 'none';

    const playMsg = document.getElementById('play-side-msg');
    if (playMsg) playMsg.style.display = 'none';
    const detailPlayMsg = document.getElementById('detail-play-side-msg');
    if (detailPlayMsg) detailPlayMsg.style.display = 'none';

    if (boardId === 'game-board') {
        const g = AppState.currentGame;
        if (g) {
            BoardManager.create(boardId, g.fens[AppState.currentPly], { flipped: BoardManager.isFlipped(boardId) });
        }
    } else if (boardId === 'detail-board') {
        BoardManager.create(boardId, AppState.currentDetailFen, { flipped: BoardManager.isFlipped(boardId) });
    }

    _pendingBestMove = false;
    if (AppState.engineOn) requestEval(boardId);
}

function resetPlayMode() {
    if (!AppState.playMode || !AppState.playStartFen) return;
    AppState.playChess = new Chess(AppState.playStartFen);
    BoardManager.setPosition(AppState.playBoardId, AppState.playStartFen);
}

function playFromHereGV() {
    const g = AppState.currentGame;
    if (!g) return;
    startPlayMode('game-board', g.fens[AppState.currentPly]);
}

function playFromHereDetail() {
    if (!AppState.currentDetailFen) return;
    startPlayMode('detail-board', AppState.currentDetailFen);
}

window.toggleEngine = toggleEngine;
window.requestEval = requestEval;
window.clearEvalDisplay = clearEvalDisplay;
window.startPlayMode = startPlayMode;
window.stopPlayMode = stopPlayMode;
window.resetPlayMode = resetPlayMode;
window.playFromHereGV = playFromHereGV;
window.playFromHereDetail = playFromHereDetail;
