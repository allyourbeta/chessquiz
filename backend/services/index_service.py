"""Position indexing service. Pure functions — no DB, no FastAPI imports."""

import io

import chess
import chess.pgn
import chess.polyglot


def compute_zobrist(fen: str) -> int:
    """Zobrist hash for exact position lookup.

    Converts unsigned 64-bit to signed 64-bit for SQLite compatibility.
    """
    board = chess.Board(fen)
    h = chess.polyglot.zobrist_hash(board)
    if h >= (1 << 63):
        h -= (1 << 64)
    return h


def compute_pawn_sig(fen: str) -> str:
    """Pawn signature string for structure search.

    Returns sorted signature like:
        "w:a2,b2,d4,f2,g2,h2|b:a7,b7,c6,d5,e6,f7,g7,h7"
    """
    board = chess.Board(fen)
    white_pawns = sorted(
        chess.square_name(sq) for sq in board.pieces(chess.PAWN, chess.WHITE)
    )
    black_pawns = sorted(
        chess.square_name(sq) for sq in board.pieces(chess.PAWN, chess.BLACK)
    )
    return f"w:{','.join(white_pawns)}|b:{','.join(black_pawns)}"


def compute_position_index(pgn_text: str) -> list[dict]:
    """For each mainline position, compute index data.

    Returns list of {half_move, fen, zobrist_hash, pawn_sig}.
    """
    game = chess.pgn.read_game(io.StringIO(pgn_text))
    if game is None:
        return []

    board = game.board()
    positions = [{
        "half_move": 0,
        "fen": board.fen(),
        "zobrist_hash": compute_zobrist(board.fen()),
        "pawn_sig": compute_pawn_sig(board.fen()),
    }]

    for i, node in enumerate(game.mainline()):
        board.push(node.move)
        fen = board.fen()
        positions.append({
            "half_move": i + 1,
            "fen": fen,
            "zobrist_hash": compute_zobrist(fen),
            "pawn_sig": compute_pawn_sig(fen),
        })

    return positions
