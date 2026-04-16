async function loadGames() {
    let u = API + '/games/?';
    if (AppState.gameTagFilter) u += 'tag=' + encodeURIComponent(AppState.gameTagFilter) + '&';
    if (AppState.gameCollectionFilter) u += 'collection_id=' + AppState.gameCollectionFilter + '&';
    if (AppState.gameSearch) u += 'search=' + encodeURIComponent(AppState.gameSearch) + '&';
    try {
        const res = await fetch(u);
        AppState.allGames = await res.json();
    } catch (e) {
        AppState.allGames = [];
    }
    AppState.selectedGameIds = new Set();
    renderGamesList();
}

async function loadCollections() {
    AppState.allCollections = await (await fetch(API + '/collections/')).json();
    renderCollectionFilter();
    renderImportCollections();
}

function renderGamesList() {
    const el = document.getElementById('games-list');
    if (!AppState.allGames.length) {
        el.innerHTML = '<div class="empty-state"><p>No games yet</p><p>Import PGN games to get started.</p></div>';
        updateBulkBar();
        return;
    }
    el.innerHTML = AppState.allGames.map(g => {
        const w = g.white || '?';
        const b = g.black || '?';
        const res = g.result || '*';
        const eco = g.eco ? `<span class="text-muted" style="font-size:12px">${g.eco}</span>` : '';
        const opening = g.opening ? `<span class="text-muted" style="font-size:12px">${g.opening}</span>` : '';
        const tags = g.tags.map(t => `<span class="tag">#${t.name}</span>`).join('');
        const checked = AppState.selectedGameIds.has(g.id) ? 'checked' : '';
        return `<div class="pos-item">
            <input type="checkbox" class="game-select" data-id="${g.id}" onclick="event.stopPropagation();toggleGameSelect(${g.id}, this.checked)" ${checked} style="margin-right:8px;width:auto">
            <div style="flex:1;cursor:pointer" onclick="openGame(${g.id})">
                <div style="font-size:14px;font-weight:500">${w} vs ${b} <span class="text-muted">${res}</span></div>
                <div style="margin-top:4px">${eco} ${opening}</div>
                <div style="margin-top:4px">${tags}</div>
            </div>
            <div class="text-muted" style="font-size:12px">${g.move_count || 0} moves</div>
        </div>`;
    }).join('');
    updateBulkBar();
}

function toggleGameSelect(id, checked) {
    if (checked) AppState.selectedGameIds.add(id);
    else AppState.selectedGameIds.delete(id);
    updateBulkBar();
}

function toggleSelectAllGames(checked) {
    if (checked) AppState.allGames.forEach(g => AppState.selectedGameIds.add(g.id));
    else AppState.selectedGameIds.clear();
    document.querySelectorAll('.game-select').forEach(cb => { cb.checked = checked; });
    updateBulkBar();
}

function updateBulkBar() {
    const bar = document.getElementById('bulk-bar');
    if (!bar) return;
    const n = AppState.selectedGameIds.size;
    if (n === 0) {
        bar.style.display = 'none';
    } else {
        bar.style.display = 'flex';
        const countEl = document.getElementById('bulk-count');
        if (countEl) countEl.textContent = n + ' selected';
    }
}

async function deleteSelectedGames() {
    const ids = Array.from(AppState.selectedGameIds);
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} game(s)? This cannot be undone.`)) return;
    let ok = 0, fail = 0;
    for (const id of ids) {
        try {
            const r = await fetch(API + '/games/' + id, { method: 'DELETE' });
            if (r.ok) ok++; else fail++;
        } catch (e) { fail++; }
    }
    AppState.selectedGameIds = new Set();
    toast(`Deleted ${ok} game(s)` + (fail ? `, ${fail} failed` : ''), fail > 0);
    loadGames();
}

function renderGameTagFilters() {
    const el = document.getElementById('game-tag-filters');
    if (!el) return;
    el.innerHTML =
        `<span class="tag tag-filter ${!AppState.gameTagFilter ? 'selected' : ''}" onclick="filterGamesByTag(null)">All</span>` +
        AppState.allTags.map(t => {
            const escaped = t.name.replace(/'/g, "\\'");
            return `<span class="tag tag-filter ${AppState.gameTagFilter === t.name ? 'selected' : ''}" onclick="filterGamesByTag('${escaped}')">#${t.name}</span>`;
        }).join('');
}

function filterGamesByTag(t) {
    AppState.gameTagFilter = t;
    AppState.gameSearch = '';
    const searchInput = document.getElementById('game-search-input');
    if (searchInput) searchInput.value = '';
    renderGameTagFilters();
    loadGames();
}

function renderCollectionFilter() {
    const el = document.getElementById('game-collection-filter');
    el.innerHTML = '<option value="">All Collections</option>' +
        AppState.allCollections.map(c => `<option value="${c.id}" ${AppState.gameCollectionFilter == c.id ? 'selected' : ''}>${c.name} (${c.game_count})</option>`).join('');
}

