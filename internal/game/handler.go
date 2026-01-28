package game

import (
	"net/http"
	"strconv"

	"chess-app/internal/models"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service            *Service
	matchmakingService *MatchmakingService
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func NewHandlerWithMatchmaking(service *Service, matchmakingService *MatchmakingService) *Handler {
	return &Handler{
		service:            service,
		matchmakingService: matchmakingService,
	}
}

// CreateGame creates a new game
func (h *Handler) CreateGame(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	game, err := h.service.CreateGame(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, game)
}

// GetGame retrieves a game by ID
func (h *Handler) GetGame(c *gin.Context) {
	gameIDStr := c.Param("id")
	gameID, err := strconv.ParseUint(gameIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid game ID"})
		return
	}
	
	game, err := h.service.GetGame(uint(gameID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "game not found"})
		return
	}

	c.JSON(http.StatusOK, game)
}

// JoinGame allows a player to join a waiting game
func (h *Handler) JoinGame(c *gin.Context) {
	gameIDStr := c.Param("id")
	gameID, err := strconv.ParseUint(gameIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid game ID"})
		return
	}
	
	userID := c.MustGet("userID").(uint)

	game, err := h.service.JoinGame(uint(gameID), userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, game)
}

// GetGameHistory returns all moves for a game
func (h *Handler) GetGameHistory(c *gin.Context) {
	gameIDStr := c.Param("id")
	gameID, err := strconv.ParseUint(gameIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid game ID"})
		return
	}
	
	moves, err := h.service.GetGameHistory(uint(gameID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, moves)
}

// GetUserGames returns all games for the current user
func (h *Handler) GetUserGames(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	games, err := h.service.GetUserGames(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, games)
}

// FindMatch starts matchmaking for the current user
func (h *Handler) FindMatch(c *gin.Context) {
	if h.matchmakingService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "matchmaking not available"})
		return
	}

	userID := c.MustGet("userID").(uint)

	// Get user ELO
	var userModel models.User
	if err := h.service.GetDB().First(&userModel, userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user"})
		return
	}

	// Try to find a match
	matchedGame, err := h.matchmakingService.JoinQueue(userID, userModel.ELORating)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if matchedGame != nil {
		// Match found!
		c.JSON(http.StatusOK, gin.H{
			"matched": true,
			"game":    matchedGame,
		})
	} else {
		// Added to queue
		position := h.matchmakingService.GetQueuePosition(userID)
		c.JSON(http.StatusOK, gin.H{
			"matched":  false,
			"position": position,
			"message":  "Searching for opponent...",
		})
	}
}

// CancelMatchmaking cancels matchmaking for the current user
func (h *Handler) CancelMatchmaking(c *gin.Context) {
	if h.matchmakingService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "matchmaking not available"})
		return
	}

	userID := c.MustGet("userID").(uint)
	h.matchmakingService.LeaveQueue(userID)

	c.JSON(http.StatusOK, gin.H{"message": "Matchmaking cancelled"})
}

// GetQueueStatus returns the current queue status
func (h *Handler) GetQueueStatus(c *gin.Context) {
	if h.matchmakingService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "matchmaking not available"})
		return
	}

	userID := c.MustGet("userID").(uint)
	position := h.matchmakingService.GetQueuePosition(userID)

	if position == -1 {
		c.JSON(http.StatusOK, gin.H{"inQueue": false})
	} else {
		c.JSON(http.StatusOK, gin.H{
			"inQueue": true,
			"position": position,
		})
	}
}
