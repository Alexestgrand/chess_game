export interface WSMessage {
  type: string
  [key: string]: any
}

export class WebSocketClient {
  private ws: WebSocket | null = null
  private gameId: number
  private token: string
  private onMessage: (msg: WSMessage) => void
  private onError: (error: Error) => void
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectTimeout: number | null = null
  private shouldReconnect = true

  constructor(
    gameId: number,
    token: string,
    onMessage: (msg: WSMessage) => void,
    onError: (error: Error) => void
  ) {
    this.gameId = gameId
    this.token = token
    this.onMessage = onMessage
    this.onError = onError
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return
    }

    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsHost = import.meta.env.DEV ? 'localhost:8080' : window.location.host
    const wsUrl = `${wsProtocol}//${wsHost}/api/ws/games/${this.gameId}?token=${this.token}`

    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        this.reconnectAttempts = 0
        this.shouldReconnect = true
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.onMessage(data)
        } catch (err) {
          this.onError(new Error('Failed to parse WebSocket message'))
        }
      }

      this.ws.onerror = () => {
        // Error handling in onclose
      }

      this.ws.onclose = (event) => {
        if (event.code === 1000 || event.code === 1001 || !this.shouldReconnect) {
          return
        }

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++
          this.reconnectTimeout = window.setTimeout(() => {
            if (this.shouldReconnect) {
              this.connect()
            }
          }, 1000 * this.reconnectAttempts)
        } else {
          this.onError(new Error('Failed to connect after multiple attempts'))
        }
      }
    } catch (err) {
      this.onError(new Error('Failed to connect WebSocket'))
    }
  }

  sendMove(uci: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'move', uci }))
    }
  }

  disconnect() {
    this.shouldReconnect = false
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout)
    }
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
  }
}
