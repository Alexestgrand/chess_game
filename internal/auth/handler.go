package auth

import (
	"net/http"
	"time"

	"chess-app/internal/config"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
	config  *config.Config
}

func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{
		service: service,
		config:  cfg,
	}
}

type RegisterRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	AccessToken  string      `json:"accessToken"`
	RefreshToken string      `json:"refreshToken"`
	User         interface{} `json:"user"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refreshToken" binding:"required"`
}

type RefreshTokenResponse struct {
	AccessToken string `json:"accessToken"`
}

// Register handles user registration
func (h *Handler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.service.Register(req.Username, req.Email, req.Password)
	if err != nil {
		switch err {
		case ErrEmailExists:
			c.JSON(http.StatusConflict, gin.H{"error": "email already exists"})
		case ErrUsernameExists:
			c.JSON(http.StatusConflict, gin.H{"error": "username already exists"})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	// Generate access token (15 minutes)
	accessToken, err := GenerateAccessToken(user.ID, user.Username, []byte(h.config.JWTSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate access token"})
		return
	}

	// Generate refresh token (7 days)
	refreshTokenString, err := GenerateRefreshTokenString()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate refresh token"})
		return
	}

	refreshTokenJWT, err := GenerateRefreshToken(user.ID, user.Username, []byte(h.config.JWTSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate refresh token"})
		return
	}

	// Save refresh token to database
	expiresAt := time.Now().Add(7 * 24 * time.Hour)
	if err := h.service.SaveRefreshToken(user.ID, refreshTokenString, expiresAt); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save refresh token"})
		return
	}

	// Set secure HTTP-only cookie for refresh token
	c.SetCookie(
		"refresh_token",
		refreshTokenString,
		int(7*24*time.Hour.Seconds()),
		"/",
		"",
		true,  // Secure (HTTPS only in production)
		true,  // HttpOnly
	)

	c.JSON(http.StatusCreated, AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshTokenJWT,
		User: gin.H{
			"id":          user.ID,
			"username":    user.Username,
			"email":       user.Email,
			"avatarUrl":   user.AvatarURL,
			"eloRating":   user.ELORating,
			"gamesPlayed": user.GamesPlayed,
			"wins":        user.Wins,
			"losses":      user.Losses,
			"draws":       user.Draws,
		},
	})
}

// Login handles user login
func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.service.Login(req.Email, req.Password)
	if err != nil {
		if err == ErrInvalidCredentials {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	// Generate access token (15 minutes)
	accessToken, err := GenerateAccessToken(user.ID, user.Username, []byte(h.config.JWTSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate access token"})
		return
	}

	// Generate refresh token (7 days)
	refreshTokenString, err := GenerateRefreshTokenString()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate refresh token"})
		return
	}

	refreshTokenJWT, err := GenerateRefreshToken(user.ID, user.Username, []byte(h.config.JWTSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate refresh token"})
		return
	}

	// Save refresh token to database
	expiresAt := time.Now().Add(7 * 24 * time.Hour)
	if err := h.service.SaveRefreshToken(user.ID, refreshTokenString, expiresAt); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save refresh token"})
		return
	}

	// Set secure HTTP-only cookie for refresh token
	c.SetCookie(
		"refresh_token",
		refreshTokenString,
		int(7*24*time.Hour.Seconds()),
		"/",
		"",
		true,  // Secure (HTTPS only in production)
		true,  // HttpOnly
	)

	c.JSON(http.StatusOK, AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshTokenJWT,
		User: gin.H{
			"id":          user.ID,
			"username":    user.Username,
			"email":       user.Email,
			"avatarUrl":   user.AvatarURL,
			"eloRating":   user.ELORating,
			"gamesPlayed": user.GamesPlayed,
			"wins":        user.Wins,
			"losses":      user.Losses,
			"draws":       user.Draws,
		},
	})
}

// GetProfile returns the current user's profile
func (h *Handler) GetProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	user, err := h.service.GetUserByID(userID.(uint))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          user.ID,
		"username":    user.Username,
		"email":       user.Email,
		"avatarUrl":   user.AvatarURL,
		"eloRating":   user.ELORating,
		"gamesPlayed": user.GamesPlayed,
		"wins":        user.Wins,
		"losses":      user.Losses,
		"draws":       user.Draws,
		"createdAt":   user.CreatedAt,
	})
}

type UpdateAvatarRequest struct {
	AvatarURL string `json:"avatarUrl" binding:"required"`
}

// UpdateAvatar updates user avatar URL
func (h *Handler) UpdateAvatar(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req UpdateAvatarRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.UpdateAvatar(userID.(uint), req.AvatarURL); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update avatar"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "avatar updated", "avatarUrl": req.AvatarURL})
}

// RefreshToken handles refresh token requests
func (h *Handler) RefreshToken(c *gin.Context) {
	// Try to get refresh token from cookie first, then from body
	refreshTokenString := ""
	if cookie, err := c.Cookie("refresh_token"); err == nil {
		refreshTokenString = cookie
	} else {
		var req RefreshTokenRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "refresh token required"})
			return
		}
		refreshTokenString = req.RefreshToken
	}

	if refreshTokenString == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "refresh token required"})
		return
	}

	// Validate refresh token from database
	refreshToken, err := h.service.GetRefreshToken(refreshTokenString)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired refresh token"})
		return
	}

	// Get user
	user, err := h.service.GetUserByID(refreshToken.UserID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	// Generate new access token
	accessToken, err := GenerateAccessToken(user.ID, user.Username, []byte(h.config.JWTSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate access token"})
		return
	}

	c.JSON(http.StatusOK, RefreshTokenResponse{
		AccessToken: accessToken,
	})
}

// Logout handles user logout
func (h *Handler) Logout(c *gin.Context) {
	// Delete refresh token from cookie
	refreshTokenString := ""
	if cookie, err := c.Cookie("refresh_token"); err == nil {
		refreshTokenString = cookie
	}

	if refreshTokenString != "" {
		h.service.DeleteRefreshToken(refreshTokenString)
	}

	// Clear cookie
	c.SetCookie(
		"refresh_token",
		"",
		-1,
		"/",
		"",
		true,
		true,
	)

	c.JSON(http.StatusOK, gin.H{"message": "logged out successfully"})
}
