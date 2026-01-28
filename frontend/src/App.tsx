import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Lobby from './pages/Lobby'
import Game from './pages/Game'
import LocalGame from './pages/LocalGame'
import AIGame from './pages/AIGame'
import History from './pages/History'
import './App.css'

function App() {
  const { token } = useAuth()

  return (
    <div className="app">
      <Routes>
        <Route path="/login" element={!token ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!token ? <Register /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={token ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/local" element={<LocalGame />} />
        <Route path="/ai" element={<AIGame />} />
        <Route path="/profile" element={token ? <Profile /> : <Navigate to="/login" />} />
        <Route path="/lobby" element={token ? <Lobby /> : <Navigate to="/login" />} />
        <Route path="/game/:id" element={token ? <Game /> : <Navigate to="/login" />} />
        <Route path="/history" element={token ? <History /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
      </Routes>
    </div>
  )
}

export default App
