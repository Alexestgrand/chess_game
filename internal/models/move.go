package models

import (
	"time"
)

// Move represents a chess move in a game
type Move struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	GameID      uint      `gorm:"index;not null" json:"gameId"`
	PlayerID    uint      `gorm:"index;not null" json:"playerId"`
	MoveNotation string   `gorm:"not null" json:"moveNotation"` // UCI notation (e.g., "e2e4")
	BoardState   string   `gorm:"type:text;not null" json:"boardState"` // FEN after move
	PlyNumber    int      `gorm:"not null" json:"plyNumber"` // Move number (1, 2, 3...)
	CreatedAt    time.Time `json:"createdAt"`

	// Relations
	Game   *Game `gorm:"foreignKey:GameID" json:"game,omitempty"`
	Player *User `gorm:"foreignKey:PlayerID" json:"player,omitempty"`
}
