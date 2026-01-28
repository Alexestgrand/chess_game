import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Chessboard } from 'react-chessboard'
import { Chess, Square } from 'chess.js'
import { useAuth } from '../contexts/AuthContext'
import { api, Game as GameType } from '../services/api'
import { WebSocketClient } from '../services/websocket'
import './Game.css'

export default function Game() {
  const { id } = useParams<{ id: string }>()
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [game, setGame] = useState<GameType | null>(null)
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
  const [chessGame, setChessGame] = useState(new Chess())
  const [error, setError] = useState('')
  const [moves, setMoves] = useState<string[]>([])
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [optionSquares, setOptionSquares] = useState<Record<string, { background: string; borderRadius?: string }>>({})
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null)
  const [whiteTimeLeft, setWhiteTimeLeft] = useState<number>(600)
  const [blackTimeLeft, setBlackTimeLeft] = useState<number>(600)
  const [timeControl, setTimeControl] = useState<number>(600)
  const timerIntervalRef = useRef<number | null>(null)
  const wsClientRef = useRef<WebSocketClient | null>(null)

  useEffect(() => {
    if (!token || !id) return

    let isMounted = true

    const loadGame = async () => {
      try {
        const gameData = await api.getGame(token, parseInt(id))
        if (!isMounted) return

        setGame(gameData)
        setFen(gameData.currentFEN)
        const newChess = new Chess(gameData.currentFEN)
        setChessGame(newChess)
        
        // Initialize timers
        setTimeControl(gameData.timeControl || 600)
        setWhiteTimeLeft(gameData.whiteTimeLeft || gameData.timeControl || 600)
        setBlackTimeLeft(gameData.blackTimeLeft || gameData.timeControl || 600)

        // Load move history
        const history = await api.getGameHistory(token, gameData.id)
        if (isMounted) {
          setMoves(history.map(m => m.moveNotation))
          // Set last move from history
          if (history.length > 0) {
            const lastMoveData = history[history.length - 1]
            const uci = lastMoveData.moveNotation
            if (uci.length >= 4) {
              setLastMove({
                from: uci.substring(0, 2) as Square,
                to: uci.substring(2, 4) as Square,
              })
            }
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load game')
        }
      }
    }

    loadGame()

    // Setup WebSocket
    const wsClient = new WebSocketClient(
      parseInt(id),
      token,
      (msg) => {
        if (!isMounted) return

        if (msg.type === 'game_state') {
          setFen(msg.fen as string)
          const newChess = new Chess(msg.fen as string)
          setChessGame(newChess)
          if (msg.timeControl) setTimeControl(msg.timeControl as number)
          if (msg.whiteTimeLeft !== undefined) setWhiteTimeLeft(msg.whiteTimeLeft as number)
          if (msg.blackTimeLeft !== undefined) setBlackTimeLeft(msg.blackTimeLeft as number)
          if (msg.status) {
            setGame(prev => prev ? { ...prev, status: msg.status as string } : null)
          }
        } else if (msg.type === 'move') {
          const move = msg.move as any
          setFen(msg.fen as string)
          const newChess = new Chess(msg.fen as string)
          setChessGame(newChess)
          setMoves(prev => [...prev, move.moveNotation])
          
          // Update timers
          if (msg.whiteTimeLeft !== undefined) setWhiteTimeLeft(msg.whiteTimeLeft as number)
          if (msg.blackTimeLeft !== undefined) setBlackTimeLeft(msg.blackTimeLeft as number)
          
          // Update last move
          const uci = move.moveNotation
          if (uci && uci.length >= 4) {
            setLastMove({
              from: uci.substring(0, 2) as Square,
              to: uci.substring(2, 4) as Square,
            })
          }
          
          if (msg.status) {
            setGame(prev => prev ? { ...prev, status: msg.status as string } : null)
          }
          setSelectedSquare(null)
          setOptionSquares({})
        } else if (msg.type === 'error') {
          setError(msg.error as string)
          setTimeout(() => setError(''), 5000)
        }
      },
      (err) => {
        if (isMounted) {
          setError(err.message)
        }
      }
    )

    wsClientRef.current = wsClient
    wsClient.connect()

    return () => {
      isMounted = false
      wsClient.disconnect()
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [token, id])

  // Timer effect
  useEffect(() => {
    if (game?.status !== 'active' || game?.result) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
      return
    }

    timerIntervalRef.current = window.setInterval(() => {
      const currentTurn = chessGame.turn()
      if (currentTurn === 'w') {
        setWhiteTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up - white loses
            return 0
          }
          return prev - 1
        })
      } else {
        setBlackTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up - black loses
            return 0
          }
          return prev - 1
        })
      }
    }, 1000)

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [game?.status, game?.result, chessGame.turn()])

  function getMoveOptions(square: Square) {
    const moves = chessGame.moves({
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
          chessGame.get(move.to as Square) && chessGame.get(move.to as Square).color !== chessGame.get(square).color
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
    if (!game || !wsClientRef.current || game.status !== 'active') return

    const isWhite = game.whitePlayerId === user?.id
    const isBlack = game.blackPlayerId === user?.id

    if (!isWhite && !isBlack) {
      return
    }

    // Don't allow clicking if it's not your turn
    const isMyTurn = chessGame.turn() === 'w' ? isWhite : isBlack
    if (!isMyTurn) return

    const piece = chessGame.get(square)
    if (piece && piece.color !== chessGame.turn()) {
      return
    }

    if (selectedSquare === square) {
      setSelectedSquare(null)
      setOptionSquares({})
      return
    }

    if (piece && piece.color === chessGame.turn()) {
      setSelectedSquare(square)
      getMoveOptions(square)
      return
    }

    if (selectedSquare) {
      const move = chessGame.move({
        from: selectedSquare,
        to: square,
        promotion: 'q',
      })

      if (move) {
        const uci = `${selectedSquare}${square}`
        wsClientRef.current.sendMove(uci)
        setError('')
        setSelectedSquare(null)
        setOptionSquares({})
      }
    }
  }

  function onDrop(sourceSquare: Square, targetSquare: Square) {
    if (!game || !wsClientRef.current) return false

    const isWhite = game.whitePlayerId === user?.id
    const isBlack = game.blackPlayerId === user?.id

    if (!isWhite && !isBlack) {
      setError('Vous n\'êtes pas un joueur de cette partie')
      return false
    }

    try {
      const tempGame = new Chess(fen)
      const move = tempGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      })

      if (move === null) {
        setError('Coup invalide')
        return false
      }

      // Check turn
      const currentTurn = tempGame.turn()
      const isMyTurn = currentTurn === 'w' ? isWhite : isBlack
      if (!isMyTurn) {
        setError("Ce n'est pas votre tour")
        return false
      }

      // Send move via WebSocket
      const uci = `${sourceSquare}${targetSquare}`
      wsClientRef.current.sendMove(uci)
      setError('')
      setSelectedSquare(null)
      setOptionSquares({})

      return true
    } catch (err) {
      setError('Erreur lors du coup')
      return false
    }
  }

  const isWhite = game?.whitePlayerId === user?.id
  const isBlack = game?.blackPlayerId === user?.id
  const isMyTurn = chessGame.turn() === 'w' ? isWhite : isBlack

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

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
  if (chessGame.isCheck()) {
    const board = chessGame.board()
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const square = board[i][j]
        if (square && square.type === 'k' && square.color === chessGame.turn()) {
          const file = String.fromCharCode(97 + j)
          const rank = (8 - i).toString()
          customSquareStyles[`${file}${rank}`] = {
            background: 'rgba(255, 0, 0, 0.4)',
          }
        }
      }
    }
  }

  return (
    <div className="game-container">
      <div className="game-header">
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          ← Retour au menu
        </button>
        <div className="game-status">
          {game?.status === 'waiting' && <span className="status-badge waiting">En attente</span>}
          {game?.status === 'active' && <span className="status-badge active">En cours</span>}
          {game?.status === 'finished' && <span className="status-badge finished">Terminé</span>}
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="game-content">
        <div className="game-board-section">
          <div className="game-info">
            <div className="player-info">
              <p><strong>Blancs:</strong> {game?.whitePlayer?.username || 'En attente...'}</p>
              <p><strong>Noirs:</strong> {game?.blackPlayer?.username || 'En attente...'}</p>
            </div>
            <div className="turn-info">
              <p>Tour: {chessGame.turn() === 'w' ? '⚪ Blancs' : '⚫ Noirs'}</p>
              <div className="timers">
                <div className={`timer ${chessGame.turn() === 'w' ? 'active' : ''}`}>
                  <span>Blancs: {formatTime(whiteTimeLeft)}</span>
                </div>
                <div className={`timer ${chessGame.turn() === 'b' ? 'active' : ''}`}>
                  <span>Noirs: {formatTime(blackTimeLeft)}</span>
                </div>
              </div>
              {chessGame.isCheck() && game?.status === 'active' && (
                <p className="check-warning">⚠️ Échec !</p>
              )}
              {isMyTurn && game?.status === 'active' && (
                <p className="your-turn">✨ C'est votre tour !</p>
              )}
            </div>
          </div>
          <Chessboard
            position={fen}
            onPieceDrop={onDrop}
            onSquareClick={onSquareClick}
            boardWidth={600}
            arePiecesDraggable={isMyTurn && game?.status === 'active'}
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
            {moves.length === 0 ? (
              <p className="no-moves">Aucun coup joué</p>
            ) : (
              moves.map((move, idx) => (
                <div key={idx} className="move-item">
                  {idx + 1}. {move}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
