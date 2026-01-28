package auth

import (
	"crypto/rand"
	"encoding/base64"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID   uint   `json:"userId"`
	Username string `json:"username"`
	Type     string `json:"type"` // "access" or "refresh"
	jwt.RegisteredClaims
}

const (
	TokenTypeAccess  = "access"
	TokenTypeRefresh = "refresh"
)

// GenerateAccessToken generates a short-lived JWT access token
func GenerateAccessToken(userID uint, username string, secret []byte) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:   userID,
		Username: username,
		Type:     TokenTypeAccess,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(15 * time.Minute)), // 15 minutes
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secret)
}

// GenerateRefreshToken generates a long-lived refresh token
func GenerateRefreshToken(userID uint, username string, secret []byte) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:   userID,
		Username: username,
		Type:     TokenTypeRefresh,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(7 * 24 * time.Hour)), // 7 days
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secret)
}

// GenerateRefreshTokenString generates a random string for refresh token storage
func GenerateRefreshTokenString() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

// ValidateToken validates and parses a JWT token
func ValidateToken(tokenString string, secret []byte) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return secret, nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, jwt.ErrTokenInvalidClaims
	}

	return claims, nil
}

// ValidateAccessToken validates an access token specifically
func ValidateAccessToken(tokenString string, secret []byte) (*Claims, error) {
	claims, err := ValidateToken(tokenString, secret)
	if err != nil {
		return nil, err
	}
	if claims.Type != TokenTypeAccess {
		return nil, jwt.ErrTokenInvalidClaims
	}
	return claims, nil
}

// ValidateRefreshToken validates a refresh token specifically
func ValidateRefreshToken(tokenString string, secret []byte) (*Claims, error) {
	claims, err := ValidateToken(tokenString, secret)
	if err != nil {
		return nil, err
	}
	if claims.Type != TokenTypeRefresh {
		return nil, jwt.ErrTokenInvalidClaims
	}
	return claims, nil
}
