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

async function _createNewCollectionIfNeeded(collIds) {
    const newCollName = document.getElementById('import-new-coll').value.trim();
    if (!newCollName) return;
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

function _renderImportResult(resultEl, data) {
    const dup = data.duplicates || 0;
    let html = `<p style="color:var(--green)">Imported ${data.imported} game(s)`;
    if (dup > 0) html += ` <span class="text-muted">(${dup} duplicate${dup === 1 ? '' : 's'} skipped)</span>`;
    html += '</p>';
    if (data.failed > 0) html += `<p style="color:var(--red)">${data.failed} failed</p>`;
    if (data.errors.length) html += `<details><summary style="cursor:pointer;color:var(--text-muted)">Errors</summary><pre style="font-size:12px;color:var(--red);margin-top:8px">${data.errors.join('\n')}</pre></details>`;
    resultEl.innerHTML = html;
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
        await _createNewCollectionIfNeeded(collIds);
        const pgn = _importFile ? await _importFile.text() : pasted;
        const res = await fetch(API + '/games/import', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({pgn_text: pgn, tags, collection_ids: collIds, force})
        });
        const data = await res.json();
        if (res.ok) {
            _renderImportResult(resultEl, data);
            if (data.imported > 0) {
                setTimeout(() => { Router.navigate({ view: 'games' }); }, 1500);
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

window.resetImportView = resetImportView;
window.renderImportCollections = renderImportCollections;
window.handlePgnFile = handlePgnFile;
window.doImport = doImport;
window.clearImportFile = clearImportFile;
