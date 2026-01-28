package models

import (
	"fmt"
	"net/url"
	"os"
	"strings"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// ConnectDatabase connects to PostgreSQL using environment variables
func ConnectDatabase() (*gorm.DB, error) {
	databaseURL := os.Getenv("SCALINGO_POSTGRESQL_URL")
	if databaseURL == "" {
		databaseURL = os.Getenv("DATABASE_URL")
	}
	if databaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL or SCALINGO_POSTGRESQL_URL is required")
	}

	dsn, err := parseDatabaseURL(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database URL: %w", err)
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	return db, nil
}

// AutoMigrate runs database migrations
func AutoMigrate(db *gorm.DB) error {
	// Drop tables in development if they exist (to handle schema changes)
	// In production, use proper migrations
	if os.Getenv("ENV") != "production" {
		// Drop tables in reverse order of dependencies
		db.Exec("DROP TABLE IF EXISTS moves CASCADE")
		db.Exec("DROP TABLE IF EXISTS refresh_tokens CASCADE")
		db.Exec("DROP TABLE IF EXISTS games CASCADE")
		db.Exec("DROP TABLE IF EXISTS users CASCADE")
	}

	return db.AutoMigrate(
		&User{},
		&RefreshToken{},
		&Game{},
		&Move{},
	)
}

func parseDatabaseURL(rawURL string) (string, error) {
	u, err := url.Parse(rawURL)
	if err != nil {
		return "", err
	}

	if u.Scheme != "postgres" && u.Scheme != "postgresql" {
		return "", fmt.Errorf("unsupported database scheme: %s", u.Scheme)
	}

	user := ""
	pass := ""
	if u.User != nil {
		user = u.User.Username()
		pass, _ = u.User.Password()
	}

	host := u.Hostname()
	port := u.Port()
	dbname := strings.TrimPrefix(u.Path, "/")

	q := u.Query()
	sslmode := q.Get("sslmode")
	if sslmode == "" {
		sslmode = "require"
	}

	connectTimeout := q.Get("connect_timeout")
	if connectTimeout == "" {
		connectTimeout = fmt.Sprintf("%d", int((5 * time.Second).Seconds()))
	}

	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s sslmode=%s connect_timeout=%s",
		host, user, pass, dbname, sslmode, connectTimeout,
	)
	if port != "" {
		dsn += fmt.Sprintf(" port=%s", port)
	}

	return dsn, nil
}
