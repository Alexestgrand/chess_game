import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const menuItems = [
    {
      icon: '🌐',
      title: 'Jouer en ligne',
      description: 'Affrontez d\'autres joueurs en temps réel',
      onClick: () => navigate('/lobby'),
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: '🤖',
      title: 'Jouer vs IA',
      description: 'Défiez l\'intelligence artificielle',
      onClick: () => navigate('/ai'),
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      icon: '👥',
      title: 'Jouer en local',
      description: 'Partie sur le même ordinateur',
      onClick: () => navigate('/local'),
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: '👤',
      title: 'Profil',
      description: 'Gérez votre compte et avatar',
      onClick: () => navigate('/profile'),
      gradient: 'from-orange-500 to-red-500',
    },
    {
      icon: '📜',
      title: 'Historique',
      description: 'Consultez vos parties précédentes',
      onClick: () => navigate('/history'),
      gradient: 'from-indigo-500 to-purple-500',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* User Profile Section */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center space-x-4">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.username}
                className="w-16 h-16 rounded-full border-2 border-purple-500"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-bold text-lg truncate">{user?.username}</h2>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-yellow-400 text-sm font-semibold">ELO</span>
                <span className="text-white text-sm">{user?.eloRating || 1200}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="p-6 border-b border-gray-700">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{user?.gamesPlayed || 0}</div>
              <div className="text-xs text-gray-400 mt-1">Parties</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{user?.wins || 0}</div>
              <div className="text-xs text-gray-400 mt-1">Victoires</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{user?.losses || 0}</div>
              <div className="text-xs text-gray-400 mt-1">Défaites</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400">{user?.draws || 0}</div>
              <div className="text-xs text-gray-400 mt-1">Nuls</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={item.onClick}
              className="w-full mb-2 p-4 rounded-lg bg-gray-700 hover:bg-gray-600 transition-all duration-200 text-left group"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <div className="text-white font-semibold">{item.title}</div>
                  <div className="text-xs text-gray-400 mt-1">{item.description}</div>
                </div>
              </div>
            </button>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={logout}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-2">Bienvenue sur Chess.com 2.0</h1>
          <p className="text-gray-300 mb-8">Choisissez votre mode de jeu</p>

          {/* Game Mode Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map((item, idx) => (
              <div
                key={idx}
                onClick={item.onClick}
                className={`bg-gradient-to-br ${item.gradient} rounded-xl p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-2xl`}
              >
                <div className="text-5xl mb-4">{item.icon}</div>
                <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
                <p className="text-white/90 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
