package auth

import (
	"errors"
	"strings"
	"time"

	"chess-app/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrEmailExists        = errors.New("email already exists")
	ErrUsernameExists     = errors.New("username already exists")
	ErrUserNotFound       = errors.New("user not found")
)

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

// Register creates a new user account
func (s *Service) Register(username, email, password string) (*models.User, error) {
	username = strings.TrimSpace(username)
	email = strings.TrimSpace(strings.ToLower(email))
	password = strings.TrimSpace(password)

	if username == "" || email == "" || password == "" {
		return nil, errors.New("username, email, and password are required")
	}

	// Check if email exists
	var existingEmail models.User
	if err := s.db.Where("email = ?", email).First(&existingEmail).Error; err == nil {
		return nil, ErrEmailExists
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// Check if username exists
	var existingUsername models.User
	if err := s.db.Where("username = ?", username).First(&existingUsername).Error; err == nil {
		return nil, ErrUsernameExists
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Create user with default stats
	user := &models.User{
		Username:    username,
		Email:        email,
		PasswordHash: string(hashedPassword),
		AvatarURL:    "", // Default empty avatar
		ELORating:    1200, // Default ELO rating
		GamesPlayed:  0,
		Wins:         0,
		Losses:       0,
		Draws:        0,
	}

	if err := s.db.Create(user).Error; err != nil {
		return nil, err
	}

	return user, nil
}

// Login authenticates a user and returns the user
func (s *Service) Login(email, password string) (*models.User, error) {
	email = strings.TrimSpace(strings.ToLower(email))

	var user models.User
	if err := s.db.Where("email = ?", email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	return &user, nil
}

// GetUserByID retrieves a user by ID
func (s *Service) GetUserByID(id uint) (*models.User, error) {
	var user models.User
	if err := s.db.First(&user, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

// UpdateAvatar updates user avatar URL
func (s *Service) UpdateAvatar(userID uint, avatarURL string) error {
	return s.db.Model(&models.User{}).Where("id = ?", userID).Update("avatar_url", avatarURL).Error
}

// UpdateUserStats updates user statistics after a game
func (s *Service) UpdateUserStats(userID uint, result string) error {
	user, err := s.GetUserByID(userID)
	if err != nil {
		return err
	}

	updates := map[string]interface{}{
		"games_played": user.GamesPlayed + 1,
	}

	switch result {
	case "win":
		updates["wins"] = user.Wins + 1
	case "loss":
		updates["losses"] = user.Losses + 1
	case "draw":
		updates["draws"] = user.Draws + 1
	}

	return s.db.Model(&models.User{}).Where("id = ?", userID).Updates(updates).Error
}

// SaveRefreshToken saves a refresh token to the database
func (s *Service) SaveRefreshToken(userID uint, token string, expiresAt time.Time) error {
	refreshToken := &models.RefreshToken{
		UserID:    userID,
		Token:     token,
		ExpiresAt: expiresAt,
	}
	return s.db.Create(refreshToken).Error
}

// GetRefreshToken retrieves a refresh token from the database
func (s *Service) GetRefreshToken(token string) (*models.RefreshToken, error) {
	var refreshToken models.RefreshToken
	if err := s.db.Where("token = ? AND expires_at > ?", token, time.Now()).First(&refreshToken).Error; err != nil {
		return nil, err
	}
	return &refreshToken, nil
}

// DeleteRefreshToken deletes a refresh token
func (s *Service) DeleteRefreshToken(token string) error {
	return s.db.Where("token = ?", token).Delete(&models.RefreshToken{}).Error
}

// DeleteUserRefreshTokens deletes all refresh tokens for a user
func (s *Service) DeleteUserRefreshTokens(userID uint) error {
	return s.db.Where("user_id = ?", userID).Delete(&models.RefreshToken{}).Error
}
