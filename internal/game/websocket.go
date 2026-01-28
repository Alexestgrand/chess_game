package game

import (
	"encoding/json"
	"net/http"
	"strconv"

	"chess-app/internal/auth"
	"chess-app/internal/config"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins in development
	},
}

// WSHandler handles WebSocket connections
type WSHandler struct {
	hub     *Hub
	service *Service
	config  *config.Config
}

func NewWSHandler(hub *Hub, service *Service, cfg *config.Config) *WSHandler {
	return &WSHandler{
		hub:     hub,
		service: service,
		config:  cfg,
	}
}

// HandleWebSocket handles WebSocket connections for a game
func (h *WSHandler) HandleWebSocket(c *gin.Context) {
	gameIDStr := c.Param("id")
	gameID, err := strconv.ParseUint(gameIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid game ID"})
		return
	}

	// Get user ID from token (passed as query parameter for WebSocket)
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "token required"})
		return
	}

	claims, err := auth.ValidateToken(token, []byte(h.config.JWTSecret))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	userID := claims.UserID

	// Verify user is in the game
	game, err := h.service.GetGame(uint(gameID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "game not found"})
		return
	}

	isWhite := game.WhitePlayerID != nil && *game.WhitePlayerID == userID
	isBlack := game.BlackPlayerID != nil && *game.BlackPlayerID == userID
	if !isWhite && !isBlack {
		c.JSON(http.StatusForbidden, gin.H{"error": "not a player in this game"})
		return
	}

	// Upgrade to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	// Create client
	client := &Client{
		GameID: uint(gameID),
		UserID: userID,
		Send:   make(chan interface{}, 256),
		Hub:    h.hub,
	}

	// Register client
	h.hub.register <- client

	// Send initial game state
	initialState := gin.H{
		"type":      "game_state",
		"gameId":    game.ID,
		"fen":       game.CurrentFEN,
		"status":    string(game.Status),
		"result":    string(game.Result),
		"whitePlayerId": game.WhitePlayerID,
		"blackPlayerId": game.BlackPlayerID,
		"isWhite":   isWhite,
	}
	client.Send <- initialState

	// Start goroutines
	go client.writePump(conn)
	go client.readPump(conn, h.service, h.hub)
}

// Client read/write pumps
func (c *Client) readPump(conn *websocket.Conn, service *Service, hub *Hub) {
	defer func() {
		hub.unregister <- c
		conn.Close()
	}()

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			break
		}

		var msg map[string]interface{}
		if err := json.Unmarshal(message, &msg); err != nil {
			continue
		}

		// Handle move message
		if msgType, ok := msg["type"].(string); ok && msgType == "move" {
			if uci, ok := msg["uci"].(string); ok {
				move, err := service.MakeMove(c.GameID, c.UserID, uci)
				if err != nil {
					errorMsg := gin.H{
						"type":  "error",
						"error": err.Error(),
					}
					c.Send <- errorMsg
					continue
				}

				// Broadcast move to all clients
				game, _ := service.GetGame(c.GameID)
				moveMsg := gin.H{
					"type":      "move",
					"move":      move,
					"fen":       game.CurrentFEN,
					"status":    string(game.Status),
					"result":    string(game.Result),
				}
				hub.Broadcast(c.GameID, moveMsg)
			}
		}
	}
}

func (c *Client) writePump(conn *websocket.Conn) {
	defer conn.Close()

	for {
		select {
		case message, ok := <-c.Send:
			if !ok {
				conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := conn.WriteJSON(message); err != nil {
				return
			}
		}
	}
}
