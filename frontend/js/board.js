function parseFenBoard(fen) {
    const rows = fen.split(' ')[0].split('/');
    const b = [];
    for (const row of rows) {
        const r = [];
        for (const ch of row) {
            if (ch >= '1' && ch <= '8') for (let i = 0; i < +ch; i++) r.push(null);
            else r.push(ch);
        }
        b.push(r);
    }
    return b;
}

function _renderBoardToElement(id, fen, flipped = false) {
    const c = document.getElementById(id);
    if (!c) return;
    const b = parseFenBoard(fen);
    c.innerHTML = '';
    const files = 'abcdefgh', ranks = '87654321';
    for (let dr = 0; dr < 8; dr++) for (let dc = 0; dc < 8; dc++) {
        const r = flipped ? 7 - dr : dr, col = flipped ? 7 - dc : dc;
        const isLight = (r + col) % 2 === 0;
        const piece = b[r][col];
        const sq = document.createElement('div');
        sq.className = 'chess-sq ' + (isLight ? 'light' : 'dark');
        if (dc === 0) {
            const l = document.createElement('span');
            l.className = 'coord coord-rank';
            l.textContent = ranks[r];
            sq.appendChild(l);
        }
        if (dr === 7) {
            const l = document.createElement('span');
            l.className = 'coord coord-file';
            l.textContent = files[col];
            sq.appendChild(l);
        }
        if (piece) {
            const img = document.createElement('img');
            img.src = PIECE_SVG[pieceKey(piece)];
            img.style.cssText = 'position:absolute;width:85%;height:85%;pointer-events:none;';
            sq.appendChild(img);
        }
        c.appendChild(sq);
    }
}

function renderMiniBoard(fen) {
    const b = parseFenBoard(fen);
    let h = '<div class="mini-board">';
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const l = (r + c) % 2 === 0;
        const p = b[r][c];
        const img = p ? `<img src="${PIECE_SVG[pieceKey(p)]}" style="position:absolute;width:100%;height:100%">` : '';
        h += `<div class="mini-sq ${l ? 'light' : 'dark'}">${img}</div>`;
    }
    return h + '</div>';
}

const BoardManager = {
    boards: {},

    create(elementId, fen, options = {}) {
        this.boards[elementId] = {
            fen: fen,
            flipped: options.flipped || false,
        };
        _renderBoardToElement(elementId, fen, options.flipped || false);
    },

    setPosition(elementId, fen) {
        if (!this.boards[elementId]) {
            this.boards[elementId] = { fen: fen, flipped: false };
        }
        this.boards[elementId].fen = fen;
        _renderBoardToElement(elementId, fen, this.boards[elementId].flipped);
    },

    flip(elementId) {
        if (!this.boards[elementId]) return;
        this.boards[elementId].flipped = !this.boards[elementId].flipped;
        _renderBoardToElement(
            elementId,
            this.boards[elementId].fen,
            this.boards[elementId].flipped
        );
    },

    destroy(elementId) {
        delete this.boards[elementId];
        const el = document.getElementById(elementId);
        if (el) el.innerHTML = '';
    },

    getPosition(elementId) {
        return this.boards[elementId] ? this.boards[elementId].fen : null;
    },

    isFlipped(elementId) {
        return this.boards[elementId] ? this.boards[elementId].flipped : false;
    }
};

window.parseFenBoard = parseFenBoard;
window.renderMiniBoard = renderMiniBoard;
window.BoardManager = BoardManager;
