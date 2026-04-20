let _evalTimer = null;
let _evalId = 0;
let _pendingBestMove = false;
let _multiPVLines = {};
let _currentDepth = 0;

function toggleEngine(boardId) {
    console.log('[ENGINE] toggleEngine called, boardId=', boardId, 'current engineOn=', AppState.engineOn);
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
    console.log('[ENGINE] requestEval called, boardId=', boardId, 'engineOn=', AppState.engineOn, 'sfWorker=', !!AppState.sfWorker);
    if (!AppState.engineOn || !AppState.sfWorker) return;
    clearTimeout(_evalTimer);
    _evalTimer = setTimeout(() => _doEval(boardId), 150);
}

function _doEval(boardId) {
    console.log('[ENGINE] _doEval called, boardId=', boardId, 'engineOn=', AppState.engineOn, 'sfWorker=', !!AppState.sfWorker, '_pendingBestMove=', _pendingBestMove);

    if (!AppState.engineOn || !AppState.sfWorker) {
        console.log('[ENGINE] _doEval early return: engineOn=', AppState.engineOn, 'sfWorker=', !!AppState.sfWorker);
        return;
    }

    if (_pendingBestMove) {
        console.log('[ENGINE] _pendingBestMove was stuck true — resetting it');
        _pendingBestMove = false;
        AppState.sfWorker.postMessage('stop');
    }

    const fen = BoardManager.getPosition(boardId);
    console.log('[ENGINE] FEN from BoardManager.getPosition("' + boardId + '"):', fen);
    if (!fen) {
        console.log('[ENGINE] _doEval early return: no FEN');
        return;
    }

    const multiPVSelect = document.getElementById('detail-multipv');
    const multiPV = multiPVSelect ? multiPVSelect.value : '3';
    console.log('[ENGINE] MultiPV selected:', multiPV);

    const myId = ++_evalId;
    _multiPVLines = {};
    _currentDepth = 0;
    let infoLineCount = 0;
    
    const evalEl = document.getElementById('detail-engine-eval-display') || document.getElementById('engine-eval-display');
    console.log('[ENGINE] Render target element:', evalEl ? evalEl.id : 'NONE FOUND');
    if (evalEl) evalEl.textContent = 'Thinking...';

    const handler = (e) => {
        if (myId !== _evalId) return;
        const l = e.data;
        if (typeof l !== 'string') return;

        if (l.startsWith('info depth')) {
            infoLineCount++;
            if (infoLineCount <= 3) {
                console.log('[ENGINE] info line #' + infoLineCount + ':', l.substring(0, 120));
            }

            const depthMatch = l.match(/depth (\d+)/);
            const pvMatch = l.match(/multipv (\d+)/);
            const scoreMatch = l.match(/score (cp|mate) (-?\d+)/);
            const movesMatch = l.match(/ pv (.+)/);

            if (infoLineCount <= 3) {
                console.log('[ENGINE] Parser results: depth=', depthMatch?.[1], 'multipv=', pvMatch?.[1], 'score=', scoreMatch?.[1], scoreMatch?.[2], 'pv=', movesMatch ? 'yes' : 'NO MATCH');
            }
            
            if (depthMatch && scoreMatch && movesMatch) {
                const depth = parseInt(depthMatch[1]);
                const pvNum = pvMatch ? parseInt(pvMatch[1]) : 1;
                const scoreType = scoreMatch[1];
                const scoreVal = parseInt(scoreMatch[2]);
                const scoreText = scoreType === 'mate' ? `M${scoreVal}` : (scoreVal / 100).toFixed(2);
                const uciMoves = movesMatch[1].trim().split(/\s+/).slice(0, 8);
                
                if (depth > _currentDepth) {
                    _currentDepth = depth;
                    _multiPVLines = {};
                }
                
                _multiPVLines[pvNum] = {
                    depth: depth,
                    score: scoreText,
                    scoreType: scoreType,
                    scoreVal: scoreVal,
                    uci: uciMoves.join(' '),
                    san: null
                };
                
                renderMultiPVDisplay();
                
                if (pvNum === 1) {
                    updateEvalBar(fen, scoreType, scoreVal);
                }
                
                if (depth >= 6) {
                    fetch(API + '/chess/uci-to-san', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fen, uci_moves: uciMoves })
                    }).then(r => r.json()).then(d => {
                        if (myId !== _evalId) return;
                        if (_multiPVLines[pvNum] && d.san) {
                            _multiPVLines[pvNum].san = d.san;
                            renderMultiPVDisplay();
                        }
                    }).catch(() => {});
                }
            } else if (infoLineCount <= 3) {
                console.log('[ENGINE] Line did NOT match parser — skipping');
            }
        } else if (l.startsWith('bestmove')) {
            console.log('[ENGINE] bestmove received, total info lines processed:', infoLineCount);
            AppState.sfWorker.removeEventListener('message', handler);
        }
    };

    AppState.sfWorker.addEventListener('message', handler);
    AppState.sfWorker.postMessage('stop');
    AppState.sfWorker.postMessage('ucinewgame');
    AppState.sfWorker.postMessage('setoption name MultiPV value ' + multiPV);
    AppState.sfWorker.postMessage('position fen ' + fen);
    AppState.sfWorker.postMessage('go depth 18');
    console.log('[ENGINE] Commands sent to Stockfish: stop, ucinewgame, MultiPV=' + multiPV + ', position fen, go depth 18');
}

