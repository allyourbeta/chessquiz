// Practice sessions (Phase 10) — pure rendering helpers.
// Split from practice.js to honor the 300-line limit.

const PracticeUI = (function () {

    // Map (verdict, user_color) -> standard chess result notation.
    // Abandoned / unknown -> em-dash. Draw -> ½-½. Wins/losses resolved
    // to the absolute "1-0" / "0-1" from the game's perspective.
    function formatResult(verdict, userColor) {
        if (!verdict) return '—';
        if (verdict === 'draw') return '½-½';
        if (verdict === 'abandoned') return '—';
        const isWhite = userColor === 'white';
        if (verdict === 'win') return isWhite ? '1-0' : '0-1';
        if (verdict === 'loss') return isWhite ? '0-1' : '1-0';
        return '—';
    }

    function resultClass(verdict) {
        if (verdict === 'win') return 'correct';
        if (verdict === 'loss') return 'incorrect';
        return 'text-muted';
    }

    function renderHistory(stats, games, tree, append = false) {
        const statsEl = document.getElementById('practice-stats');
        const listEl = document.getElementById('practice-recent-list');
        const treeEl = document.getElementById('practice-tree');
        if (statsEl) _renderStats(statsEl, stats);
        if (listEl) _renderRecent(listEl, games, append);
        if (treeEl) _renderTree(treeEl, tree);
    }

    function _renderStats(el, s) {
        if (!s || !s.total_games) {
            el.innerHTML = '<p class="text-muted" style="font-size:13px">No practice games yet</p>';
            return;
        }
        const wr = (s.win_rate * 100).toFixed(0);
        const decided = s.wins + s.draws + s.losses;
        let html = `
            <div style="font-size:13px;margin-bottom:6px">
                <strong>${s.total_games}</strong> games &mdash;
                <span class="correct">${s.wins}W</span> /
                ${s.draws}D /
                <span class="incorrect">${s.losses}L</span>
                ${s.abandoned ? `(${s.abandoned} abandoned)` : ''}
                &middot; win rate <strong>${wr}%</strong>
            </div>
            <div style="font-size:12px;margin-bottom:4px">
                vs Stockfish: <strong>${s.wins}/${decided}</strong> wins (${wr}%)
            </div>
            <div class="text-muted" style="font-size:12px;margin-bottom:8px">
                Avg ${s.avg_move_count.toFixed(1)} moves, avg final eval
                ${s.avg_final_eval != null ? s.avg_final_eval.toFixed(2) : '—'}
            </div>`;
        if (s.by_engine_level && s.by_engine_level.length > 1) {
            html += `<div class="stats-breakdown">
                <details style="font-size:12px">
                    <summary class="text-muted" style="cursor:pointer">Breakdown by level</summary>
                    <div style="padding:4px 0 0 12px;margin-top:4px">`;
            s.by_engine_level.forEach(b => {
                const br = (b.win_rate * 100).toFixed(0);
                const bd = b.wins + b.draws + b.losses;
                html += `<div style="margin-bottom:2px">Stockfish <strong>${b.engine_level}</strong>: ${b.wins}/${bd} wins (${br}%)</div>`;
            });
            html += '</div></details></div>';
        }
        el.innerHTML = html;
    }

    function _renderRecent(el, games, append = false) {
        if (!append && (!games || !games.length)) { 
            // Check if this is because of filters
            const hasFilters = document.getElementById('practice-verdict-filter')?.value || 
                              document.getElementById('practice-level-filter')?.value;
            if (hasFilters) {
                el.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted)">No games match these filters. Try adjusting your filters or <a href="#" onclick="Practice.clearFilters();return false">clear filters</a>.</div>';
            } else {
                el.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted)">No practice games yet. Start practicing to see your history here.</div>';
            }
            return; 
        }
        if (!games || !games.length) return;
        
        const rows = games.map(g => {
            const v = g.user_verdict || g.engine_verdict;
            const vcls = resultClass(v);
            const result = formatResult(v, g.user_color);
            const date = g.created_at ? new Date(g.created_at).toLocaleDateString() : '';
            return `<div class="pos-item" style="padding:8px 12px;margin-bottom:8px;font-size:12px;cursor:pointer;border:1px solid var(--grey-100);border-radius:4px" onclick="PracticeViewer.open(${g.id})" title="Click to review this game">
                <span style="flex:1">${date} &mdash; ${g.user_color} vs Stockfish, ${g.move_count} moves &middot; 
                    <span id="verdict-display-${g.id}" class="${vcls}" style="cursor:pointer;position:relative;text-decoration:underline;text-decoration-color:transparent;transition:text-decoration-color 0.2s" onmouseover="this.style.textDecorationColor='currentColor'" onmouseout="this.style.textDecorationColor='transparent'" onclick="event.stopPropagation();PracticeUI.showInlineVerdictEdit(${g.id}, '${g.user_color}')" title="Click to edit verdict">
                        <strong>${result}</strong>
                    </span>
                </span>
                <button id="delete-btn-${g.id}" class="btn btn-sm btn-ghost" style="color:var(--text-muted);transition:color 0.2s" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="event.stopPropagation();PracticeUI.showInlineDelete(${g.id})" aria-label="Delete practice game">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </div>`;
        }).join('');
        
        if (append) {
            el.innerHTML += rows;
        } else {
            el.innerHTML = rows;
        }
    }

    function _renderTree(el, tree) {
        if (!tree || !tree.moves || !tree.moves.length) { el.innerHTML = ''; return; }
        const rows = tree.moves.map(m => {
            const wr = (m.win_rate * 100).toFixed(0);
            return `<div class="tree-row" style="display:flex;gap:8px;padding:3px 6px;font-size:12px">
                <span style="min-width:50px;font-weight:600">${m.san}</span>
                <span class="text-muted">${m.games} games</span>
                <span style="margin-left:auto">${wr}% win</span>
            </div>`;
        }).join('');
        el.innerHTML = rows;
    }

    function renderPositionsList(summaries) {
        const el = document.getElementById('practice-positions-list');
        if (!el) return;
        if (!summaries || !summaries.length) {
            el.innerHTML = `<div class="empty-state"><p>No practice games yet</p><p>Open a saved position and click "Practice this position".</p></div>`;
            return;
        }
        el.innerHTML = summaries.map(s => {
            const wr = (s.win_rate * 100).toFixed(0);
            const last = s.last_played ? new Date(s.last_played).toLocaleDateString() : '—';
            return `<div class="pos-item" onclick="Router.navigate({view:'positionDetail',id:${s.position_id}})">
                ${renderMiniBoard(s.fen)}
                <div class="title">${s.title || 'Untitled'}</div>
                <div class="text-muted" style="font-size:12px">${s.total_games} games &middot; ${wr}% win &middot; ${last}</div>
            </div>`;
        }).join('');
    }

    let activeVerdictEdit = null;
    
    function showInlineVerdictEdit(gameId, userColor) {
        // Close any existing dropdown
        if (activeVerdictEdit) {
            hideInlineVerdictEdit();
        }
        
        const display = document.getElementById(`verdict-display-${gameId}`);
        if (!display) return;
        
        const dropdown = document.createElement('select');
        dropdown.style.position = 'absolute';
        dropdown.style.left = '0';
        dropdown.style.top = '100%';
        dropdown.style.zIndex = '100';
        dropdown.style.background = 'var(--surface)';
        dropdown.style.border = '1px solid var(--border)';
        dropdown.style.borderRadius = '4px';
        dropdown.style.padding = '4px';
        dropdown.style.fontSize = '12px';
        dropdown.style.minWidth = '80px';
        
        const options = [
            { value: 'win', label: '1-0', whiteWin: true },
            { value: 'loss', label: '0-1', blackWin: true },
            { value: 'draw', label: '½-½' },
            { value: 'abandoned', label: '—' }
        ];
        
        options.forEach(opt => {
            const option = document.createElement('option');
            // Determine correct value based on user color
            let actualValue = opt.value;
            if (opt.whiteWin && userColor === 'black') actualValue = 'loss';
            else if (opt.blackWin && userColor === 'black') actualValue = 'win';
            else if (opt.whiteWin && userColor === 'white') actualValue = 'win';
            else if (opt.blackWin && userColor === 'white') actualValue = 'loss';
            
            option.value = actualValue;
            option.textContent = opt.label;
            dropdown.appendChild(option);
        });
        
        dropdown.onchange = async () => {
            const verdict = dropdown.value;
            await saveInlineVerdict(gameId, verdict);
            hideInlineVerdictEdit();
        };
        
        dropdown.onclick = (e) => e.stopPropagation();
        
        display.appendChild(dropdown);
        dropdown.focus();
        activeVerdictEdit = { gameId, dropdown };
        
        // Close on click outside
        setTimeout(() => {
            document.addEventListener('click', hideInlineVerdictEdit, { once: true });
        }, 0);
    }
    
    function hideInlineVerdictEdit() {
        if (activeVerdictEdit) {
            activeVerdictEdit.dropdown.remove();
            activeVerdictEdit = null;
        }
    }
    
    async function saveInlineVerdict(gameId, verdict) {
        try {
            const r = await fetch(`${API}/practice/${gameId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_verdict: verdict })
            });
            if (r.ok) {
                // Show brief confirmation
                const display = document.getElementById(`verdict-display-${gameId}`);
                if (display) {
                    const original = display.style.background;
                    display.style.background = 'var(--success-050)';
                    display.style.transition = 'background 0.3s';
                    setTimeout(() => {
                        display.style.background = original;
                    }, 500);
                }
                // Reload practice history to update display
                if (AppState.currentDetailId) {
                    Practice.loadPracticeHistory(AppState.currentDetailId);
                }
            }
        } catch (e) {
            console.error('Failed to save verdict:', e);
        }
    }
    
    function populateLevelSelect(engineLevels) {
        const sel = document.getElementById('practice-level');
        if (!sel || !engineLevels) return;
        if (sel.options.length) return;
        Object.keys(engineLevels).forEach(k => {
            const opt = document.createElement('option');
            opt.value = k;
            const levelName = k.charAt(0).toUpperCase() + k.slice(1);
            opt.textContent = `Stockfish ${levelName} (d${engineLevels[k].depth}, skill ${engineLevels[k].skill})`;
            sel.appendChild(opt);
        });
        sel.value = 'medium';
    }
    
    let deletedGames = [];  // For undo functionality
    
    function showInlineDelete(gameId) {
        const btn = document.getElementById(`delete-btn-${gameId}`);
        const row = btn.closest('.pos-item');
        if (!row) return;
        
        // Replace button with confirm/cancel
        const original = btn.outerHTML;
        btn.style.display = 'none';
        
        const confirmDiv = document.createElement('div');
        confirmDiv.id = `delete-confirm-${gameId}`;
        confirmDiv.style.cssText = 'display:inline-flex;gap:4px;align-items:center';
        confirmDiv.innerHTML = `
            <span style="font-size:11px;color:var(--danger)">Delete?</span>
            <button class="btn btn-sm" style="padding:2px 6px;font-size:11px;background:var(--danger);color:white" onclick="event.stopPropagation();PracticeUI.confirmDelete(${gameId})">Yes</button>
            <button class="btn btn-sm btn-ghost" style="padding:2px 6px;font-size:11px" onclick="event.stopPropagation();PracticeUI.cancelDelete(${gameId})">No</button>
        `;
        
        btn.parentNode.insertBefore(confirmDiv, btn.nextSibling);
        
        // Auto-cancel after 5 seconds
        setTimeout(() => {
            if (document.getElementById(`delete-confirm-${gameId}`)) {
                cancelDelete(gameId);
            }
        }, 5000);
    }
    
    function cancelDelete(gameId) {
        const confirmDiv = document.getElementById(`delete-confirm-${gameId}`);
        const btn = document.getElementById(`delete-btn-${gameId}`);
        if (confirmDiv) confirmDiv.remove();
        if (btn) btn.style.display = '';
    }
    
    async function confirmDelete(gameId) {
        const row = document.getElementById(`delete-btn-${gameId}`)?.closest('.pos-item');
        if (!row) return;
        
        // Store the row HTML for undo
        const rowHtml = row.outerHTML;
        const rowIndex = Array.from(row.parentNode.children).indexOf(row);
        const listEl = row.parentNode;
        
        // Remove the row immediately for responsive feel
        row.style.transition = 'opacity 0.3s, transform 0.3s';
        row.style.opacity = '0';
        row.style.transform = 'translateX(-20px)';
        
        setTimeout(async () => {
            row.remove();
            
            // Show undo notification
            showUndoNotification(gameId, rowHtml, rowIndex, listEl);
            
            // Actually delete from backend
            deletedGames.push({ gameId, rowHtml, rowIndex, listEl });
            const r = await fetch(`${API}/practice/${gameId}`, { method: 'DELETE' });
            if (!r.ok) {
                // If delete failed, restore the row
                undoDelete(gameId);
                toast('Delete failed', true);
            }
        }, 300);
    }
    
    function showUndoNotification(gameId, rowHtml, rowIndex, listEl) {
        const notification = document.createElement('div');
        notification.id = `undo-notif-${gameId}`;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--surface-darker);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
        `;
        notification.innerHTML = `
            <span>Practice game deleted</span>
            <button class="btn btn-sm" style="background:var(--primary);color:white" onclick="PracticeUI.undoDelete(${gameId})">Undo</button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            const notif = document.getElementById(`undo-notif-${gameId}`);
            if (notif) {
                notif.style.transition = 'opacity 0.3s';
                notif.style.opacity = '0';
                setTimeout(() => notif.remove(), 300);
            }
            // Remove from deletedGames array
            deletedGames = deletedGames.filter(g => g.gameId !== gameId);
        }, 5000);
    }
    
    async function undoDelete(gameId) {
        const deleted = deletedGames.find(g => g.gameId === gameId);
        if (!deleted) return;
        
        // Restore the row
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = deleted.rowHtml;
        const restoredRow = tempDiv.firstChild;
        
        if (deleted.listEl && deleted.listEl.children[deleted.rowIndex]) {
            deleted.listEl.insertBefore(restoredRow, deleted.listEl.children[deleted.rowIndex]);
        } else if (deleted.listEl) {
            deleted.listEl.appendChild(restoredRow);
        }
        
        // Animate restoration
        restoredRow.style.opacity = '0';
        restoredRow.style.transform = 'translateX(-20px)';
        setTimeout(() => {
            restoredRow.style.transition = 'opacity 0.3s, transform 0.3s';
            restoredRow.style.opacity = '1';
            restoredRow.style.transform = 'translateX(0)';
        }, 10);
        
        // Remove undo notification
        const notif = document.getElementById(`undo-notif-${gameId}`);
        if (notif) notif.remove();
        
        // Remove from deletedGames array
        deletedGames = deletedGames.filter(g => g.gameId !== gameId);
        
        // Re-create the game in backend (this would need a restore endpoint)
        // For now, just reload the practice history
        if (AppState.currentDetailId) {
            Practice.loadPracticeHistory(AppState.currentDetailId);
        }
    }

    return {
        renderHistory,
        renderPositionsList, populateLevelSelect,
        formatResult, resultClass,
        showInlineVerdictEdit, hideInlineVerdictEdit,
        showInlineDelete, cancelDelete, confirmDelete, undoDelete,
    };
})();

window.PracticeUI = PracticeUI;
