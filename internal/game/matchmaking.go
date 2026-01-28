package game

import (
	"sync"
	"time"

	"chess-app/internal/models"

	"gorm.io/gorm"
)

const (
	// ELO range for matching (±100 ELO points)
	ELOMatchRange = 100
	// Maximum wait time before expanding ELO range
	MaxWaitTime = 30 * time.Second
	// Expanded ELO range after max wait time
	ExpandedELORange = 200
)

// QueueEntry represents a player waiting in the matchmaking queue
type QueueEntry struct {
	UserID    uint
	ELO       int
	EnteredAt time.Time
}

// MatchmakingService handles player matchmaking
type MatchmakingService struct {
	mu    sync.RWMutex
	queue []QueueEntry
	db    *gorm.DB
}

// NewMatchmakingService creates a new matchmaking service
func NewMatchmakingService(db *gorm.DB) *MatchmakingService {
	return &MatchmakingService{
		queue: make([]QueueEntry, 0),
		db:    db,
	}
}

// JoinQueue adds a player to the matchmaking queue
func (m *MatchmakingService) JoinQueue(userID uint, elo int) (*models.Game, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Check if player is already in queue
	for i, entry := range m.queue {
		if entry.UserID == userID {
			// Update ELO if changed
			m.queue[i].ELO = elo
			return nil, nil // Still waiting
		}
	}

	// Try to find a match
	for i, entry := range m.queue {
		// Check ELO compatibility
		eloDiff := abs(elo - entry.ELO)
		waitTime := time.Since(entry.EnteredAt)

		// Use expanded range if waited too long
		maxDiff := ELOMatchRange
		if waitTime > MaxWaitTime {
			maxDiff = ExpandedELORange
		}

		if eloDiff <= maxDiff {
			// Found a match! Remove from queue and create game
			m.queue = append(m.queue[:i], m.queue[i+1:]...)

			// Create game
			gameService := NewService(m.db)
			game, err := gameService.CreateGame(userID)
			if err != nil {
				return nil, err
			}

			// Second player joins
			game, err = gameService.JoinGame(game.ID, entry.UserID)
			if err != nil {
				return nil, err
			}

			return game, nil
		}
	}

	// No match found, add to queue
	m.queue = append(m.queue, QueueEntry{
		UserID:    userID,
		ELO:       elo,
		EnteredAt: time.Now(),
	})

	return nil, nil
}

// LeaveQueue removes a player from the matchmaking queue
func (m *MatchmakingService) LeaveQueue(userID uint) {
	m.mu.Lock()
	defer m.mu.Unlock()

	for i, entry := range m.queue {
		if entry.UserID == userID {
			m.queue = append(m.queue[:i], m.queue[i+1:]...)
			return
		}
	}
}

// GetQueuePosition returns the position of a player in the queue
func (m *MatchmakingService) GetQueuePosition(userID uint) int {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for i, entry := range m.queue {
		if entry.UserID == userID {
			return i + 1
		}
	}
	return -1
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}
