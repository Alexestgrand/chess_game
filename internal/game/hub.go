package game

import (
	"sync"
)

// Hub manages WebSocket connections for games
type Hub struct {
	mu      sync.RWMutex
	clients map[uint]map[*Client]bool // gameID -> clients
	broadcast chan *BroadcastMessage
	register   chan *Client
	unregister chan *Client
}

// BroadcastMessage represents a message to broadcast to all clients in a game
type BroadcastMessage struct {
	GameID uint
	Data   interface{}
}

// Client represents a WebSocket client
type Client struct {
	GameID uint
	UserID uint
	Send   chan interface{}
	Hub    *Hub
}

// NewHub creates a new hub
func NewHub() *Hub {
	return &Hub{
		clients:   make(map[uint]map[*Client]bool),
		broadcast: make(chan *BroadcastMessage),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

// Run starts the hub
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if h.clients[client.GameID] == nil {
				h.clients[client.GameID] = make(map[*Client]bool)
			}
			h.clients[client.GameID][client] = true
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			if clients, ok := h.clients[client.GameID]; ok {
				if _, ok := clients[client]; ok {
					delete(clients, client)
					close(client.Send)
					if len(clients) == 0 {
						delete(h.clients, client.GameID)
					}
				}
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.RLock()
			clients := h.clients[message.GameID]
			clientsCopy := make([]*Client, 0, len(clients))
			for client := range clients {
				clientsCopy = append(clientsCopy, client)
			}
			h.mu.RUnlock()

			for _, client := range clientsCopy {
				select {
				case client.Send <- message.Data:
				default:
					close(client.Send)
					h.mu.Lock()
					delete(h.clients[client.GameID], client)
					h.mu.Unlock()
				}
			}
		}
	}
}

// Broadcast sends a message to all clients in a game
func (h *Hub) Broadcast(gameID uint, data interface{}) {
	h.broadcast <- &BroadcastMessage{
		GameID: gameID,
		Data:   data,
	}
}
