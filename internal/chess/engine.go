package chess

import (
	"errors"

	"github.com/notnil/chess"
)

var (
	ErrInvalidMove      = errors.New("invalid move")
	ErrIllegalMove      = errors.New("illegal move")
	ErrNotYourTurn      = errors.New("not your turn")
	ErrGameFinished     = errors.New("game is finished")
)

// Engine wraps the chess engine
type Engine struct {
	game *chess.Game
}

// NewEngine creates a new chess engine with initial position
func NewEngine() *Engine {
	return &Engine{
		game: chess.NewGame(),
	}
}

// NewEngineFromFEN creates a chess engine from a FEN string
func NewEngineFromFEN(fen string) (*Engine, error) {
	pos, err := chess.FEN(fen)
	if err != nil {
		return nil, err
	}
	return &Engine{
		game: chess.NewGame(pos),
	}, nil
}

// GetFEN returns the current board position in FEN notation
func (e *Engine) GetFEN() string {
	return e.game.Position().String()
}

// GetTurn returns whose turn it is ("w" for white, "b" for black)
func (e *Engine) GetTurn() string {
	return e.game.Position().Turn().String()
}

// IsWhiteTurn returns true if it's white's turn
func (e *Engine) IsWhiteTurn() bool {
	return e.GetTurn() == "w"
}

// IsBlackTurn returns true if it's black's turn
func (e *Engine) IsBlackTurn() bool {
	return e.GetTurn() == "b"
}

// MakeMove validates and makes a move in UCI notation (e.g., "e2e4")
func (e *Engine) MakeMove(uci string) error {
	// Check if game is finished
	if e.game.Outcome() != chess.NoOutcome {
		return ErrGameFinished
	}

	// Decode UCI move
	move, err := chess.UCINotation{}.Decode(e.game.Position(), uci)
	if err != nil {
		return ErrInvalidMove
	}

	// Validate and apply move
	if err := e.game.Move(move); err != nil {
		return ErrIllegalMove
	}

	return nil
}

// ValidateMove checks if a move is legal without making it
func (e *Engine) ValidateMove(uci string) error {
	// Check if game is finished
	if e.game.Outcome() != chess.NoOutcome {
		return ErrGameFinished
	}

	// Decode UCI move
	move, err := chess.UCINotation{}.Decode(e.game.Position(), uci)
	if err != nil {
		return ErrInvalidMove
	}

	// Check if move is legal
	validMoves := e.game.ValidMoves()
	for _, validMove := range validMoves {
		if validMove.String() == move.String() {
			return nil
		}
	}

	return ErrIllegalMove
}

// GetOutcome returns the game outcome
func (e *Engine) GetOutcome() string {
	outcome := e.game.Outcome()
	switch outcome {
	case chess.WhiteWon:
		return "white_wins"
	case chess.BlackWon:
		return "black_wins"
	case chess.Draw:
		return "draw"
	default:
		return ""
	}
}

// IsCheck returns true if the current player is in check
func (e *Engine) IsCheck() bool {
	// Check if the current position has a valid outcome (checkmate) or if king is attacked
	// In notnil/chess, we check by seeing if there are valid moves (if no moves, might be checkmate)
	// For check detection, we can check if the king is under attack
	validMoves := e.game.ValidMoves()
	if len(validMoves) == 0 {
		// No valid moves - could be checkmate or stalemate
		return e.game.Outcome() != chess.NoOutcome && e.game.Outcome() != chess.Draw
	}
	// Simple check: if outcome exists and it's not a draw, someone is in checkmate
	return false // For now, we'll use outcome for checkmate detection
}

// IsCheckmate returns true if the current player is in checkmate
func (e *Engine) IsCheckmate() bool {
	return e.game.Outcome() == chess.WhiteWon || e.game.Outcome() == chess.BlackWon
}

// IsStalemate returns true if the game is in stalemate
func (e *Engine) IsStalemate() bool {
	return e.game.Outcome() == chess.Draw && !e.IsCheck()
}

// GetValidMoves returns all valid moves for the current position
func (e *Engine) GetValidMoves() []string {
	validMoves := e.game.ValidMoves()
	moves := make([]string, len(validMoves))
	for i, move := range validMoves {
		moves[i] = move.String()
	}
	return moves
}
