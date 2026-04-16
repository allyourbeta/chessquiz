async function loadCollectionsView() {
    try {
        const res = await fetch(API + '/collections/');
        AppState.allCollections = await res.json();
    } catch (e) {
        AppState.allCollections = [];
    }
    renderCollectionsView();
}

function renderCollectionsView() {
    const el = document.getElementById('collections-list');
    if (!AppState.allCollections.length) {
        el.innerHTML = '<div class="empty-state"><p>No collections yet</p><p>Create one to organize your games.</p></div>';
        return;
    }
    el.innerHTML = AppState.allCollections.map(c => {
        const desc = c.description ? `<div class="text-muted" style="font-size:12px;margin-top:4px">${escapeHtml(c.description)}</div>` : '';
        return `<div class="pos-item">
            <div style="flex:1;cursor:pointer" onclick="openCollection(${c.id})">
                <div style="font-size:14px;font-weight:500">${escapeHtml(c.name)}</div>
                ${desc}
                <div class="text-muted" style="font-size:12px;margin-top:4px">${c.game_count} game(s)</div>
            </div>
            <div class="btn-row" style="margin:0">
                <button class="btn btn-sm" onclick="event.stopPropagation();startBatchReview(${c.id}, '${escapeJs(c.name)}')">Start Review</button>
                <button class="btn btn-sm" onclick="event.stopPropagation();editCollection(${c.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deleteCollection(${c.id})">Delete</button>
            </div>
        </div>`;
    }).join('');
}

function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeJs(s) {
    if (!s) return '';
    return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function openCollection(id) {
    Router.navigate({ view: 'collectionDetail', id });
}

function showCollectionModal() {
    document.getElementById('collection-edit-id').value = '';
    document.getElementById('collection-name').value = '';
    document.getElementById('collection-description').value = '';
    document.getElementById('collection-modal-title').textContent = 'New Collection';
    document.getElementById('collection-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('collection-name').focus(), 50);
}

function hideCollectionModal() {
    document.getElementById('collection-modal').style.display = 'none';
}

function editCollection(id) {
    const c = AppState.allCollections.find(x => x.id === id);
    if (!c) return;
    document.getElementById('collection-edit-id').value = c.id;
    document.getElementById('collection-name').value = c.name || '';
    document.getElementById('collection-description').value = c.description || '';
    document.getElementById('collection-modal-title').textContent = 'Edit Collection';
    document.getElementById('collection-modal').style.display = 'flex';
}

async function saveCollection() {
    const id = document.getElementById('collection-edit-id').value;
    const name = document.getElementById('collection-name').value.trim();
    const description = document.getElementById('collection-description').value.trim();
    if (!name) { toast('Name is required', true); return; }

    const body = { name, description: description || null };
    let res;
    if (id) {
        res = await fetch(API + '/collections/' + id, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body),
        });
    } else {
        res = await fetch(API + '/collections/', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body),
        });
    }
    if (res.ok) {
        toast(id ? 'Collection updated' : 'Collection created');
        hideCollectionModal();
        loadCollectionsView();
    } else {
        let msg = 'Failed to save';
        try { msg = (await res.json()).detail || msg; } catch (e) {}
        toast(msg, true);
    }
}

async function deleteCollection(id) {
    if (!confirm('Delete this collection? (Games will not be deleted.)')) return;
    const res = await fetch(API + '/collections/' + id, { method: 'DELETE' });
    if (res.ok) {
        toast('Collection deleted');
        loadCollectionsView();
    } else {
        toast('Failed to delete', true);
    }
}

window.loadCollectionsView = loadCollectionsView;
window.renderCollectionsView = renderCollectionsView;
window.openCollection = openCollection;
window.showCollectionModal = showCollectionModal;
window.hideCollectionModal = hideCollectionModal;
window.editCollection = editCollection;
window.saveCollection = saveCollection;
window.deleteCollection = deleteCollection;
