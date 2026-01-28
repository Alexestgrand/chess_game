package main

import (
	"log"
	"net/http"

	"chess-app/internal/auth"
	"chess-app/internal/config"
	"chess-app/internal/game"
	"chess-app/internal/middleware"
	"chess-app/internal/models"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Connect to database
	db, err := models.ConnectDatabase()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Run migrations
	if err := models.AutoMigrate(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	log.Println("Database connected and migrated successfully")

	// Initialize services
	authService := auth.NewService(db)
	authHandler := auth.NewHandler(authService, cfg)
	
	gameService := game.NewService(db)
	matchmakingService := game.NewMatchmakingService(db)
	gameHandler := game.NewHandlerWithMatchmaking(gameService, matchmakingService)
	gameHub := game.NewHub()
	go gameHub.Run()
	wsHandler := game.NewWSHandler(gameHub, gameService, cfg)

	// Setup router
	r := gin.Default()

	// CORS middleware
	r.Use(func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		// Allow localhost origins for development
		if origin == "" || origin == "http://localhost:3000" || origin == "http://127.0.0.1:3000" {
			if origin == "" {
				origin = "*"
			}
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		}
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")
		c.Writer.Header().Set("Access-Control-Expose-Headers", "Content-Length, Content-Type")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	})

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// API routes
	api := r.Group("/api")
	{
		// Auth routes (public)
		api.POST("/auth/register", authHandler.Register)
		api.POST("/auth/login", authHandler.Login)

		// Auth routes (public)
		api.POST("/auth/refresh", authHandler.RefreshToken)
		api.POST("/auth/logout", authHandler.Logout)

		// Protected routes
		protected := api.Group("")
		protected.Use(middleware.JWTAuthMiddleware(cfg))
		{
			// Auth routes
			protected.GET("/auth/me", authHandler.GetProfile)
			protected.PUT("/auth/avatar", authHandler.UpdateAvatar)
			
			// Game routes
			protected.POST("/games", gameHandler.CreateGame)
			protected.GET("/games", gameHandler.GetUserGames)
			protected.GET("/games/:id", gameHandler.GetGame)
			protected.POST("/games/:id/join", gameHandler.JoinGame)
			protected.GET("/games/:id/history", gameHandler.GetGameHistory)
			
			// Matchmaking routes
			protected.POST("/matchmaking/find", gameHandler.FindMatch)
			protected.POST("/matchmaking/cancel", gameHandler.CancelMatchmaking)
			protected.GET("/matchmaking/status", gameHandler.GetQueueStatus)
		}
		
		// WebSocket route (auth handled in handler via query param)
		api.GET("/ws/games/:id", wsHandler.HandleWebSocket)
	}

	// Start server
	log.Printf("Server starting on port %s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
