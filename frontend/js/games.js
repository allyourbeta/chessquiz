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
        return;
    }
    el.innerHTML = AppState.allGames.map(g => {
        const w = g.white || '?';
        const b = g.black || '?';
        const res = g.result || '*';
        const eco = g.eco ? `<span class="text-muted" style="font-size:12px">${g.eco}</span>` : '';
        const opening = g.opening ? `<span class="text-muted" style="font-size:12px">${g.opening}</span>` : '';
        const tags = g.tags.map(t => `<span class="tag">#${t.name}</span>`).join('');
        return `<div class="pos-item" onclick="openGame(${g.id})">
            <div style="flex:1">
                <div style="font-size:14px;font-weight:500">${w} vs ${b} <span class="text-muted">${res}</span></div>
                <div style="margin-top:4px">${eco} ${opening}</div>
                <div style="margin-top:4px">${tags}</div>
            </div>
            <div class="text-muted" style="font-size:12px">${g.move_count || 0} moves</div>
        </div>`;
    }).join('');
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

function showImportModal() {
    document.getElementById('import-modal').style.display = 'flex';
    document.getElementById('import-pgn').value = '';
    document.getElementById('import-tags').value = '';
    document.getElementById('import-result').innerHTML = '';
    document.getElementById('import-new-coll').value = '';
    renderImportCollections();
}

function hideImportModal() {
    document.getElementById('import-modal').style.display = 'none';
}

function renderImportCollections() {
    const el = document.getElementById('import-collection-select');
    if (!el) return;
    el.innerHTML = '<option value="">None</option>' +
        AppState.allCollections.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function handlePgnFile(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => { document.getElementById('import-pgn').value = e.target.result; };
    reader.readAsText(file);
}

async function doImport() {
    const pgn = document.getElementById('import-pgn').value.trim();
    if (!pgn) { toast('Paste or upload PGN first', true); return; }

    const tags = document.getElementById('import-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    const collSelect = document.getElementById('import-collection-select');
    const collIds = collSelect.value ? [parseInt(collSelect.value)] : [];

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

    const res = await fetch(API + '/games/import', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({pgn_text: pgn, tags, collection_ids: collIds})
    });
    const data = await res.json();
    const el = document.getElementById('import-result');
    if (res.ok) {
        let html = `<p style="color:var(--green)">Imported ${data.imported} game(s)</p>`;
        if (data.failed > 0) html += `<p style="color:var(--red)">${data.failed} failed</p>`;
        if (data.errors.length) html += `<details><summary style="cursor:pointer;color:var(--text-muted)">Errors</summary><pre style="font-size:12px;color:var(--red);margin-top:8px">${data.errors.join('\n')}</pre></details>`;
        el.innerHTML = html;
        if (data.imported > 0) {
            setTimeout(() => { hideImportModal(); loadGames(); }, 1500);
        }
    } else {
        el.innerHTML = `<p style="color:var(--red)">${data.detail || 'Import failed'}</p>`;
    }
}

window.loadGames = loadGames;
window.loadCollections = loadCollections;
window.renderGamesList = renderGamesList;
window.renderGameTagFilters = renderGameTagFilters;
window.filterGamesByTag = filterGamesByTag;
window.renderCollectionFilter = renderCollectionFilter;
window.onCollectionFilterChange = onCollectionFilterChange;
window.onGameSearch = onGameSearch;
window.showImportModal = showImportModal;
window.hideImportModal = hideImportModal;
window.handlePgnFile = handlePgnFile;
window.doImport = doImport;
