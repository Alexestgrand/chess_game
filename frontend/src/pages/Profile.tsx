import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import './Profile.css'

export default function Profile() {
  const { token, user, logout } = useAuth()
  const navigate = useNavigate()
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (user) {
      setAvatarUrl(user.avatarUrl || '')
    }
  }, [user])

  const handleSaveAvatar = async () => {
    if (!token) return
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await api.updateAvatar(token, avatarUrl)
      setSuccess('Avatar mis à jour avec succès')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to update avatar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          ← Retour
        </button>
        <button onClick={logout} className="logout-btn">
          Déconnexion
        </button>
      </div>
      <div className="profile-card">
        <h1>Profil</h1>
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}
        
        <div className="profile-info">
          <p><strong>Nom d'utilisateur:</strong> {user?.username}</p>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>ELO Rating:</strong> {user?.eloRating || 1200}</p>
          <p><strong>Statistiques:</strong> {user?.gamesPlayed || 0} parties | {user?.wins || 0}V / {user?.losses || 0}D / {user?.draws || 0}N</p>
        </div>

        <div className="avatar-section">
          <h2>Avatar</h2>
          <p className="help-text">
            Entrez l'URL de votre image d'avatar
          </p>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
            className="avatar-input"
          />
          {avatarUrl && (
            <div className="avatar-preview">
              <img src={avatarUrl} alt="Avatar preview" onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }} />
            </div>
          )}
          <button onClick={handleSaveAvatar} disabled={loading}>
            {loading ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  )
}
