async function loadPositions() {
    let u = API + '/positions/';
    const tags = AppState.positionTagFilters || [];
    if (tags.length) {
        u += '?' + tags.map(t => 'tags=' + encodeURIComponent(t)).join('&');
    }
    AppState.allPositions = await (await fetch(u)).json();
    renderPositionsList();
}

function mountPositionTagFilter() {
    TagFilter.mount({
        containerId: 'tag-filters',
        state: { tags: AppState.positionTagFilters },
        onChange: tags => {
            AppState.positionTagFilters = tags;
            if (!Router.isRendering()) {
                const route = { view: 'positions', params: tags.length ? { tags: tags.slice() } : {} };
                history.pushState(route, '', Router.build(route));
            }
            loadPositions();
        },
        placeholder: 'Filter by tag...',
    });
}

async function savePosition() {
    const editId = document.getElementById('edit-id').value;
    const fen = document.getElementById('fen-input').value.trim();
    const title = document.getElementById('pos-title').value.trim();
    const tags = document.getElementById('pos-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    const notes = document.getElementById('pos-notes').value.trim();
    const sf = document.getElementById('pos-stockfish').value.trim();
    if (!fen) { toast('FEN is required', true); return; }
    const body = { fen, title: title || null, notes: notes || null, stockfish_analysis: sf || null, tags };
    let res;
    if (editId) res = await fetch(API + '/positions/' + editId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    else res = await fetch(API + '/positions/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
        toast(editId ? 'Position updated!' : 'Position saved!');
        clearForm();
        Router.navigate({ view: 'positions' });
    } else {
        const err = await res.json();
        toast(err.detail || 'Error saving', true);
    }
}

async function deletePosition() {
    const id = document.getElementById('edit-id').value;
    if (!id || !confirm('Delete this position?')) return;
    if ((await fetch(API + '/positions/' + id, { method: 'DELETE' })).ok) {
        toast('Position deleted');
        clearForm();
        Router.navigate({ view: 'positions' });
    }
}

// Navigation entry: push history and let router render.
function showDetail(id) {
    Router.navigate({ view: 'positionDetail', id });
}

// Called by renderRoute for deep link /positions/:id.
async function loadPositionDetail(id) {
    const pos = await (await fetch(API + '/positions/' + id)).json();
    AppState.currentDetailId = id;
    AppState.currentDetailFen = pos.fen;
    AppState.detailFlipped = false;
    document.getElementById('detail-title').textContent = pos.title || 'Untitled';
    document.getElementById('detail-fen').textContent = pos.fen;
    document.getElementById('detail-notes').textContent = pos.notes || '(none)';
    document.getElementById('detail-stockfish').textContent = pos.stockfish_analysis || '(none)';
    document.getElementById('detail-tags').innerHTML = pos.tags.map(t => `<span class="tag">#${t.name}</span>`).join('');
    const s = await (await fetch(API + '/quiz/stats/' + id)).json();
    document.getElementById('detail-stats').textContent = s.total_attempts > 0 ? `${s.total_attempts} attempts, ${(s.accuracy * 100).toFixed(0)}% accuracy` : 'No quiz attempts yet';
    if (AppState.playMode) stopPlayMode();
    BoardManager.create('detail-board', pos.fen, { flipped: false });
    if (AppState.engineOn) requestEval('detail-board');
}

function editPosition() {
    if (!AppState.currentDetailId) return;
    fetch(API + '/positions/' + AppState.currentDetailId).then(r => r.json()).then(pos => {
        document.getElementById('edit-id').value = pos.id;
        document.getElementById('fen-input').value = pos.fen;
        document.getElementById('pos-title').value = pos.title || '';
        document.getElementById('pos-tags').value = pos.tags.map(t => t.name).join(', ');
        document.getElementById('pos-notes').value = pos.notes || '';
        document.getElementById('pos-stockfish').value = pos.stockfish_analysis || '';
        document.getElementById('form-title').textContent = 'Edit Position';
        document.getElementById('delete-btn').style.display = 'inline-flex';
        AppState.boardFen = pos.fen;
        Router.navigate({ view: 'addPosition' });
        BoardManager.setPosition('board', AppState.boardFen);
    });
}

function renderPositionsList() {
    const el = document.getElementById('positions-list');
    if (!AppState.allPositions.length) {
        el.innerHTML = `<div class="empty-state"><p>No positions yet</p><p>Click "Add New" to save your first chess position.</p></div>`;
        return;
    }
    el.innerHTML = AppState.allPositions.map(p =>
        `<div class="pos-item" onclick="showDetail(${p.id})">${renderMiniBoard(p.fen)}<div class="title">${p.title || 'Untitled'}</div><div>${p.tags.map(t => `<span class="tag">#${t.name}</span>`).join('')}</div></div>`
    ).join('');
}

function loadFen() {
    const f = document.getElementById('fen-input').value.trim();
    if (f) {
        AppState.boardFen = f;
        BoardManager.setPosition('board', AppState.boardFen);
    }
}

function setStartPos() {
    const f = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    document.getElementById('fen-input').value = f;
    AppState.boardFen = f;
    BoardManager.setPosition('board', AppState.boardFen);
}

function flipBoard() {
    BoardManager.flip('board');
}

function flipDetailBoard() {
    BoardManager.flip('detail-board');
}

async function deleteFromDetail() {
    const id = AppState.currentDetailId;
    if (!id || !confirm('Delete this position?')) return;
    if ((await fetch(API + '/positions/' + id, { method: 'DELETE' })).ok) {
        toast('Position deleted');
        Router.navigate({ view: 'positions' });
    }
}

function clearForm() {
    document.getElementById('edit-id').value = '';
    document.getElementById('fen-input').value = '';
    document.getElementById('pos-title').value = '';
    document.getElementById('pos-tags').value = '';
    document.getElementById('pos-notes').value = '';
    document.getElementById('pos-stockfish').value = '';
    document.getElementById('sf-output').textContent = 'Engine output will appear here...';
    document.getElementById('form-title').textContent = 'New Position';
    document.getElementById('delete-btn').style.display = 'none';
    AppState.boardFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    BoardManager.create('board', AppState.boardFen, { flipped: false });
    const saved = AppState.lastTags || localStorage.getItem('chessquiz-last-tags') || '';
    if (saved) document.getElementById('pos-tags').value = saved;
}

function setupAutoLoad() {
    const inp = document.getElementById('fen-input');
    inp.addEventListener('input', () => {
        const v = inp.value.trim();
        if (v.includes('/') && v.length > 10) {
            AppState.boardFen = v;
            BoardManager.setPosition('board', AppState.boardFen);
        }
    });
}

function setupKeyboardSave() {
    document.addEventListener('keydown', e => {
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            const addView = document.getElementById('view-add');
            if (addView && addView.classList.contains('active')) {
                savePosition();
            }
        }
    });
}

function setupUrlParams() {
    // Legacy ?fen= query shortcut: if present on initial load, open Add view.
    // Rewrite URL to /positions/new before Router.init() so it renders that.
    const p = new URLSearchParams(window.location.search);
    const fen = p.get('fen');
    if (fen) {
        document.getElementById('fen-input').value = fen;
        AppState.boardFen = fen;
        BoardManager.setPosition('board', AppState.boardFen);
        window.history.replaceState(null, '', '/positions/new');
    }
}

const _origSavePosition = savePosition;
savePosition = async function() {
    const tagsField = document.getElementById('pos-tags');
    AppState.lastTags = tagsField.value;
    localStorage.setItem('chessquiz-last-tags', AppState.lastTags);
    return _origSavePosition.apply(this, arguments);
};

window.loadPositions = loadPositions;
window.mountPositionTagFilter = mountPositionTagFilter;
window.savePosition = savePosition;
window.deletePosition = deletePosition;
window.showDetail = showDetail;
window.loadPositionDetail = loadPositionDetail;
window.editPosition = editPosition;
window.renderPositionsList = renderPositionsList;
window.loadFen = loadFen;
window.setStartPos = setStartPos;
window.flipBoard = flipBoard;
window.flipDetailBoard = flipDetailBoard;
window.deleteFromDetail = deleteFromDetail;
window.clearForm = clearForm;
window.setupAutoLoad = setupAutoLoad;
window.setupKeyboardSave = setupKeyboardSave;
window.setupUrlParams = setupUrlParams;
