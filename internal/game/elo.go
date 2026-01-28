package game

import (
	"math"
)

// CalculateELO calculates new ELO ratings based on game result
// Uses standard ELO formula: R' = R + K * (S - E)
// Where:
//   R' = new rating
//   R = current rating
//   K = K-factor (32 for most players)
//   S = actual score (1 for win, 0.5 for draw, 0 for loss)
//   E = expected score
func CalculateELO(whiteRating, blackRating int, result string) (newWhiteRating, newBlackRating int) {
	const K = 32 // K-factor for rating adjustment

	// Calculate expected scores
	expectedWhite := 1.0 / (1.0 + math.Pow(10.0, float64(blackRating-whiteRating)/400.0))
	expectedBlack := 1.0 - expectedWhite

	// Determine actual scores based on result
	var actualWhite, actualBlack float64
	switch result {
	case "white_wins":
		actualWhite = 1.0
		actualBlack = 0.0
	case "black_wins":
		actualWhite = 0.0
		actualBlack = 1.0
	case "draw":
		actualWhite = 0.5
		actualBlack = 0.5
	default:
		// No change if result is unknown
		return whiteRating, blackRating
	}

	// Calculate new ratings
	newWhiteRating = whiteRating + int(math.Round(K*(actualWhite-expectedWhite)))
	newBlackRating = blackRating + int(math.Round(K*(actualBlack-expectedBlack)))

	// Ensure ratings don't go below 0
	if newWhiteRating < 0 {
		newWhiteRating = 0
	}
	if newBlackRating < 0 {
		newBlackRating = 0
	}

	return newWhiteRating, newBlackRating
}
