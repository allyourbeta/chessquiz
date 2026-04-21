async function loadPositions() {
    let u = API + '/positions/';
    const tags = AppState.positionTagFilters || [];
    if (tags.length) {
        u += '?' + tags.map(t => 'tags=' + encodeURIComponent(t)).join('&');
    }
    AppState.allPositions = await (await fetch(u)).json();
    renderPositionsList();
}

async function loadTabiyas() {
    let u = API + '/positions/?position_type=tabiya';
    const tags = AppState.positionTagFilters || [];
    if (tags.length) {
        u += '&' + tags.map(t => 'tags=' + encodeURIComponent(t)).join('&');
    }
    const positions = await (await fetch(u)).json();
    AppState.allPositions = positions;
    renderTabiyasList();
}

async function loadTactics() {
    let u = API + '/positions/?position_type=puzzle';
    const tags = AppState.positionTagFilters || [];
    if (tags.length) {
        u += '&' + tags.map(t => 'tags=' + encodeURIComponent(t)).join('&');
    }
    const positions = await (await fetch(u)).json();
    AppState.allPositions = positions;
    renderTacticsList();
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

function mountTabiyaTagFilter() {
    TagFilter.mount({
        containerId: 'tabiyas-tag-filters',
        state: { tags: AppState.positionTagFilters },
        onChange: tags => {
            AppState.positionTagFilters = tags;
            if (!Router.isRendering()) {
                const route = { view: 'tabiyas', params: tags.length ? { tags: tags.slice() } : {} };
                history.pushState(route, '', Router.build(route));
            }
            loadTabiyas();
        },
        placeholder: 'Filter by tag...',
    });
}

function mountTacticsTagFilter() {
    TagFilter.mount({
        containerId: 'tactics-tag-filters',
        state: { tags: AppState.positionTagFilters },
        onChange: tags => {
            AppState.positionTagFilters = tags;
            if (!Router.isRendering()) {
                const route = { view: 'tactics', params: tags.length ? { tags: tags.slice() } : {} };
                history.pushState(route, '', Router.build(route));
            }
            loadTactics();
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
    const body = { 
        fen, 
        title: title || null, 
        notes: notes || null, 
        stockfish_analysis: sf || null, 
        position_type: AppState.addPositionType || 'tabiya',
        tags 
    };
    let res;
    if (editId) res = await fetch(API + '/positions/' + editId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    else res = await fetch(API + '/positions/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
        toast(editId ? 'Position updated!' : 'Position saved!');
        clearForm();
        // Navigate to appropriate view based on position type
        const viewToGo = AppState.addPositionType === 'puzzle' ? 'tactics' : 'tabiyas';
        Router.navigate({ view: viewToGo });
    } else {
        const err = await res.json();
        // Show duplicate error or other error prominently
        const errorMsg = err.detail || 'Error saving';
        toast(errorMsg, true);
        // Also show in the form for visibility
        const formTitle = document.getElementById('form-title');
        if (formTitle && err.detail && err.detail.includes('already exists')) {
            formTitle.style.color = 'var(--danger, red)';
            formTitle.textContent = err.detail;
            setTimeout(() => {
                formTitle.style.color = '';
                formTitle.textContent = AppState.addPositionType === 'puzzle' ? 'New Tactic' : 'New Tabiya';
            }, 3000);
        }
    }
}

async function deletePosition() {
    const id = document.getElementById('edit-id').value;
    if (!id || !confirm('Delete this position?')) return;
    if ((await fetch(API + '/positions/' + id, { method: 'DELETE' })).ok) {
        topBanner('Position deleted');
        clearForm();
        Router.navigate({ view: 'tabiyas' });
    }
}

// Navigation entry: push history and let router render.
function showDetail(id) {
    // Find the position to determine its type for routing
    const pos = AppState.allPositions.find(p => p.id === id);
    const positionType = pos ? pos.position_type : 'tabiya';
    Router.navigate({ view: 'positionDetail', id, positionType });
}

// Called by renderRoute for deep link /positions/:id.
async function loadPositionDetail(id) {
    const pos = await (await fetch(API + '/positions/' + id)).json();
    AppState.currentDetailId = id;
    AppState.currentDetailFen = pos.fen;
    AppState.currentDetailType = pos.position_type || 'tabiya'; // Store type for other functions
    AppState.detailFlipped = false;
    
    // Always show these for both puzzles and tabiyas
    document.getElementById('detail-title').textContent = pos.title || 'Untitled';
    document.getElementById('detail-fen').textContent = pos.fen;
    const notesEl = document.getElementById('detail-notes');
    notesEl.value = pos.notes || '';
    notesEl._lastSaved = pos.notes || '';
    notesEl.oninput = _onDetailNotesInput;
    notesEl.onblur = _autoSaveDetailNotes;
    document.getElementById('detail-tags').innerHTML = pos.tags.map(t => `<span class="tag">#${t.name}</span>`).join('');
    
    // PHASE 19 INVESTIGATION: Previous attempts failed because:
    // 1. detail-stockfish-card was INSIDE Position Info Card, not a separate card
    // 2. "Your Moves From Here" card had no ID to hide it
    // 3. Conditional logic existed but couldn't fully hide/show the right elements
    // Fixed by: Restructuring HTML into separate cards with proper IDs
    
    // Handle UI based on position type
    if (pos.position_type === 'puzzle') {
        // TACTIC/PUZZLE UI: Show ONLY title, tags, FEN, notes, board, action buttons, engine output
        document.getElementById('detail-stockfish-card').style.display = 'none';
        document.getElementById('detail-stats-card').style.display = 'none';
        document.getElementById('practice-section').style.display = 'none';
        document.getElementById('practice-history-section').style.display = 'none';
        document.getElementById('aggregate-stats-section').style.display = 'none';
        document.getElementById('your-moves-section').style.display = 'none';
        
        // Update back button text
        const backBtn = document.getElementById('detail-back-btn');
        if (backBtn) backBtn.textContent = 'Back to Tactics';
        
        // Hide puzzle navigation (removed feature)
        document.getElementById('prev-puzzle-btn').style.display = 'none';
        document.getElementById('next-puzzle-btn').style.display = 'none';
        const counter = document.getElementById('puzzle-counter');
        if (counter) counter.style.display = 'none';
    } else {
        // TABIYA UI: Show everything except Quiz Stats and Stockfish (disabled)
        document.getElementById('detail-stockfish-card').style.display = 'none';
        document.getElementById('detail-stats-card').style.display = 'none';
        document.getElementById('practice-section').style.display = 'none';
        document.getElementById('practice-history-section').style.display = 'none';
        document.getElementById('aggregate-stats-section').style.display = 'none';
        document.getElementById('your-moves-section').style.display = 'none';
        
        // Update back button text
        const backBtn = document.getElementById('detail-back-btn');
        if (backBtn) backBtn.textContent = 'Back to Tabiyas';
        
        // Hide puzzle navigation for tabiyas
        document.getElementById('prev-puzzle-btn').style.display = 'none';
        document.getElementById('next-puzzle-btn').style.display = 'none';
        const counter = document.getElementById('puzzle-counter');
        if (counter) counter.style.display = 'none';
        
    }
    
    BoardManager.create('detail-board', pos.fen, {
        flipped: false,
        mode: 'analysis',
        onPositionChange: function (newFen) {
            EngineUI.setPosition(newFen);
        },
    });

    EngineUI.mount('detail-engine-container');
    EngineUI.setPosition(pos.fen);
}

function undoDetailBoard() {
    BoardManager.undoAnalysis('detail-board');
}

function resetDetailBoard() {
    BoardManager.resetAnalysis('detail-board');
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
        AppState.addPositionType = pos.position_type || 'tabiya';
        Router.navigate({ view: 'addPosition', params: { type: pos.position_type || 'tabiya' } });
        BoardManager.setPosition('board', AppState.boardFen);
    });
}

function renderPositionsList() {
    // Legacy function - delegates to specific type renderers
    const route = Router.current();
    if (route.view === 'tactics') {
        renderTacticsList();
    } else {
        renderTabiyasList();
    }
}

function renderTabiyasList() {
    const el = document.getElementById('tabiyas-list');
    if (!el) return;
    const tabiyas = AppState.allPositions.filter(p => p.position_type === 'tabiya');
    if (!tabiyas.length) {
        el.innerHTML = `<div class="empty-state"><p>No tabiyas yet</p><p>Click "Add New" to save your first opening position.</p></div>`;
        return;
    }
    el.innerHTML = tabiyas.map(p =>
        `<div class="pos-item" onclick="showDetail(${p.id})">${renderMiniBoard(p.fen)}<div class="title">${p.title || 'Untitled'}</div><div>${p.tags.map(t => `<span class="tag">#${t.name}</span>`).join('')}</div><button class="btn btn-sm btn-ghost pos-item-delete" onclick="event.stopPropagation();deleteFromList(${p.id},'tabiya')" title="Delete"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button></div>`
    ).join('');
}

function renderTacticsList() {
    const el = document.getElementById('tactics-list');
    if (!el) return;
    const tactics = AppState.allPositions.filter(p => p.position_type === 'puzzle');
    if (!tactics.length) {
        el.innerHTML = `<div class="empty-state"><p>No tactics puzzles yet</p><p>Click "Add New" to save your first tactical puzzle.</p></div>`;
        return;
    }
    el.innerHTML = tactics.map(p =>
        `<div class="pos-item" onclick="showDetail(${p.id})">${renderMiniBoard(p.fen)}<div class="title">${p.title || 'Untitled'}</div><div>${p.tags.map(t => `<span class="tag">#${t.name}</span>`).join('')}</div><button class="btn btn-sm btn-ghost pos-item-delete" onclick="event.stopPropagation();deleteFromList(${p.id},'puzzle')" title="Delete"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button></div>`
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

let _detailNotesTimeout = null;
function _onDetailNotesInput() {
    if (_detailNotesTimeout) clearTimeout(_detailNotesTimeout);
    _detailNotesTimeout = setTimeout(_autoSaveDetailNotes, 1000);
}
async function _autoSaveDetailNotes() {
    if (_detailNotesTimeout) { clearTimeout(_detailNotesTimeout); _detailNotesTimeout = null; }
    const id = AppState.currentDetailId;
    if (!id) return;
    const el = document.getElementById('detail-notes');
    if (!el) return;
    const notes = el.value;
    if (notes === el._lastSaved) return;
    console.log('[NOTES] Saving notes for position', id);
    const r = await fetch(API + '/positions/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notes || null }),
    });
    if (r.ok) {
        el._lastSaved = notes;
        console.log('[NOTES] Save succeeded');
        topBanner('Notes saved', 1500);
    } else {
        console.error('[NOTES] Save failed', r.status);
        toast('Failed to save notes', true);
    }
}

async function deleteFromList(id, type) {
    if (!confirm('Delete this position?')) return;
    if ((await fetch(API + '/positions/' + id, { method: 'DELETE' })).ok) {
        toast('Position deleted');
        if (type === 'puzzle') loadTactics();
        else loadTabiyas();
    }
}

async function deleteFromDetail() {
    const id = AppState.currentDetailId;
    if (!id || !confirm('Delete this position?')) return;
    const pos = AppState.allPositions.find(p => p.id === id);
    const viewToReturn = (pos && pos.position_type === 'puzzle') ? 'tactics' : 'tabiyas';
    if ((await fetch(API + '/positions/' + id, { method: 'DELETE' })).ok) {
        topBanner('Position deleted');
        Router.navigate({ view: viewToReturn });
    }
}

function clearForm() {
    document.getElementById('edit-id').value = '';
    document.getElementById('fen-input').value = '';
    document.getElementById('pos-title').value = '';
    document.getElementById('pos-tags').value = '';
    document.getElementById('pos-notes').value = '';
    document.getElementById('pos-stockfish').value = '';
    document.getElementById('form-title').textContent = 'New Position';
    document.getElementById('delete-btn').style.display = 'none';
    AppState.boardFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    AppState.addPositionType = 'tabiya';
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

// Puzzle navigation functions
async function loadPuzzleNavigation(puzzleId) {
    // Get current filter tags from URL or AppState
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const tags = params.getAll('tag');
    
    let url = API + `/positions/${puzzleId}/navigation`;
    if (tags.length > 0) {
        url += '?' + tags.map(t => 'tags=' + encodeURIComponent(t)).join('&');
    }
    
    const nav = await (await fetch(url)).json();
    
    // Update counter
    document.getElementById('puzzle-current-index').textContent = nav.current_index;
    document.getElementById('puzzle-total-count').textContent = nav.total_count;
    
    // Enable/disable navigation buttons
    const prevBtn = document.getElementById('prev-puzzle-btn');
    const nextBtn = document.getElementById('next-puzzle-btn');
    
    if (nav.previous_id) {
        prevBtn.disabled = false;
        prevBtn.onclick = () => navigateToPuzzle(nav.previous_id);
    } else {
        prevBtn.disabled = true;
    }
    
    if (nav.next_id) {
        nextBtn.disabled = false;
        nextBtn.onclick = () => navigateToPuzzle(nav.next_id);
    } else {
        nextBtn.disabled = true;
    }
    
    // Store navigation info for keyboard shortcuts
    AppState.puzzleNavigation = nav;
}

function navigateToPuzzle(puzzleId) {
    // Preserve tag filters when navigating
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const tagParams = params.getAll('tag');
    
    const route = { 
        view: 'positionDetail', 
        id: puzzleId 
    };
    
    if (tagParams.length > 0) {
        // Add tag params to route for filter preservation
        const queryString = tagParams.map(t => 'tag=' + encodeURIComponent(t)).join('&');
        Router.navigate(route, queryString);
    } else {
        Router.navigate(route);
    }
}

function navigatePuzzle(direction) {
    if (!AppState.puzzleNavigation) return;
    
    if (direction === 'next' && AppState.puzzleNavigation.next_id) {
        navigateToPuzzle(AppState.puzzleNavigation.next_id);
    } else if (direction === 'previous' && AppState.puzzleNavigation.previous_id) {
        navigateToPuzzle(AppState.puzzleNavigation.previous_id);
    }
}

// Keyboard shortcuts for puzzle navigation
function setupPuzzleKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
        // Only work on puzzle detail view
        if (!AppState.currentDetailType || AppState.currentDetailType !== 'puzzle') return;
        if (!AppState.puzzleNavigation) return;
        
        // Don't interfere with input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        if (e.key === 'ArrowRight' && AppState.puzzleNavigation.next_id) {
            e.preventDefault();
            navigateToPuzzle(AppState.puzzleNavigation.next_id);
        } else if (e.key === 'ArrowLeft' && AppState.puzzleNavigation.previous_id) {
            e.preventDefault();
            navigateToPuzzle(AppState.puzzleNavigation.previous_id);
        }
    });
}

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
window.undoDetailBoard = undoDetailBoard;
window.resetDetailBoard = resetDetailBoard;
window.deleteFromList = deleteFromList;
window.deleteFromDetail = deleteFromDetail;
window.clearForm = clearForm;
window.setupAutoLoad = setupAutoLoad;
window.setupKeyboardSave = setupKeyboardSave;
window.setupUrlParams = setupUrlParams;
window.loadPuzzleNavigation = loadPuzzleNavigation;
window.navigateToPuzzle = navigateToPuzzle;
window.navigatePuzzle = navigatePuzzle;
window.setupPuzzleKeyboardShortcuts = setupPuzzleKeyboardShortcuts;
