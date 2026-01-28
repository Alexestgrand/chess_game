package game

import (
	"errors"

	"chess-app/internal/chess"
	"chess-app/internal/models"

	"gorm.io/gorm"
)

var (
	ErrGameNotFound   = errors.New("game not found")
	ErrGameFull       = errors.New("game is full")
	ErrNotInGame      = errors.New("user not in this game")
	ErrInvalidMove    = errors.New("invalid move")
	ErrIllegalMove    = errors.New("illegal move")
	ErrNotYourTurn    = errors.New("not your turn")
	ErrGameFinished   = errors.New("game is finished")
)

type Service struct {
	db *gorm.DB
}

// GetDB returns the database instance (for matchmaking service)
func (s *Service) GetDB() *gorm.DB {
	return s.db
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

// CreateGame creates a new game
func (s *Service) CreateGame(whitePlayerID uint, timeControl int) (*models.Game, error) {
	engine := chess.NewEngine()
	
	if timeControl <= 0 {
		timeControl = 600 // Default 10 minutes
	}
	
	game := &models.Game{
		WhitePlayerID: &whitePlayerID,
		Status:        models.GameStatusWaiting,
		CurrentFEN:    engine.GetFEN(),
		TimeControl:   timeControl,
		WhiteTimeLeft: timeControl,
		BlackTimeLeft: timeControl,
		PGN:           "",
	}

	if err := s.db.Create(game).Error; err != nil {
		return nil, err
	}

	return game, nil
}

// GetGame retrieves a game by ID
func (s *Service) GetGame(gameID uint) (*models.Game, error) {
	var game models.Game
	if err := s.db.Preload("WhitePlayer").Preload("BlackPlayer").First(&game, gameID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrGameNotFound
		}
		return nil, err
	}
	return &game, nil
}

// JoinGame allows a player to join a waiting game
func (s *Service) JoinGame(gameID uint, blackPlayerID uint) (*models.Game, error) {
	game, err := s.GetGame(gameID)
	if err != nil {
		return nil, err
	}

	if game.Status != models.GameStatusWaiting {
		return nil, errors.New("game is not waiting for players")
	}

	if game.WhitePlayerID != nil && *game.WhitePlayerID == blackPlayerID {
		return nil, errors.New("cannot join as both players")
	}

	game.BlackPlayerID = &blackPlayerID
	game.Status = models.GameStatusActive

	if err := s.db.Save(game).Error; err != nil {
		return nil, err
	}

	return game, nil
}

// MakeMove validates and applies a move
func (s *Service) MakeMove(gameID uint, playerID uint, uci string) (*models.Move, error) {
	// Get game
	game, err := s.GetGame(gameID)
	if err != nil {
		return nil, err
	}

	// Check if user is in the game
	isWhite := game.WhitePlayerID != nil && *game.WhitePlayerID == playerID
	isBlack := game.BlackPlayerID != nil && *game.BlackPlayerID == playerID
	if !isWhite && !isBlack {
		return nil, ErrNotInGame
	}

	// Create engine from current FEN
	engine, err := chess.NewEngineFromFEN(game.CurrentFEN)
	if err != nil {
		return nil, err
	}

	// Check if it's the player's turn
	if isWhite && !engine.IsWhiteTurn() {
		return nil, ErrNotYourTurn
	}
	if isBlack && !engine.IsBlackTurn() {
		return nil, ErrNotYourTurn
	}

	// Validate move
	if err := engine.ValidateMove(uci); err != nil {
		if err == chess.ErrInvalidMove {
			return nil, ErrInvalidMove
		}
		if err == chess.ErrIllegalMove {
			return nil, ErrIllegalMove
		}
		if err == chess.ErrGameFinished {
			return nil, ErrGameFinished
		}
		return nil, err
	}

	// Apply move
	if err := engine.MakeMove(uci); err != nil {
		return nil, err
	}

	// Count existing moves for ply number
	var moveCount int64
	s.db.Model(&models.Move{}).Where("game_id = ?", gameID).Count(&moveCount)

	// Use transaction for atomicity
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Create move record
	move := &models.Move{
		GameID:       gameID,
		PlayerID:     playerID,
		MoveNotation: uci,
		BoardState:   engine.GetFEN(),
		PlyNumber:    int(moveCount) + 1,
	}

	if err := tx.Create(move).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// Update game state
	game.CurrentFEN = engine.GetFEN()
	game.PGN = engine.GetPGN() // Update PGN notation
	outcomeStr := engine.GetOutcome()
	if outcomeStr != "" {
		game.Status = models.GameStatusFinished
		game.Result = models.GameResult(outcomeStr)

		// Update ELO ratings and stats
		if game.WhitePlayerID != nil && game.BlackPlayerID != nil {
			var whitePlayer, blackPlayer models.User
			if err := tx.First(&whitePlayer, *game.WhitePlayerID).Error; err == nil {
				if err := tx.First(&blackPlayer, *game.BlackPlayerID).Error; err == nil {
					// Calculate new ELO ratings
					newWhiteELO, newBlackELO := CalculateELO(
						whitePlayer.ELORating,
						blackPlayer.ELORating,
						outcomeStr,
					)

					// Update white player
					whiteUpdates := map[string]interface{}{
						"elo_rating":   newWhiteELO,
						"games_played": whitePlayer.GamesPlayed + 1,
					}
					switch models.GameResult(outcomeStr) {
					case models.GameResultWhiteWins:
						whiteUpdates["wins"] = whitePlayer.Wins + 1
					case models.GameResultBlackWins:
						whiteUpdates["losses"] = whitePlayer.Losses + 1
					case models.GameResultDraw:
						whiteUpdates["draws"] = whitePlayer.Draws + 1
					}
					tx.Model(&whitePlayer).Updates(whiteUpdates)

					// Update black player
					blackUpdates := map[string]interface{}{
						"elo_rating":   newBlackELO,
						"games_played": blackPlayer.GamesPlayed + 1,
					}
					switch models.GameResult(outcomeStr) {
					case models.GameResultWhiteWins:
						blackUpdates["losses"] = blackPlayer.Losses + 1
					case models.GameResultBlackWins:
						blackUpdates["wins"] = blackPlayer.Wins + 1
					case models.GameResultDraw:
						blackUpdates["draws"] = blackPlayer.Draws + 1
					}
					tx.Model(&blackPlayer).Updates(blackUpdates)
				}
			}
		}
	}

	if err := tx.Save(game).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return move, nil
}

// GetGameHistory returns all moves for a game
func (s *Service) GetGameHistory(gameID uint) ([]models.Move, error) {
	var moves []models.Move
	if err := s.db.Where("game_id = ?", gameID).Order("ply_number ASC").Find(&moves).Error; err != nil {
		return nil, err
	}
	return moves, nil
}

// GetUserGames returns all games for a user
func (s *Service) GetUserGames(userID uint) ([]models.Game, error) {
	var games []models.Game
	if err := s.db.Where("white_player_id = ? OR black_player_id = ?", userID, userID).
		Preload("WhitePlayer").
		Preload("BlackPlayer").
		Order("created_at DESC").
		Find(&games).Error; err != nil {
		return nil, err
	}
	return games, nil
}