function renderMultiPVDisplay() {
    const el = document.getElementById('detail-engine-eval-display') || document.getElementById('engine-eval-display');
    if (!el || Object.keys(_multiPVLines).length === 0) {
        console.log('[ENGINE] renderMultiPVDisplay: no element or no lines', el ? el.id : 'NO EL', Object.keys(_multiPVLines).length);
        return;
    }
    
    let html = '';
    const sortedPVs = Object.keys(_multiPVLines).sort((a, b) => parseInt(a) - parseInt(b));
    
    for (const pvNum of sortedPVs) {
        const line = _multiPVLines[pvNum];
        const isTop = pvNum === '1';
        const style = isTop ? 'font-weight:600;' : 'opacity:0.85;';
        const prefix = isTop ? '▶ ' : '  ';
        
        html += `<div style="${style}margin:2px 0">`;
        html += `${prefix}<span style="color:var(--primary);font-size:13px">${line.score}</span> `;
        html += `<span style="font-size:11px;color:var(--text-muted)">d${line.depth}</span> `;
        html += `<span style="font-size:12px">${line.san || line.uci}</span>`;
        html += `</div>`;
    }
    
    console.log('[ENGINE] renderMultiPVDisplay: rendering', sortedPVs.length, 'lines into', el.id);
    el.innerHTML = html;
}

function renderEvalDisplay() {
    renderMultiPVDisplay();
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
    _currentDepth = 0;
    _pendingBestMove = false;
    const el = document.getElementById('detail-engine-eval-display') || document.getElementById('engine-eval-display');
    if (el) el.textContent = '';
    const bar = document.getElementById('eval-bar-fill');
    if (bar) bar.style.height = '50%';
    
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

    const handler = (e) => {
        const l = e.data;
        if (typeof l !== 'string') return;
        if (l.startsWith('bestmove')) {
            _pendingBestMove = false;
            const parts = l.split(' ');
            const uci = parts[1];
            if (!uci || uci === '(none)') {
                AppState.sfWorker.removeEventListener('message', handler);
                return;
            }
            const from = uci.substring(0, 2);
            const to = uci.substring(2, 4);
            const promotion = uci.length > 4 ? uci[4] : undefined;
            chess.move({ from, to, promotion });
            BoardManager.setPosition(AppState.playBoardId, chess.fen());
            if (chess.game_over()) _showGameOverMessage();
            AppState.sfWorker.removeEventListener('message', handler);
        }
    };

    AppState.sfWorker.addEventListener('message', handler);
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
