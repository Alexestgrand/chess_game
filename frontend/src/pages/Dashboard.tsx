import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Dashboard.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="user-info">
          <div className="avatar-container">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.username} className="avatar" />
            ) : (
              <div className="avatar-placeholder">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div>
            <h1>Bienvenue, {user?.username}!</h1>
            <p className="user-stats">
              ELO: {user?.eloRating || 1200} | 
              Parties: {user?.gamesPlayed || 0} | 
              {user?.wins || 0}W / {user?.losses || 0}L / {user?.draws || 0}D
            </p>
          </div>
        </div>
        <button onClick={logout} className="logout-btn">
          Déconnexion
        </button>
      </div>

      <div className="dashboard-content">
        <div className="menu-grid">
          <div className="menu-card play-online" onClick={() => navigate('/lobby')}>
            <div className="menu-icon">🌐</div>
            <h2>Jouer en ligne</h2>
            <p>Affrontez d'autres joueurs en temps réel</p>
          </div>

          <div className="menu-card play-ai" onClick={() => navigate('/ai')}>
            <div className="menu-icon">🤖</div>
            <h2>Jouer vs IA</h2>
            <p>Défiez l'intelligence artificielle</p>
          </div>

          <div className="menu-card play-local" onClick={() => navigate('/local')}>
            <div className="menu-icon">👥</div>
            <h2>Jouer en local</h2>
            <p>Partie sur le même ordinateur</p>
          </div>

          <div className="menu-card profile" onClick={() => navigate('/profile')}>
            <div className="menu-icon">👤</div>
            <h2>Profil</h2>
            <p>Gérez votre compte et avatar</p>
          </div>

          <div className="menu-card history" onClick={() => navigate('/history')}>
            <div className="menu-icon">📜</div>
            <h2>Historique</h2>
            <p>Consultez vos parties précédentes</p>
          </div>
        </div>
      </div>
    </div>
  )
}
