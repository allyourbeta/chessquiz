// Client-side router. Single source of truth for "what view are we on".
//
// Route object shape:
//   { view: 'positions'|'positionDetail'|'addPosition'|'games'|'gameDetail'
//         | 'gameImport'|'collections'|'collectionDetail'|'search'|'quiz',
//     id?: number, params?: object }
//
// Failure modes guarded against:
//   - popstate must only RENDER, never pushState (else back-forward loops).
//   - Filter handlers call navigate(); during render, filter UIs re-mount
//     from state — they must NOT fire onChange on mount (tagfilter.js
//     only fires on user events, verified).
//   - During render, _isRendering flag suppresses stray navigate() calls
//     from filter setters so URL stays stable mid-render.

const Router = (function () {
    let _isRendering = false;

    function _qs(obj) {
        const parts = [];
        Object.entries(obj || {}).forEach(([k, v]) => {
            if (v == null || v === '' || (Array.isArray(v) && !v.length)) return;
            if (Array.isArray(v)) v.forEach(x => parts.push(`${k}=${encodeURIComponent(x)}`));
            else parts.push(`${k}=${encodeURIComponent(v)}`);
        });
        return parts.length ? '?' + parts.join('&') : '';
    }

    function _parseQuery(search) {
        const out = { tags: [] };
        if (!search) return out;
        const s = search.startsWith('?') ? search.slice(1) : search;
        s.split('&').filter(Boolean).forEach(pair => {
            const [k, v] = pair.split('=');
            const key = decodeURIComponent(k);
            const val = v == null ? '' : decodeURIComponent(v);
            if (key === 'tag' || key === 'tags') out.tags.push(val);
            else out[key] = val;
        });
        return out;
    }

    // Parse URL -> route object
    function parse(pathname, search) {
        const path = pathname || '/';
        const q = _parseQuery(search || '');
        const parts = path.split('/').filter(Boolean);
        // '/' or no parts -> positions
        if (!parts.length) return { view: 'positions', params: q };

        const [a, b] = parts;
        if (a === 'positions') {
            if (!b) return { view: 'positions', params: q };
            if (b === 'new') return { view: 'addPosition', params: q };
            const id = parseInt(b, 10);
            if (!isNaN(id)) return { view: 'positionDetail', id, params: q };
        }
        if (a === 'games') {
            if (!b) return { view: 'games', params: q };
            if (b === 'import') return { view: 'gameImport', params: q };
            const id = parseInt(b, 10);
            if (!isNaN(id)) return { view: 'gameDetail', id, params: q };
        }
        if (a === 'collections') {
            if (!b) return { view: 'collections', params: q };
            const id = parseInt(b, 10);
            if (!isNaN(id)) return { view: 'collectionDetail', id, params: q };
        }
        if (a === 'search') return { view: 'search', params: q };
        if (a === 'quiz') return { view: 'quiz', params: q };
        if (a === 'add') return { view: 'addPosition', params: q };

        return { view: 'positions', params: q };
    }

    // route object -> URL path + query
    function build(route) {
        const p = route.params || {};
        switch (route.view) {
            case 'positions':      return '/positions' + _qs(p);
            case 'positionDetail': return `/positions/${route.id}` + _qs(p);
            case 'addPosition':    return '/positions/new' + _qs(p);
            case 'games':          return '/games' + _qs(p);
            case 'gameDetail':     return `/games/${route.id}` + _qs(p);
            case 'gameImport':     return '/games/import' + _qs(p);
            case 'collections':    return '/collections' + _qs(p);
            case 'collectionDetail': return `/collections/${route.id}` + _qs(p);
            case 'search':         return '/search' + _qs(p);
            case 'quiz':           return '/quiz' + _qs(p);
            default:               return '/positions';
        }
    }

    function navigate(route, opts) {
        if (_isRendering) return;
        opts = opts || {};
        const url = build(route);
        if (opts.replace) history.replaceState(route, '', url);
        else history.pushState(route, '', url);
        render(route);
    }

    // Replace the URL without pushing a history entry or re-rendering.
    // Used by filter handlers that already reloaded data — only URL needs sync.
    function syncUrl(route) {
        if (_isRendering) return;
        const url = build(route);
        history.replaceState(route, '', url);
    }

    function render(route) {
        _isRendering = true;
        try {
            renderRoute(route);
        } finally {
            _isRendering = false;
        }
    }

    function _onPopState(e) {
        const route = (e && e.state) || parse(location.pathname, location.search);
        render(route);
    }

    function init() {
        window.addEventListener('popstate', _onPopState);
        const route = parse(location.pathname, location.search);
        // Replace so the initial entry has a state object attached.
        history.replaceState(route, '', build(route));
        render(route);
    }

    function current() {
        return parse(location.pathname, location.search);
    }

    function isRendering() { return _isRendering; }

    return { parse, build, navigate, syncUrl, render, init, current, isRendering };
})();

window.Router = Router;
