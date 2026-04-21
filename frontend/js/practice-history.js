const PracticeHistory = (function () {
    let currentFilters = { verdict: '', engine_level: '', sort: 'recent' };
    let currentOffset = 0;
    let totalCount = 0;
    const PAGE_SIZE = 10;

    async function load(positionId, append = false) {
        if (!positionId) return;
        try {
            const params = new URLSearchParams({
                root_position_id: positionId,
                limit: PAGE_SIZE,
                offset: append ? currentOffset : 0,
                sort: currentFilters.sort || 'recent'
            });
            if (currentFilters.verdict) params.append('verdict', currentFilters.verdict);
            if (currentFilters.engine_level) params.append('engine_level', currentFilters.engine_level);

            const statsParams = new URLSearchParams();
            if (currentFilters.verdict) statsParams.append('verdict', currentFilters.verdict);
            if (currentFilters.engine_level) statsParams.append('engine_level', currentFilters.engine_level);

            const [stats, gamesData, tree] = await Promise.all([
                fetch(API + '/practice/stats/' + positionId + '?' + statsParams).then(r => r.json()),
                fetch(API + '/practice/?' + params).then(r => r.json()),
                fetch(API + '/practice/tree/' + positionId).then(r => r.json()),
            ]);

            const games = gamesData.games || gamesData;
            totalCount = gamesData.total_count || games.length;

            if (!append) currentOffset = 0;
            currentOffset += games.length;

            const filterInfo = document.getElementById('practice-filter-info');
            const filterText = document.getElementById('practice-filter-text');
            if (currentFilters.verdict || currentFilters.engine_level) {
                filterInfo.style.display = 'block';
                filterText.textContent = 'Showing ' + stats.total_games + ' of ' + totalCount + ' games (filtered)';
            } else {
                filterInfo.style.display = 'none';
            }

            const paginationEl = document.getElementById('practice-pagination');
            if (paginationEl) {
                paginationEl.style.display = currentOffset < totalCount ? 'block' : 'none';
            }

            PracticeUI.renderHistory(stats, games, tree, append);
        } catch (_) {
            const el = document.getElementById('practice-stats');
            if (el) el.innerHTML = '<p class="text-muted">Could not load practice history</p>';
        }
    }

    function applyFilters() {
        const verdictEl = document.getElementById('practice-verdict-filter');
        const levelEl = document.getElementById('practice-level-filter');
        const sortEl = document.getElementById('practice-sort');
        currentFilters = {
            verdict: verdictEl ? verdictEl.value : '',
            engine_level: levelEl ? levelEl.value : '',
            sort: sortEl ? sortEl.value : 'recent'
        };
        currentOffset = 0;
        if (AppState.currentDetailId) {
            load(AppState.currentDetailId, false);
        }
    }

    function clearFilters() {
        document.getElementById('practice-verdict-filter').value = '';
        document.getElementById('practice-level-filter').value = '';
        document.getElementById('practice-sort').value = 'recent';
        applyFilters();
    }

    function showMore() {
        if (AppState.currentDetailId) {
            load(AppState.currentDetailId, true);
        }
    }

    async function editVerdict(id) {
        const game = await (await fetch(API + '/practice/' + id)).json();
        const userColor = game.user_color;
        const options = ['1-0 (White wins)', '0-1 (Black wins)', '½-½ (Draw)', '— (Abandoned)'];
        const v = prompt('Select verdict:\n' + options.join('\n'), '');
        if (v == null) return;
        let verdict = '';
        if (v.includes('1-0')) verdict = userColor === 'white' ? 'win' : 'loss';
        else if (v.includes('0-1')) verdict = userColor === 'black' ? 'win' : 'loss';
        else if (v.includes('½-½')) verdict = 'draw';
        else if (v.includes('—')) verdict = 'abandoned';
        else { toast('Invalid verdict', true); return; }
        const r = await fetch(API + '/practice/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_verdict: verdict }),
        });
        if (r.ok) {
            toast('Verdict updated');
            if (AppState.currentDetailId) load(AppState.currentDetailId);
        } else { toast('Update failed', true); }
    }

    async function deleteGame(id) {
        if (!confirm('Delete this practice game?')) return;
        const r = await fetch(API + '/practice/' + id, { method: 'DELETE' });
        if (r.ok) {
            toast('Practice game deleted');
            if (AppState.currentDetailId) load(AppState.currentDetailId);
            const cur = Router.current();
            if (cur && cur.view === 'practice') Practice.loadPracticeTab();
        }
    }

    return { load, applyFilters, clearFilters, showMore, editVerdict, deleteGame };
})();

window.PracticeHistory = PracticeHistory;
