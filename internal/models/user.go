package models

import (
	"time"
)

// User represents a user account
type User struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Username    string    `gorm:"uniqueIndex;not null" json:"username"`
	Email       string    `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash string   `gorm:"not null" json:"-"`
	AvatarURL   string    `gorm:"type:text" json:"avatarUrl"` // URL to avatar image
	ELORating   int       `gorm:"default:1200;not null" json:"eloRating"` // Default ELO: 1200
	GamesPlayed int       `gorm:"default:0;not null" json:"gamesPlayed"`
	Wins        int       `gorm:"default:0;not null" json:"wins"`
	Losses      int       `gorm:"default:0;not null" json:"losses"`
	Draws       int       `gorm:"default:0;not null" json:"draws"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`

	// Relations
	WhiteGames []Game `gorm:"foreignKey:WhitePlayerID" json:"-"`
	BlackGames []Game `gorm:"foreignKey:BlackPlayerID" json:"-"`
	RefreshTokens []RefreshToken `gorm:"foreignKey:UserID" json:"-"`
}

// RefreshToken represents a refresh token for JWT authentication
type RefreshToken struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index;not null" json:"userId"`
	Token     string    `gorm:"uniqueIndex;not null" json:"-"`
	ExpiresAt time.Time `gorm:"not null" json:"expiresAt"`
	CreatedAt time.Time `json:"createdAt"`

	// Relations
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}
