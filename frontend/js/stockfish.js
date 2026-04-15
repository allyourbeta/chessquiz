function initStockfish() {
    fetch('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js')
        .then(r => r.blob())
        .then(blob => {
            AppState.sfWorker = new Worker(URL.createObjectURL(blob));
            AppState.sfWorker.onmessage = e => {
                const l = e.data;
                if (typeof l === 'string') {
                    const o = document.getElementById('sf-output');
                    if (l.startsWith('bestmove')) {
                        document.getElementById('sf-status').textContent = 'Done';
                        document.getElementById('sf-btn').disabled = false;
                        document.getElementById('pos-stockfish').value = o.textContent.trim();
                    } else if (l.startsWith('info depth')) {
                        const m = l.match(/depth (\d+).*score (cp|mate) (-?\d+).*pv (.+)/);
                        if (m) {
                            const s = m[2] === 'mate' ? `Mate in ${m[3]}` : `${(+m[3] / 100).toFixed(2)}`;
                            const uciMoves = m[4].trim().split(/\s+/);
                            const fen = document.getElementById('fen-input').value.trim();
                            fetch(API + '/chess/uci-to-san', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ fen, uci_moves: uciMoves })
                            }).then(r => r.json()).then(d => {
                                o.textContent = `Depth ${m[1]}: ${s}\nLine: ${d.san}`;
                            }).catch(() => {
                                o.textContent = `Depth ${m[1]}: ${s}\nLine: ${m[4]}`;
                            });
                        }
                    }
                }
            };
            AppState.sfWorker.postMessage('uci');
            console.log('Stockfish loaded');
        })
        .catch(e => {
            console.log('Stockfish load failed:', e);
            document.getElementById('sf-status').textContent = 'Engine unavailable';
        });
}

function runStockfish() {
    const f = document.getElementById('fen-input').value.trim();
    if (!f) { toast('Enter a FEN first', true); return; }
    if (!AppState.sfWorker) { toast('Stockfish not available', true); return; }
    document.getElementById('sf-output').textContent = 'Analyzing...';
    document.getElementById('sf-status').textContent = 'Thinking...';
    document.getElementById('sf-btn').disabled = true;
    AppState.sfWorker.postMessage('ucinewgame');
    AppState.sfWorker.postMessage('position fen ' + f);
    AppState.sfWorker.postMessage('go depth 20');
}

window.initStockfish = initStockfish;
window.runStockfish = runStockfish;
