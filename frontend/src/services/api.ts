const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export interface User {
  id: number
  username: string
  email: string
  avatarUrl?: string
  eloRating?: number
  gamesPlayed?: number
  wins?: number
  losses?: number
  draws?: number
  createdAt?: string
}

export interface Game {
  id: number
  whitePlayerId?: number
  blackPlayerId?: number
  status: string
  result: string
  currentFEN: string
  createdAt: string
  whitePlayer?: User
  blackPlayer?: User
}

export interface Move {
  id: number
  gameId: number
  playerId: number
  moveNotation: string
  boardState: string
  plyNumber: number
  createdAt: string
}

class ApiClient {
  private getHeaders(token?: string): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  async register(username: string, email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ username, email, password }),
      credentials: 'include', // Include cookies
    })
    
    const data = await res.json()
    
    if (!res.ok) {
      throw new Error(data.error || `Registration failed: ${res.status}`)
    }
    
    // Ensure response has the expected structure
    if (!data.accessToken && !data.token) {
      console.error('Unexpected response structure:', data)
      throw new Error('Invalid response format from server')
    }
    
    return data
  }

  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password }),
      credentials: 'include', // Include cookies
    })
    
    const data = await res.json()
    
    if (!res.ok) {
      throw new Error(data.error || `Login failed: ${res.status}`)
    }
    
    // Ensure response has the expected structure
    if (!data.accessToken && !data.token) {
      console.error('Unexpected response structure:', data)
      throw new Error('Invalid response format from server')
    }
    
    return data
  }

  async refreshToken() {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include', // Include cookies
    })
    if (!res.ok) {
      throw new Error('Failed to refresh token')
    }
    return res.json()
  }

  async logout(token: string) {
    const res = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: this.getHeaders(token),
      credentials: 'include',
    })
    if (!res.ok) {
      throw new Error('Failed to logout')
    }
    return res.json()
  }

  async getProfile(token: string) {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: this.getHeaders(token),
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to get profile')
    return res.json()
  }

  async updateAvatar(token: string, avatarUrl: string) {
    const res = await fetch(`${API_BASE}/auth/avatar`, {
      method: 'PUT',
      headers: this.getHeaders(token),
      body: JSON.stringify({ avatarUrl }),
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to update avatar')
    }
    return res.json()
  }

  async createGame(token: string): Promise<Game> {
    if (!token || token.trim() === '') {
      throw new Error('Token is required. Please log in again.')
    }
    const headers = this.getHeaders(token)
    console.log('Creating game - Token present:', !!token)
    console.log('Creating game - Authorization header:', headers['Authorization'] ? 'Present' : 'Missing')
    
    const res = await fetch(`${API_BASE}/games`, {
      method: 'POST',
      headers: headers,
      credentials: 'include',
    })
    
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Session expirée. Veuillez vous reconnecter.')
      }
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }))
      console.error('Create game error:', err, res.status)
      throw new Error(err.error || `Failed to create game: ${res.status}`)
    }
    return res.json()
  }

  async getGame(token: string, gameId: number): Promise<Game> {
    const res = await fetch(`${API_BASE}/games/${gameId}`, {
      headers: this.getHeaders(token),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to get game')
    }
    return res.json()
  }

  async joinGame(token: string, gameId: number): Promise<Game> {
    const res = await fetch(`${API_BASE}/games/${gameId}/join`, {
      method: 'POST',
      headers: this.getHeaders(token),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to join game')
    }
    return res.json()
  }

  async getUserGames(token: string): Promise<Game[]> {
    const res = await fetch(`${API_BASE}/games`, {
      headers: this.getHeaders(token),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to get games')
    }
    return res.json()
  }

  async getGameHistory(token: string, gameId: number): Promise<Move[]> {
    const res = await fetch(`${API_BASE}/games/${gameId}/history`, {
      headers: this.getHeaders(token),
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to get game history')
    }
    return res.json()
  }

  async findMatch(token: string) {
    const res = await fetch(`${API_BASE}/matchmaking/find`, {
      method: 'POST',
      headers: this.getHeaders(token),
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to find match')
    }
    return res.json()
  }

  async cancelMatchmaking(token: string) {
    const res = await fetch(`${API_BASE}/matchmaking/cancel`, {
      method: 'POST',
      headers: this.getHeaders(token),
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to cancel matchmaking')
    }
    return res.json()
  }

  async getMatchmakingStatus(token: string) {
    const res = await fetch(`${API_BASE}/matchmaking/status`, {
      headers: this.getHeaders(token),
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to get matchmaking status')
    }
    return res.json()
  }
}

export const api = new ApiClient()
