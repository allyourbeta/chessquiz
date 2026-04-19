// Lichess Studies Import functionality

let _lichessImportActive = false;
let _lichessAbortController = null;

function resetLichessImportView() {
    document.getElementById('lichess-username').value = '';
    document.getElementById('lichess-token').value = '';
    document.getElementById('lichess-result').innerHTML = '';
    document.getElementById('lichess-import-btn').style.display = '';
    document.getElementById('lichess-cancel-btn').style.display = 'none';
    _lichessImportActive = false;
    _lichessAbortController = null;
}

function _renderLichessProgress(resultEl, message, current, total) {
    if (current && total) {
        const pct = Math.min(100, (current / total) * 100);
        resultEl.innerHTML = `
            <div style="margin-bottom:8px;font-size:13px">
                <strong>${current}</strong> of <strong>${total}</strong> studies downloaded
            </div>
            <div style="width:100%;height:14px;background:var(--grey-100);border-radius:6px;overflow:hidden">
                <div style="height:100%;width:${pct.toFixed(1)}%;background:var(--green);transition:width 0.2s"></div>
            </div>
            <div style="margin-top:6px;font-size:12px;color:var(--text-muted)">
                ${message}
            </div>`;
    } else {
        resultEl.innerHTML = `
            <div style="text-align:center;padding:20px">
                <div style="display:inline-block;animation:spin 1s linear infinite;width:24px;height:24px;border:3px solid var(--border);border-top:3px solid var(--accent);border-radius:50%"></div>
                <p style="margin-top:12px;font-size:14px">${message}</p>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>`;
    }
}

function _renderLichessResult(resultEl, summary, sessionToken) {
    const failed = summary.failed_studies || [];
    let html = `
        <div style="padding:12px;background:var(--bg-secondary);border-radius:8px;margin-top:12px">
            <h4 style="margin-bottom:8px;color:var(--green)">Import Complete!</h4>
            <p style="margin-bottom:4px"><strong>${summary.successful_studies || 0}</strong> of <strong>${summary.studies_count || 0}</strong> studies downloaded</p>
            <p style="margin-bottom:8px"><strong>${summary.chapters_count || 0}</strong> total chapters (games)</p>`;
    
    if (failed.length > 0) {
        html += `<details style="margin-top:8px"><summary style="cursor:pointer;color:var(--text-muted)">Failed studies (${failed.length})</summary>
                 <ul style="margin-top:8px;font-size:12px;color:var(--red)">`;
        failed.forEach(f => {
            html += `<li>${f.name}: ${f.error}</li>`;
        });
        html += `</ul></details>`;
    }
    
    if (sessionToken && summary.chapters_count > 0) {
        // Store session token and credentials for later use
        window._lichessSessionToken = sessionToken;
        window._lichessUsername = document.getElementById('lichess-username').value.trim();
        window._lichessApiToken = document.getElementById('lichess-token').value.trim();
        html += `
            <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
                <p style="margin-bottom:8px;font-size:13px;color:var(--text-muted)">Ready to import ${summary.chapters_count} chapters into ChessQuiz</p>
                <div class="btn-row" style="gap:8px">
                    <button class="btn btn-primary" onclick="importLichessPuzzles()">Import as Puzzles</button>
                    <button class="btn btn-secondary" onclick="importLichessPGN()">Import as Games</button>
                </div>
            </div>`;
    } else if (summary.chapters_count === 0) {
        html += `<p style="margin-top:12px;color:var(--text-muted);font-size:13px">No games to import</p>`;
    }
    
    html += `</div>`;
    resultEl.innerHTML = html;
}

async function importLichessPGN() {
    // Import as regular games - this feature is not yet implemented
    // Per the spec, we focus on the puzzle import first
    toast('Import as Games feature coming soon. Use Import as Puzzles for now.', false);
    
    // When implemented, this would:
    // 1. Use the session token to retrieve cached PGN
    // 2. Navigate to game import page with the PGN pre-filled
    // 3. Or directly import the games via an API endpoint
}

