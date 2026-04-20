let _sfRunning = false;
let _sfTimeout = null;
let _multiPVLines = {};
let _currentDepth = 0;

function initStockfish() {
    try {
        AppState.sfWorker = new Worker('/vendor/stockfish/stockfish-16-single.js');
        let initialized = false;
        
        AppState.sfWorker.addEventListener('message', (e) => {
            if (typeof e.data === 'string' && e.data.startsWith('uciok')) {
                console.log('Stockfish ready');
                initialized = true;
            }
        });
        
        AppState.sfWorker.addEventListener('error', (e) => {
            console.error('Stockfish worker error:', e);
            const status = document.getElementById('sf-status');
            if (status) status.textContent = 'Engine failed to load';
            const output = document.getElementById('sf-output');
            if (output) output.textContent = 'Engine could not be loaded. Please refresh the page.';
        });
        
        AppState.sfWorker.postMessage('uci');
        console.log('Stockfish worker created');
        
        // Check initialization after delay
        setTimeout(() => {
            if (!initialized) {
                console.warn('Stockfish initialization timeout');
                const status = document.getElementById('sf-status');
                if (status) status.textContent = 'Engine initialization failed';
                const output = document.getElementById('sf-output');
                if (output) output.textContent = 'Engine failed to initialize. Please refresh the page.';
            }
        }, 5000);
    } catch (e) {
        console.error('Stockfish init failed:', e);
        const status = document.getElementById('sf-status');
        if (status) status.textContent = 'Engine unavailable';
        const output = document.getElementById('sf-output');
        if (output) output.textContent = 'Engine could not be created. Please check your browser settings.';
    }
}

function runStockfish() {
    const f = document.getElementById('fen-input').value.trim();
    if (!f) { toast('Enter a FEN first', true); return; }
    if (!AppState.sfWorker) { toast('Stockfish not available', true); return; }
    
    const multiPV = document.getElementById('sf-multipv').value || '3';
    
    document.getElementById('sf-output').textContent = 'Analyzing...';
    document.getElementById('sf-status').textContent = 'Thinking...';
    document.getElementById('sf-btn').disabled = true;
    _sfRunning = true;
    _multiPVLines = {};
    _currentDepth = 0;
    
    // Clear any existing timeout
    if (_sfTimeout) {
        clearTimeout(_sfTimeout);
        _sfTimeout = null;
    }
    
    // Add timeout for the analysis
    _sfTimeout = setTimeout(() => {
        if (_sfRunning) {
            _sfRunning = false;
            document.getElementById('sf-output').textContent = 'Engine not responding. Try reloading the page.';
            document.getElementById('sf-status').textContent = 'Error';
            document.getElementById('sf-btn').disabled = false;
        }
    }, 15000);
    
    const handler = (e) => {
        if (!_sfRunning) return;
        const l = e.data;
        if (typeof l === 'string') {
            const o = document.getElementById('sf-output');
            if (l.startsWith('bestmove')) {
                _sfRunning = false;
                if (_sfTimeout) {
                    clearTimeout(_sfTimeout);
                    _sfTimeout = null;
                }
                document.getElementById('sf-status').textContent = 'Done';
                document.getElementById('sf-btn').disabled = false;
                
                // Format final output for textarea
                let finalText = '';
                for (let i = 1; i <= parseInt(multiPV); i++) {
                    if (_multiPVLines[i]) {
                        const line = _multiPVLines[i];
                        finalText += `Line ${i}: ${line.score} - ${line.san || line.uci}\n`;
                    }
                }
                document.getElementById('pos-stockfish').value = finalText.trim();
                
                // Remove this event listener
                AppState.sfWorker.removeEventListener('message', handler);
            } else if (l.startsWith('info depth')) {
                const depthMatch = l.match(/depth (\d+)/);
                const pvMatch = l.match(/multipv (\d+)/);
                const scoreMatch = l.match(/score (cp|mate) (-?\d+)/);
                const movesMatch = l.match(/pv (.+)/);
                
                if (depthMatch && scoreMatch && movesMatch) {
                    const depth = parseInt(depthMatch[1]);
                    const pvNum = pvMatch ? parseInt(pvMatch[1]) : 1;
                    const scoreType = scoreMatch[1];
                    const scoreVal = scoreMatch[2];
                    const score = scoreType === 'mate' ? `M${scoreVal}` : `${(parseInt(scoreVal) / 100).toFixed(2)}`;
                    const uciMoves = movesMatch[1].trim().split(/\s+/).slice(0, 8); // Show up to 8 moves
                    
                    // Update depth tracking
                    if (depth > _currentDepth) {
                        _currentDepth = depth;
                        _multiPVLines = {}; // Clear old lines when depth increases
                    }
                    
                    // Store this line
                    _multiPVLines[pvNum] = {
                        depth: depth,
                        score: score,
                        uci: uciMoves.join(' '),
                        san: null
                    };
                    
                    // Display current lines immediately with UCI
                    let output = `Depth ${_currentDepth}:\n`;
                    for (let i = 1; i <= parseInt(multiPV); i++) {
                        if (_multiPVLines[i]) {
                            const line = _multiPVLines[i];
                            const prefix = i === 1 ? '▶ ' : '  ';
                            output += `${prefix}${i}. [${line.score}] ${line.san || line.uci}\n`;
                        }
                    }
                    o.textContent = output.trim();
                    
                    // Optionally enhance with SAN later (async, non-blocking)
                    const fen = document.getElementById('fen-input').value.trim();
                    fetch(API + '/chess/uci-to-san', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fen, uci_moves: uciMoves })
                    }).then(r => r.json()).then(d => {
                        if (_sfRunning && _multiPVLines[pvNum]) {
                            _multiPVLines[pvNum].san = d.san;
                            
                            // Re-render with SAN
                            let output = `Depth ${_currentDepth}:\n`;
                            for (let i = 1; i <= parseInt(multiPV); i++) {
                                if (_multiPVLines[i]) {
                                    const line = _multiPVLines[i];
                                    const prefix = i === 1 ? '▶ ' : '  ';
                                    output += `${prefix}${i}. [${line.score}] ${line.san || line.uci}\n`;
                                }
                            }
                            o.textContent = output.trim();
                        }
                    }).catch(() => {
                        // Error already handled - UCI shown above
                    });
                }
            }
        }
    };
    
    AppState.sfWorker.addEventListener('message', handler);
    AppState.sfWorker.postMessage('ucinewgame');
    AppState.sfWorker.postMessage('setoption name MultiPV value ' + multiPV);
    AppState.sfWorker.postMessage('position fen ' + f);
    AppState.sfWorker.postMessage('go depth 20');
}

window.initStockfish = initStockfish;
window.runStockfish = runStockfish;