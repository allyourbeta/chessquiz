const _audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playMoveSound() {
    if (AppState.soundMuted) return;
    try {
        if (_audioCtx.state === 'suspended') _audioCtx.resume();
        const osc = _audioCtx.createOscillator();
        const gain = _audioCtx.createGain();
        osc.connect(gain);
        gain.connect(_audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, _audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, _audioCtx.currentTime + 0.06);
        gain.gain.setValueAtTime(0.15, _audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + 0.08);
        osc.start(_audioCtx.currentTime);
        osc.stop(_audioCtx.currentTime + 0.08);
    } catch (e) {}
}

function toggleMute() {
    AppState.soundMuted = !AppState.soundMuted;
    const btn = document.getElementById('mute-btn');
    if (btn) btn.innerHTML = AppState.soundMuted ? '&#x1f507;' : '&#x1f50a;';
}

window.playMoveSound = playMoveSound;
window.toggleMute = toggleMute;
