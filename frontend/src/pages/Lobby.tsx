import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import './Lobby.css'

export default function Lobby() {
  const [gameId, setGameId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [matchmaking, setMatchmaking] = useState(false)
  const [queuePosition, setQueuePosition] = useState<number | null>(null)
  const { token, logout, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!matchmaking || !token) return

    const checkStatus = async () => {
      try {
        const status = await api.getMatchmakingStatus(token)
        if (status.inQueue) {
          setQueuePosition(status.position)
        } else {
          setMatchmaking(false)
          setQueuePosition(null)
        }
      } catch (err) {
        console.error('Failed to check matchmaking status:', err)
      }
    }

    const interval = setInterval(checkStatus, 2000) // Check every 2 seconds
    return () => clearInterval(interval)
  }, [matchmaking, token])

  const handleFindMatch = async () => {
    if (!token) return
    setError('')
    setLoading(true)
    setMatchmaking(true)

    try {
      const result = await api.findMatch(token)
      if (result.matched && result.game) {
        setMatchmaking(false)
        navigate(`/game/${result.game.id}`)
      } else {
        setQueuePosition(result.position || 1)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to find match')
      setMatchmaking(false)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelMatchmaking = async () => {
    if (!token) return
    try {
      await api.cancelMatchmaking(token)
      setMatchmaking(false)
      setQueuePosition(null)
    } catch (err: any) {
      setError(err.message || 'Failed to cancel matchmaking')
    }
  }

  const handleCreateGame = async () => {
    if (!token) return
    setError('')
    setLoading(true)

    try {
      const game = await api.createGame(token)
      navigate(`/game/${game.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create game')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinGame = async () => {
    if (!token || !gameId.trim()) {
      setError('Veuillez entrer un ID de partie')
      return
    }
    setError('')
    setLoading(true)

    try {
      const gameIdNum = parseInt(gameId.trim())
      await api.joinGame(token, gameIdNum)
      navigate(`/game/${gameIdNum}`)
    } catch (err: any) {
      setError(err.message || 'Failed to join game')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="lobby-container">
      <div className="lobby-header">
        <div>
          <h1>Échecs en ligne</h1>
          <p className="welcome-text">Bienvenue, {user?.username}!</p>
          <p className="elo-text">ELO: {user?.eloRating || 1200}</p>
        </div>
        <div className="header-actions">
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            ← Menu principal
          </button>
        </div>
      </div>
      <div className="lobby-content">
        <div className="lobby-card">
          {error && <div className="error">{error}</div>}
          
          {matchmaking ? (
            <div className="matchmaking-section">
              <h2>🔍 Recherche d'adversaire...</h2>
              <p className="queue-info">
                Position dans la file: {queuePosition || '...'}
              </p>
              <div className="loading-spinner"></div>
              <button
                onClick={handleCancelMatchmaking}
                className="cancel-btn"
                disabled={loading}
              >
                Annuler
              </button>
            </div>
          ) : (
            <>
              <div className="lobby-section">
                <h2>Matchmaking rapide</h2>
                <p className="section-description">
                  Trouvez un adversaire avec un ELO similaire automatiquement
                </p>
                <button
                  onClick={handleFindMatch}
                  disabled={loading}
                  className="primary-btn"
                >
                  {loading ? 'Recherche...' : 'Trouver un match'}
                </button>
              </div>

              <div className="lobby-divider">ou</div>

              <div className="lobby-section">
                <h2>Créer une partie</h2>
                <p className="section-description">Créez une nouvelle partie et partagez l'ID</p>
                <button
                  onClick={handleCreateGame}
                  disabled={loading}
                  className="primary-btn"
                >
                  {loading ? 'Création...' : 'Nouvelle partie'}
                </button>
              </div>

              <div className="lobby-divider">ou</div>

              <div className="lobby-section">
                <h2>Rejoindre une partie</h2>
                <p className="section-description">Entrez l'ID d'une partie pour rejoindre</p>
                <input
                  type="text"
                  placeholder="ID de la partie"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
                />
                <button
                  onClick={handleJoinGame}
                  disabled={loading || !gameId.trim()}
                  className="primary-btn"
                >
                  {loading ? 'Connexion...' : 'Rejoindre'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
