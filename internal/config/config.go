package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port        string
	JWTSecret   string
	DatabaseURL string
}

func Load() (*Config, error) {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET environment variable is required")
	}

	databaseURL := os.Getenv("SCALINGO_POSTGRESQL_URL")
	if databaseURL == "" {
		databaseURL = os.Getenv("DATABASE_URL")
	}
	if databaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL or SCALINGO_POSTGRESQL_URL environment variable is required")
	}

	return &Config{
		Port:        port,
		JWTSecret:   jwtSecret,
		DatabaseURL: databaseURL,
	}, nil
}
