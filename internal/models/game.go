package models

import (
	"time"
)

// GameStatus represents the status of a game
type GameStatus string

const (
	GameStatusWaiting  GameStatus = "waiting"  // Waiting for second player
	GameStatusActive   GameStatus = "active"   // Game in progress
	GameStatusFinished GameStatus = "finished" // Game ended
)

// GameResult represents the result of a finished game
type GameResult string

const (
	GameResultNone      GameResult = ""
	GameResultWhiteWins GameResult = "white_wins"
	GameResultBlackWins GameResult = "black_wins"
	GameResultDraw      GameResult = "draw"
)

// Game represents a chess game
type Game struct {
	ID            uint       `gorm:"primaryKey" json:"id"`
	WhitePlayerID *uint      `gorm:"index" json:"whitePlayerId"`
	BlackPlayerID *uint      `gorm:"index" json:"blackPlayerId"`
	Status        GameStatus `gorm:"not null;default:'waiting'" json:"status"`
	Result        GameResult `gorm:"default:''" json:"result"`
	CurrentFEN    string     `gorm:"type:text;not null" json:"currentFEN"` // Current board state in FEN notation
	PGN           string     `gorm:"type:text" json:"pgn"`                  // Game notation in PGN format
	TimeControl   int        `gorm:"default:600" json:"timeControl"`       // Time per player in seconds (default: 10 minutes)
	WhiteTimeLeft int        `gorm:"default:600" json:"whiteTimeLeft"`      // Time remaining for white in seconds
	BlackTimeLeft int        `gorm:"default:600" json:"blackTimeLeft"`     // Time remaining for black in seconds
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`

	// Relations
	WhitePlayer *User  `gorm:"foreignKey:WhitePlayerID" json:"whitePlayer,omitempty"`
	BlackPlayer *User  `gorm:"foreignKey:BlackPlayerID" json:"blackPlayer,omitempty"`
	Moves       []Move `gorm:"foreignKey:GameID" json:"moves,omitempty"`
}
