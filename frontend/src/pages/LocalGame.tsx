import { useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess, Square } from 'chess.js'
import './Game.css'

export default function LocalGame() {
  const [game, setGame] = useState(new Chess())
  const [moveHistory, setMoveHistory] = useState<string[]>([])
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [optionSquares, setOptionSquares] = useState<Record<string, { background: string; borderRadius?: string }>>({})
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null)

  function getMoveOptions(square: Square) {
    const moves = game.moves({
      square,
      verbose: true,
    })
    if (moves.length === 0) {
      setOptionSquares({})
      return false
    }

    const newSquares: Record<string, { background: string; borderRadius?: string }> = {}
    moves.forEach((move) => {
      newSquares[move.to] = {
        background:
          game.get(move.to as Square) && game.get(move.to as Square).color !== game.get(square).color
            ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)'
            : 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
        borderRadius: '50%',
      }
    })
    newSquares[square] = {
      background: 'rgba(255, 255, 0, 0.4)',
    }
    setOptionSquares(newSquares)
    return true
  }

  function onSquareClick(square: Square) {
    // Don't allow clicking if game is over
    if (game.isGameOver()) return

    // If it's not the player's turn, don't allow selection
    const piece = game.get(square)
    if (piece && piece.color !== game.turn()) {
      return
    }

    // If clicking the same square, deselect
    if (selectedSquare === square) {
      setSelectedSquare(null)
      setOptionSquares({})
      return
    }

    // If clicking a piece of the current player, show moves
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square)
      getMoveOptions(square)
      return
    }

    // If a square is selected and clicking a valid move square
    if (selectedSquare) {
      const move = game.move({
        from: selectedSquare,
        to: square,
        promotion: 'q',
      })

      if (move) {
        setGame(new Chess(game.fen()))
        setMoveHistory([...moveHistory, move.san])
        setLastMove({ from: selectedSquare, to: square })
        setSelectedSquare(null)
        setOptionSquares({})
      }
    }
  }

  function onPieceDrop(sourceSquare: Square, targetSquare: Square) {
    try {
      const gameCopy = new Chess(game.fen())
      
      // Check if it's the correct turn
      const piece = gameCopy.get(sourceSquare)
      if (!piece || piece.color !== gameCopy.turn()) {
        return false
      }

      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      })

      if (move === null) {
        return false
      }

      setGame(gameCopy)
      setMoveHistory([...moveHistory, move.san])
      setLastMove({ from: sourceSquare, to: targetSquare })
      setSelectedSquare(null)
      setOptionSquares({})
      return true
    } catch (error) {
      console.error('Move error:', error)
      return false
    }
  }

  const isGameOver = game.isGameOver()
  const isCheck = game.isCheck()
  const turn = game.turn()

  // Highlight last move
  const customSquareStyles: Record<string, { background: string }> = {}
  if (lastMove) {
    customSquareStyles[lastMove.from] = {
      background: 'rgba(255, 255, 0, 0.3)',
    }
    customSquareStyles[lastMove.to] = {
      background: 'rgba(255, 255, 0, 0.3)',
    }
  }

  // Highlight king in check
  if (isCheck) {
    const kingSquare = game.board().flat().find(
      (square) => square && square.type === 'k' && square.color === game.turn()
    )
    if (kingSquare) {
      const squareKey = `${String.fromCharCode(97 + (kingSquare.square.charCodeAt(0) - 97))}${9 - parseInt(kingSquare.square[1])}`
      customSquareStyles[squareKey] = {
        background: 'rgba(255, 0, 0, 0.4)',
      }
    }
  }

  return (
    <div className="game-container">
      <div className="game-header">
        <h1>Échecs Local</h1>
        <button onClick={() => {
          setGame(new Chess())
          setMoveHistory([])
          setSelectedSquare(null)
          setOptionSquares({})
          setLastMove(null)
        }} className="back-btn">
          Nouvelle partie
        </button>
      </div>

      <div className="game-content">
        <div className="game-board-section">
          <div className="game-info">
            <div className="turn-info">
              <p>
                <strong>Tour:</strong> {turn === 'w' ? '⚪ Blancs' : '⚫ Noirs'}
              </p>
              {isCheck && !isGameOver && (
                <p className="check-warning">⚠️ Échec !</p>
              )}
              {isGameOver && (
                <p className="game-over">
                  {game.isCheckmate() 
                    ? `Échec et mat ! ${turn === 'w' ? 'Noirs' : 'Blancs'} gagnent`
                    : 'Match nul'}
                </p>
              )}
            </div>
          </div>
          <Chessboard
            position={game.fen()}
            onPieceDrop={onPieceDrop}
            onSquareClick={onSquareClick}
            boardWidth={600}
            arePiecesDraggable={!isGameOver}
            customSquareStyles={{
              ...customSquareStyles,
              ...optionSquares,
            }}
            customBoardStyle={{
              borderRadius: '4px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
            animationDuration={200}
          />
        </div>

        <div className="game-sidebar">
          <h3>Coups joués</h3>
          <div className="moves-list">
            {moveHistory.length === 0 ? (
              <p className="no-moves">Aucun coup joué</p>
            ) : (
              moveHistory.map((move, idx) => (
                <div key={idx} className="move-item">
                  {Math.floor(idx / 2) + 1}. {idx % 2 === 0 ? move : `... ${move}`}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
