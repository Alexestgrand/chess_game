import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chessboard } from 'react-chessboard'
import { Chess, Square } from 'chess.js'
import { StockfishEngine } from '../services/stockfish'
import './Game.css'

export default function AIGame() {
  const navigate = useNavigate()
  const [game, setGame] = useState(new Chess())
  const [moveHistory, setMoveHistory] = useState<string[]>([])
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [optionSquares, setOptionSquares] = useState<Record<string, { background: string; borderRadius?: string }>>({})
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null)
  const [difficulty, setDifficulty] = useState(5)
  const [isThinking, setIsThinking] = useState(false)
  const stockfishRef = useRef<StockfishEngine | null>(null)

  useEffect(() => {
    // Initialize Stockfish
    stockfishRef.current = new StockfishEngine()
    stockfishRef.current.setDifficulty(difficulty)

    return () => {
      if (stockfishRef.current) {
        stockfishRef.current.destroy()
      }
    }
  }, [difficulty])

  useEffect(() => {
    if (stockfishRef.current) {
      stockfishRef.current.setDifficulty(difficulty)
    }
  }, [difficulty])

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
    // Only allow player (white) to interact
    if (game.isGameOver() || game.turn() !== 'w' || isThinking) return

    const piece = game.get(square)
    if (piece && piece.color !== 'w') {
      return
    }

    if (selectedSquare === square) {
      setSelectedSquare(null)
      setOptionSquares({})
      return
    }

    if (piece && piece.color === 'w') {
      setSelectedSquare(square)
      getMoveOptions(square)
      return
    }

    if (selectedSquare) {
      const move = game.move({
        from: selectedSquare,
        to: square,
        promotion: 'q',
      })

      if (move) {
        const newGame = new Chess(game.fen())
        newGame.move(move)
        setGame(newGame)
        setMoveHistory([...moveHistory, move.san])
        setLastMove({ from: selectedSquare, to: square })
        setSelectedSquare(null)
        setOptionSquares({})

        // AI makes a move
        makeAIMove(newGame.fen())
      }
    }
  }

  async function makeAIMove(fen: string) {
    if (!stockfishRef.current || game.isGameOver()) return

    setIsThinking(true)
    
    try {
      // Calculate delay based on difficulty (higher difficulty = longer thinking)
      const delay = Math.min(500 + (difficulty * 200), 2000)
      
      const aiMove = await stockfishRef.current.calculateMove(fen, delay)
      
      const aiGameCopy = new Chess(fen)
      const move = aiGameCopy.move({
        from: aiMove.from,
        to: aiMove.to,
        promotion: aiMove.promotion || 'q',
      })

      if (move) {
        setGame(aiGameCopy)
        setMoveHistory(prev => [...prev, move.san])
        setLastMove({ from: aiMove.from, to: aiMove.to })
      }
    } catch (error) {
      console.error('AI move error:', error)
    } finally {
      setIsThinking(false)
    }
  }

  function onPieceDrop(sourceSquare: Square, targetSquare: Square) {
    // Only allow player (white) to move
    if (game.turn() !== 'w' || isThinking) return false

    try {
      const gameCopy = new Chess(game.fen())
      
      const piece = gameCopy.get(sourceSquare)
      if (!piece || piece.color !== 'w') {
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

      // AI makes a move
      makeAIMove(gameCopy.fen())

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
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          ← Retour au menu
        </button>
        <div className="header-right">
          <div className="ai-controls">
            <label>
              Difficulté: {difficulty}/10
              <input
                type="range"
                min="1"
                max="10"
                value={difficulty}
                onChange={(e) => setDifficulty(parseInt(e.target.value))}
                disabled={moveHistory.length > 0}
                className="difficulty-slider"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="game-content">
        <div className="game-board-section">
          <div className="game-info">
            <div className="turn-info">
              <p>
                <strong>Tour:</strong> {turn === 'w' ? '⚪ Vous (Blancs)' : '⚫ IA (Noirs)'}
              </p>
              {isThinking && turn === 'b' && (
                <p className="thinking-indicator">🤔 L'IA réfléchit...</p>
              )}
              {isCheck && !isGameOver && (
                <p className="check-warning">⚠️ Échec !</p>
              )}
              {isGameOver && (
                <p className="game-over">
                  {game.isCheckmate() 
                    ? `Échec et mat ! ${turn === 'w' ? 'IA' : 'Vous'} gagnez`
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
            arePiecesDraggable={!isGameOver && turn === 'w' && !isThinking}
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
