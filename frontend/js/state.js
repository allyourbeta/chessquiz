const AppState = {
    allPositions: [],
    allTags: [],
    positionTagFilters: [],
    quizTagFilters: [],
    quizQueue: [],
    quizCurrent: null,
    quizCorrect: 0,
    quizTotal: 0,
    currentDetailId: null,
    currentDetailFen: null,
    sfWorker: null,  // STOCKFISH DISABLED: unused
    boardFlipped: false,
    detailFlipped: false,
    boardFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    lastTags: '',
    allGames: [],
    gameTagFilters: [],
    gameCollectionFilter: null,
    gameResultFilter: '',
    gameSearch: '',
    gamePage: 0,
    gamePageSize: 50,
    gameTotalCount: 0,
    allCollections: [],
    currentGame: null,
    currentPly: 0,
    engineOn: false,  // STOCKFISH DISABLED: always false
    engineEval: null,  // STOCKFISH DISABLED: unused
    playMode: false,   // STOCKFISH DISABLED: unused
    playBoardId: null,  // STOCKFISH DISABLED: unused
    playStartFen: null, // STOCKFISH DISABLED: unused
    playChess: null,    // STOCKFISH DISABLED: unused
    soundMuted: false,
    batchMode: false,
    batchCollectionId: null,
    batchCollectionName: null,
    batchGameIds: [],
    batchIndex: 0,
    searchFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    selectedGameIds: new Set(),
    addPositionType: 'tabiya',
};

window.AppState = AppState;
