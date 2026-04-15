const AppState = {
    allPositions: [],
    allTags: [],
    currentTagFilter: null,
    quizTagFilters: [],
    quizQueue: [],
    quizCurrent: null,
    quizCorrect: 0,
    quizTotal: 0,
    currentDetailId: null,
    currentDetailFen: null,
    sfWorker: null,
    boardFlipped: false,
    detailFlipped: false,
    boardFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    lastTags: '',
};

window.AppState = AppState;
