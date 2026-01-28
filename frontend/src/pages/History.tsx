import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api, Game } from '../services/api'
import './History.css'

export default function History() {
  const { token, logout } = useAuth()
  const navigate = useNavigate()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return

    const loadGames = async () => {
      try {
        const userGames = await api.getUserGames(token)
        setGames(userGames)
      } catch (err: any) {
        setError(err.message || 'Failed to load games')
      } finally {
        setLoading(false)
      }
    }

    loadGames()
  }, [token])

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'En attente'
      case 'active':
        return 'En cours'
      case 'finished':
        return 'Terminé'
      default:
        return status
    }
  }

  const getResultLabel = (result: string) => {
    switch (result) {
      case 'white_wins':
        return 'Blancs gagnent'
      case 'black_wins':
        return 'Noirs gagnent'
      case 'draw':
        return 'Match nul'
      default:
        return '-'
    }
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          ← Retour
        </button>
        <h1>Historique des parties</h1>
        <button onClick={logout} className="logout-btn">
          Déconnexion
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading">Chargement...</div>
      ) : games.length === 0 ? (
        <div className="no-games">
          <p>Aucune partie trouvée</p>
          <button onClick={() => navigate('/lobby')} className="primary-btn">
            Créer une partie
          </button>
        </div>
      ) : (
        <div className="games-list">
          {games.map((game) => (
            <div key={game.id} className="game-card">
              <div className="game-card-header">
                <span className="game-id">Partie #{game.id}</span>
                <span className={`status-badge ${game.status}`}>
                  {getStatusLabel(game.status)}
                </span>
              </div>
              <div className="game-card-body">
                <div className="players">
                  <p><strong>Blancs:</strong> {game.whitePlayer?.username || 'En attente'}</p>
                  <p><strong>Noirs:</strong> {game.blackPlayer?.username || 'En attente'}</p>
                </div>
                {game.result && (
                  <p className="result"><strong>Résultat:</strong> {getResultLabel(game.result)}</p>
                )}
                <p className="date">
                  Créée le {new Date(game.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="game-card-actions">
                <button
                  onClick={() => navigate(`/game/${game.id}`)}
                  className="view-btn"
                >
                  Voir la partie
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