function onCollectionFilterChange(sel) {
    AppState.gameCollectionFilter = sel.value || null;
    loadGames();
}

let _gameSearchTimer = null;
function onGameSearch() {
    clearTimeout(_gameSearchTimer);
    _gameSearchTimer = setTimeout(() => {
        AppState.gameSearch = document.getElementById('game-search-input').value.trim();
        loadGames();
    }, 300);
}

let _importFile = null;

function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
}

function resetImportView() {
    document.getElementById('import-pgn').value = '';
    document.getElementById('import-tags').value = '';
    document.getElementById('import-new-coll').value = '';
    document.getElementById('import-result').innerHTML = '';
    document.getElementById('import-file-name').textContent = '';
    document.getElementById('import-force').checked = false;
    document.getElementById('import-pgn-file').value = '';
    _importFile = null;
    renderImportCollections();
}

function renderImportCollections() {
    const el = document.getElementById('import-collection-select');
    if (!el) return;
    el.innerHTML = '<option value="">None</option>' +
        AppState.allCollections.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function handlePgnFile(input) {
    const file = input.files[0];
    if (!file) { _importFile = null; return; }
    _importFile = file;
    document.getElementById('import-file-name').textContent =
        `${file.name} (${formatBytes(file.size)}) — will upload on Import`;
    document.getElementById('import-pgn').value = '';
    document.getElementById('import-pgn').placeholder =
        `File selected: ${file.name}. Click Import to upload, or clear file and paste PGN here.`;
}

async function doImport() {
    const resultEl = document.getElementById('import-result');
    const importBtn = document.querySelector('#view-import .btn-primary');
    const pasted = document.getElementById('import-pgn').value.trim();

    if (!_importFile && !pasted) {
        toast('Paste or upload PGN first', true);
        return;
    }

    const tags = document.getElementById('import-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    const collSelect = document.getElementById('import-collection-select');
    const collIds = collSelect.value ? [parseInt(collSelect.value)] : [];
    const force = document.getElementById('import-force').checked;

    if (importBtn) { importBtn.disabled = true; importBtn.textContent = 'Importing...'; }
    resultEl.innerHTML = '<p class="text-muted">Uploading and parsing, please wait…</p>';

    try {
        const newCollName = document.getElementById('import-new-coll').value.trim();
        if (newCollName) {
            const cr = await fetch(API + '/collections/', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({name: newCollName})
            });
            if (cr.ok) {
                const nc = await cr.json();
                collIds.push(nc.id);
                await loadCollections();
            } else if (cr.status !== 409) {
                toast('Failed to create collection', true);
            }
        }

        let pgn;
        if (_importFile) {
            pgn = await _importFile.text();
        } else {
            pgn = pasted;
        }

        const res = await fetch(API + '/games/import', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({pgn_text: pgn, tags, collection_ids: collIds, force})
        });
        const data = await res.json();
        if (res.ok) {
            const dup = data.duplicates || 0;
            let html = `<p style="color:var(--green)">Imported ${data.imported} game(s)`;
            if (dup > 0) html += ` <span class="text-muted">(${dup} duplicate${dup === 1 ? '' : 's'} skipped)</span>`;
            html += '</p>';
            if (data.failed > 0) html += `<p style="color:var(--red)">${data.failed} failed</p>`;
            if (data.errors.length) html += `<details><summary style="cursor:pointer;color:var(--text-muted)">Errors</summary><pre style="font-size:12px;color:var(--red);margin-top:8px">${data.errors.join('\n')}</pre></details>`;
            resultEl.innerHTML = html;
            if (data.imported > 0) {
                setTimeout(() => { showView('games'); loadGames(); }, 1500);
            }
        } else {
            resultEl.innerHTML = `<p style="color:var(--red)">${data.detail || 'Import failed'}</p>`;
        }
    } catch (e) {
        resultEl.innerHTML = `<p style="color:var(--red)">Import error: ${e.message || e}</p>`;
    } finally {
        if (importBtn) { importBtn.disabled = false; importBtn.textContent = 'Import'; }
    }
}

function clearImportFile() {
    _importFile = null;
    document.getElementById('import-pgn-file').value = '';
    document.getElementById('import-file-name').textContent = '';
    document.getElementById('import-pgn').placeholder = 'Paste one or more PGN games...';
}

window.loadGames = loadGames;
window.loadCollections = loadCollections;
window.renderGamesList = renderGamesList;
window.renderGameTagFilters = renderGameTagFilters;
window.filterGamesByTag = filterGamesByTag;
window.renderCollectionFilter = renderCollectionFilter;
window.onCollectionFilterChange = onCollectionFilterChange;
window.onGameSearch = onGameSearch;
window.resetImportView = resetImportView;
window.renderImportCollections = renderImportCollections;
window.handlePgnFile = handlePgnFile;
window.doImport = doImport;
window.clearImportFile = clearImportFile;
window.toggleGameSelect = toggleGameSelect;
window.toggleSelectAllGames = toggleSelectAllGames;
window.deleteSelectedGames = deleteSelectedGames;