async function doLichessImport() {
    const username = document.getElementById('lichess-username').value.trim();
    const token = document.getElementById('lichess-token').value.trim();
    const resultEl = document.getElementById('lichess-result');
    
    if (!username || !token) {
        toast('Please enter both username and API token', true);
        return;
    }
    
    // Show/hide buttons
    document.getElementById('lichess-import-btn').style.display = 'none';
    document.getElementById('lichess-cancel-btn').style.display = '';
    _lichessImportActive = true;
    _lichessAbortController = new AbortController();
    
    try {
        const response = await fetch(API + '/lichess/import-studies', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                lichess_username: username,
                lichess_api_token: token
            }),
            signal: _lichessAbortController.signal
        });
        
        if (!response.ok || !response.body) {
            throw new Error(`Request failed: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, {stream: true});
            let idx;
            while ((idx = buffer.indexOf('\n\n')) !== -1) {
                const chunk = buffer.slice(0, idx);
                buffer = buffer.slice(idx + 2);
                
                const line = chunk.split('\n').find(l => l.startsWith('data:'));
                if (!line) continue;
                
                let event;
                try {
                    event = JSON.parse(line.slice(5).trim());
                } catch (_) {
                    continue;
                }
                
                if (event.type === 'start') {
                    _renderLichessProgress(resultEl, 'Connecting to Lichess...');
                } else if (event.type === 'status') {
                    _renderLichessProgress(resultEl, event.message);
                } else if (event.type === 'progress') {
                    _renderLichessProgress(resultEl, event.message, event.current, event.total);
                } else if (event.type === 'warning') {
                    // Could append warnings to a list if desired
                    console.warn('Lichess import warning:', event.message);
                } else if (event.type === 'summary') {
                    // Summary received, waiting for complete
                } else if (event.type === 'complete') {
                    _renderLichessResult(resultEl, event.summary, event.session_token);
                } else if (event.type === 'error') {
                    if (event.status_code === 401) {
                        resultEl.innerHTML = `
                            <div style="padding:12px;background:var(--bg-error);border-radius:8px;color:var(--red)">
                                <h4>Authentication Failed</h4>
                                <p style="margin-top:8px">${event.detail}</p>
                                <p style="margin-top:8px">To get a token:</p>
                                <ol style="margin-top:4px;margin-left:20px">
                                    <li>Go to <a href="https://lichess.org/account/oauth/token" target="_blank">lichess.org/account/oauth/token</a></li>
                                    <li>Create a new token with "Read studies" permission</li>
                                    <li>Copy the token immediately (it's only shown once)</li>
                                </ol>
                            </div>`;
                    } else if (event.status_code === 404) {
                        resultEl.innerHTML = `
                            <div style="padding:12px;background:var(--bg-error);border-radius:8px;color:var(--red)">
                                <h4>User Not Found</h4>
                                <p style="margin-top:8px">${event.detail}</p>
                            </div>`;
                    } else {
                        resultEl.innerHTML = `
                            <div style="padding:12px;background:var(--bg-error);border-radius:8px;color:var(--red)">
                                <h4>Import Failed</h4>
                                <p style="margin-top:8px">${event.detail || 'Unknown error'}</p>
                            </div>`;
                    }
                }
            }
        }
    } catch (e) {
        if (e.name === 'AbortError') {
            resultEl.innerHTML = '<p style="color:var(--text-muted)">Import cancelled</p>';
        } else {
            resultEl.innerHTML = `
                <div style="padding:12px;background:var(--bg-error);border-radius:8px;color:var(--red)">
                    <h4>Import Failed</h4>
                    <p style="margin-top:8px">${e.message}</p>
                </div>`;
        }
    } finally {
        document.getElementById('lichess-import-btn').style.display = '';
        document.getElementById('lichess-cancel-btn').style.display = 'none';
        _lichessImportActive = false;
        _lichessAbortController = null;
    }
}

function cancelLichessImport() {
    if (_lichessAbortController) {
        _lichessAbortController.abort();
    }
}

async function importLichessPuzzles() {
    const resultEl = document.getElementById('lichess-result');
    
    // Use the cached session token and credentials
    const sessionToken = window._lichessSessionToken;
    const username = window._lichessUsername;
    const apiToken = window._lichessApiToken;
    
    if (!sessionToken) {
        toast('No download session found. Please download studies first.', true);
        return;
    }
    
    try {
        // Update UI to show progress
        resultEl.innerHTML = `
            <div style="padding:12px;background:var(--bg-secondary);border-radius:8px;margin-top:12px">
                <h4 style="margin-bottom:8px">Creating Puzzles...</h4>
                <div id="puzzle-import-progress"></div>
            </div>`;
        
        const progressEl = document.getElementById('puzzle-import-progress');
        
        // Call the puzzle import API with session token
        const importResponse = await fetch(API + '/import-puzzles', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                session_token: sessionToken,
                lichess_username: username,
                lichess_api_token: apiToken
            })
        });
        
        if (!importResponse.ok || !importResponse.body) {
            throw new Error(`Import failed: ${importResponse.status}`);
        }
        
        const reader = importResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalSummary = null;
        
        while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, {stream: true});
            let idx;
            while ((idx = buffer.indexOf('\n\n')) !== -1) {
                const chunk = buffer.slice(0, idx);
                buffer = buffer.slice(idx + 2);
                
                const line = chunk.split('\n').find(l => l.startsWith('data:'));
                if (!line) continue;
                
                let event;
                try {
                    event = JSON.parse(line.slice(5).trim());
                } catch (_) {
                    continue;
                }
                
                if (event.type === 'status') {
                    progressEl.innerHTML = `<p style="font-size:14px">${event.message}</p>`;
                } else if (event.type === 'progress') {
                    const pct = Math.min(100, (event.current / event.total) * 100);
                    progressEl.innerHTML = `
                        <div style="margin-bottom:8px;font-size:13px">
                            Creating puzzle <strong>${event.current}</strong> of <strong>${event.total}</strong>
                        </div>
                        <div style="width:100%;height:14px;background:var(--grey-100);border-radius:6px;overflow:hidden">
                            <div style="height:100%;width:${pct.toFixed(1)}%;background:var(--green);transition:width 0.2s"></div>
                        </div>`;
                } else if (event.type === 'complete') {
                    finalSummary = event.summary;
                } else if (event.type === 'error') {
                    throw new Error(event.detail || 'Import failed');
                }
            }
        }
        
        // Show final summary
        if (finalSummary) {
            let summaryHtml = `
                <div style="padding:12px;background:var(--bg-secondary);border-radius:8px;margin-top:12px">
                    <h4 style="margin-bottom:8px;color:var(--green)">Puzzle Import Complete!</h4>
                    <p style="margin-bottom:4px">✓ Created <strong>${finalSummary.created_count}</strong> puzzles</p>`;
            
            if (finalSummary.skipped_no_moves_count > 0) {
                summaryHtml += `<p style="margin-bottom:4px;color:var(--text-muted)">⚬ ${finalSummary.skipped_no_moves_count} chapters skipped (no moves)</p>`;
            }
            if (finalSummary.skipped_duplicates_count > 0) {
                summaryHtml += `<p style="margin-bottom:4px;color:var(--text-muted)">⚬ ${finalSummary.skipped_duplicates_count} duplicates skipped</p>`;
            }
            
            if (finalSummary.created_puzzles && finalSummary.created_puzzles.length > 0) {
                summaryHtml += `
                    <details style="margin-top:8px">
                        <summary style="cursor:pointer;font-size:13px;color:var(--text-muted)">Sample puzzles created</summary>
                        <ul style="margin-top:8px;font-size:12px">`;
                finalSummary.created_puzzles.slice(0, 5).forEach(p => {
                    summaryHtml += `<li>${p.title} → ${p.solution}</li>`;
                });
                summaryHtml += `</ul></details>`;
            }
            
            summaryHtml += `
                    <div style="margin-top:12px">
                        <button class="btn btn-primary" onclick="Router.navigate({view:'positions'})">View Puzzles</button>
                    </div>
                </div>`;
            
            resultEl.innerHTML = summaryHtml;
            
            // Reload positions if we're on that page
            if (Router.current().view === 'positions') {
                loadPositions();
            }
        }
        
    } catch (e) {
        resultEl.innerHTML = `
            <div style="padding:12px;background:var(--bg-error);border-radius:8px;color:var(--red)">
                <h4>Puzzle Import Failed</h4>
                <p style="margin-top:8px">${e.message}</p>
            </div>`;
    }
}