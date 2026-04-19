// Lichess Studies Import functionality

let _lichessImportActive = false;
let _lichessAbortController = null;

// UI Stage Management
function setLichessStage(stage) {
    // Hide all stages
    document.getElementById('lichess-stage-form').style.display = 'none';
    document.getElementById('lichess-stage-downloading').style.display = 'none';
    document.getElementById('lichess-stage-ready').style.display = 'none';
    document.getElementById('lichess-stage-importing').style.display = 'none';
    document.getElementById('lichess-stage-success').style.display = 'none';
    
    // Show the requested stage
    const stageEl = document.getElementById(`lichess-stage-${stage}`);
    if (stageEl) {
        stageEl.style.display = '';
    }
}

function resetLichessImportView() {
    // Clear form but preserve values if just resetting view
    const preserveValues = arguments[0] !== true;
    if (!preserveValues) {
        document.getElementById('lichess-username').value = '';
        document.getElementById('lichess-token').value = '';
    }
    
    // Clear any stored session data
    window._lichessSessionToken = null;
    window._lichessUsername = null;
    window._lichessApiToken = null;
    
    // Reset to Stage A
    setLichessStage('form');
    _lichessImportActive = false;
    _lichessAbortController = null;
}

function _renderLichessProgress(message, current, total) {
    const progressEl = document.getElementById('lichess-progress');
    if (!progressEl) return;
    
    if (current && total) {
        const pct = Math.min(100, (current / total) * 100);
        progressEl.innerHTML = `
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
        progressEl.innerHTML = `
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

function _renderLichessResult(summary, sessionToken) {
    const summaryEl = document.getElementById('lichess-summary');
    if (!summaryEl) return;
    
    const failed = summary.failed_studies || [];
    let html = `
        <div style="padding:12px;background:var(--bg-secondary);border-radius:8px">
            <p style="margin-bottom:4px"><strong>${summary.successful_studies || 0}</strong> of <strong>${summary.studies_count || 0}</strong> studies downloaded</p>
            <p style="margin-bottom:8px"><strong>${summary.chapters_count || 0}</strong> total chapters</p>`;
    
    if (failed.length > 0) {
        html += `<details style="margin-top:8px"><summary style="cursor:pointer;color:var(--text-muted)">Failed studies (${failed.length})</summary>
                 <ul style="margin-top:8px;font-size:12px;color:var(--red)">`;
        failed.forEach(f => {
            html += `<li>${f.name}: ${f.error}</li>`;
        });
        html += `</ul></details>`;
    }
    
    if (summary.chapters_count === 0) {
        html += `<p style="margin-top:12px;color:var(--text-muted);font-size:13px">No chapters to import</p>`;
        // Hide import buttons if no chapters
        document.getElementById('lichess-import-puzzles-btn').style.display = 'none';
        document.getElementById('lichess-import-games-btn').style.display = 'none';
    } else {
        // Store session token and credentials for later use
        window._lichessSessionToken = sessionToken;
        window._lichessUsername = document.getElementById('lichess-username').value.trim();
        window._lichessApiToken = document.getElementById('lichess-token').value.trim();
    }
    
    html += `</div>`;
    summaryEl.innerHTML = html;
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
    const downloadBtn = document.getElementById('lichess-download-btn');
    
    if (!username || !token) {
        toast('Please enter both username and API token', true);
        return;
    }
    
    // Show loading state on button
    setButtonLoading(downloadBtn, true);
    
    // Move to Stage B: Downloading
    setLichessStage('downloading');
    document.getElementById('lichess-downloading-username').textContent = username;
    
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
                    _renderLichessProgress('Connecting to Lichess...');
                } else if (event.type === 'status') {
                    _renderLichessProgress(event.message);
                } else if (event.type === 'progress') {
                    _renderLichessProgress(event.message, event.current, event.total);
                } else if (event.type === 'warning') {
                    console.warn('Lichess import warning:', event.message);
                } else if (event.type === 'summary') {
                    // Summary received, waiting for complete
                } else if (event.type === 'complete') {
                    // Move to Stage C: Ready to import
                    setLichessStage('ready');
                    document.getElementById('lichess-ready-username').textContent = username;
                    _renderLichessResult(event.summary, event.session_token);
                } else if (event.type === 'error') {
                    // Return to Stage A with error
                    setLichessStage('form');
                    setButtonLoading(downloadBtn, false);
                    
                    let errorMsg = '';
                    if (event.status_code === 401) {
                        errorMsg = 'Authentication failed: Invalid API token. Check your token has "Read studies" permission.';
                    } else if (event.status_code === 404) {
                        errorMsg = `User not found: ${event.detail}`;
                    } else {
                        errorMsg = `Download failed: ${event.detail || 'Unknown error'}`;
                    }
                    toast(errorMsg, true);
                }
            }
        }
    } catch (e) {
        if (e.name === 'AbortError') {
            // Return to Stage A on cancel, preserve form values
            setLichessStage('form');
            toast('Download cancelled', false);
        } else {
            // Return to Stage A on error
            setLichessStage('form');
            toast(`Download failed: ${e.message}`, true);
        }
        setButtonLoading(downloadBtn, false);
    } finally {
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
    // Use the cached session token and credentials
    const sessionToken = window._lichessSessionToken;
    const username = window._lichessUsername;
    const apiToken = window._lichessApiToken;
    const importBtn = document.getElementById('lichess-import-puzzles-btn');
    
    if (!sessionToken) {
        toast('No download session found. Please download studies first.', true);
        return;
    }
    
    // Show loading state on button
    setButtonLoading(importBtn, true);
    
    // Move to Stage D: Importing
    setLichessStage('importing');
    document.getElementById('lichess-importing-username').textContent = username;
    
    // Copy summary from ready stage
    const summaryEl = document.getElementById('lichess-summary');
    if (summaryEl) {
        document.getElementById('lichess-importing-summary').innerHTML = summaryEl.innerHTML;
    }
    
    const progressEl = document.getElementById('lichess-import-progress');
    
    try {
        
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
        
        // Show final summary - Stage E: Success
        if (finalSummary) {
            setLichessStage('success');
            
            let summaryHtml = `
                <p style="font-size:20px;margin-bottom:12px">
                    <strong>Imported ${finalSummary.created_count} puzzles</strong>
                </p>`;
            
            if (finalSummary.skipped_no_moves_count > 0 || finalSummary.skipped_duplicates_count > 0) {
                summaryHtml += '<p style="color:var(--text-muted);font-size:14px">';
                if (finalSummary.skipped_no_moves_count > 0) {
                    summaryHtml += `Skipped ${finalSummary.skipped_no_moves_count} chapters with no moves`;
                }
                if (finalSummary.skipped_duplicates_count > 0) {
                    if (finalSummary.skipped_no_moves_count > 0) summaryHtml += ', ';
                    summaryHtml += `${finalSummary.skipped_duplicates_count} duplicates`;
                }
                summaryHtml += '</p>';
            }
            
            document.getElementById('lichess-success-message').innerHTML = summaryHtml;
            
            // Set up the view button
            const viewBtn = document.getElementById('lichess-view-items-btn');
            viewBtn.textContent = 'Go to Puzzles';
            viewBtn.onclick = () => Router.navigate({view:'positions'});
            
            // Reload positions if we're on that page
            if (Router.current().view === 'positions') {
                loadPositions();
            }
        }
        
    } catch (e) {
        // Return to Stage C on error so user can retry
        setLichessStage('ready');
        setButtonLoading(importBtn, false);
        toast(`Puzzle import failed: ${e.message}`, true);
    }
}