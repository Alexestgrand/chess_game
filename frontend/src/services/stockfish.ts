import { Chess, Square } from 'chess.js'

// Stockfish difficulty levels (depth)
const DIFFICULTY_DEPTH: Record<number, number> = {
  1: 1,   // Very Easy
  2: 2,   // Easy
  3: 3,   // Easy-Medium
  4: 4,   // Medium
  5: 5,   // Medium-Hard
  6: 6,   // Hard
  7: 7,   // Very Hard
  8: 8,   // Expert
  9: 9,   // Master
  10: 10, // Grandmaster
}

export class StockfishEngine {
  private stockfish: Worker | null = null
  private onMoveCallback: ((move: { from: Square; to: Square; promotion?: string }) => void) | null = null
  private difficulty: number = 5
  private isReady: boolean = false

  constructor() {
    this.initStockfish()
  }

  private initStockfish() {
    try {
      // Use Stockfish WASM from CDN (lichess-org version)
      // Fallback to local if CDN fails
      const stockfishUrl = 'https://stockfishjs.org/stockfish.js/stockfish.js'
      
      this.stockfish = new Worker(stockfishUrl, { type: 'module' })
      
      this.stockfish.onmessage = (event) => {
        const message = event.data

        if (message === 'uciok') {
          this.isReady = true
        } else if (message.startsWith('bestmove')) {
          this.handleBestMove(message)
        }
      }

      this.stockfish.onerror = (error) => {
        console.warn('Stockfish worker failed, using fallback:', error)
        this.isReady = true // Use fallback engine
      }

      // Initialize UCI
      this.stockfish.postMessage('uci')
      this.stockfish.postMessage('isready')
      
      // Timeout for initialization
      setTimeout(() => {
        if (!this.isReady) {
          console.warn('Stockfish initialization timeout, using fallback')
          this.isReady = true
        }
      }, 3000)
    } catch (error) {
      console.error('Failed to initialize Stockfish:', error)
      // Fallback: use simple engine
      this.isReady = true
    }
  }

  private handleBestMove(message: string) {
    const parts = message.split(' ')
    if (parts.length >= 2 && parts[1] !== 'none') {
      const moveStr = parts[1]
      if (moveStr.length >= 4) {
        const from = moveStr.substring(0, 2) as Square
        const to = moveStr.substring(2, 4) as Square
        const promotion = moveStr.length > 4 ? moveStr.substring(4) : undefined

        if (this.onMoveCallback) {
          this.onMoveCallback({ from, to, promotion })
        }
      }
    }
  }

  setDifficulty(level: number) {
    if (level < 1 || level > 10) {
      level = 5
    }
    this.difficulty = level
  }

  async calculateMove(fen: string, delay: number = 1000): Promise<{ from: Square; to: Square; promotion?: string }> {
    return new Promise((resolve) => {
      if (!this.stockfish || !this.isReady) {
        // Fallback to improved random move
        setTimeout(() => resolve(this.getImprovedMove(fen)), delay)
        return
      }

      let resolved = false
      this.onMoveCallback = (move) => {
        if (!resolved) {
          resolved = true
          this.onMoveCallback = null
          setTimeout(() => resolve(move), delay)
        }
      }

      const depth = DIFFICULTY_DEPTH[this.difficulty]
      
      // Set position and calculate best move
      this.stockfish.postMessage(`position fen ${fen}`)
      this.stockfish.postMessage(`go depth ${depth}`)

      // Timeout fallback
      setTimeout(() => {
        if (!resolved) {
          resolved = true
          this.onMoveCallback = null
          resolve(this.getImprovedMove(fen))
        }
      }, 5000)
    })
  }

  private getImprovedMove(fen: string): { from: Square; to: Square; promotion?: string } {
    // Improved fallback: prefer captures and checks
    const chess = new Chess(fen)
    const moves = chess.moves({ verbose: true })
    
    if (moves.length === 0) {
      throw new Error('No moves available')
    }

    // Prioritize captures
    const captures = moves.filter(m => m.captured)
    if (captures.length > 0) {
      const randomCapture = captures[Math.floor(Math.random() * captures.length)]
      return {
        from: randomCapture.from as Square,
        to: randomCapture.to as Square,
        promotion: randomCapture.promotion,
      }
    }

    // Then checks
    const checks = moves.filter(m => {
      const testGame = new Chess(fen)
      testGame.move(m)
      return testGame.isCheck()
    })
    if (checks.length > 0) {
      const randomCheck = checks[Math.floor(Math.random() * checks.length)]
      return {
        from: randomCheck.from as Square,
        to: randomCheck.to as Square,
        promotion: randomCheck.promotion,
      }
    }

    // Otherwise random
    const randomMove = moves[Math.floor(Math.random() * moves.length)]
    return {
      from: randomMove.from as Square,
      to: randomMove.to as Square,
      promotion: randomMove.promotion,
    }
  }

  destroy() {
    if (this.stockfish) {
      this.stockfish.terminate()
      this.stockfish = null
    }
    this.isReady = false
  }
}
