import { useState, useEffect, useRef, useCallback } from 'react'

export interface TradeTick {
  sequence_number: number
  instrument: { 0: string } | string
  price: string | number
  quantity: string | number
  side: 'BUY' | 'SELL'
  source_timestamp: string
  received_timestamp: string
}

export interface Quote {
  sequence_number: number
  instrument: { 0: string } | string
  bid_price: string | number
  bid_size: string | number
  ask_price: string | number
  ask_size: string | number
  timestamp: string
}

export interface Candle {
  instrument: { 0: string } | string
  timeframe: 'S1' | 'S5' | 'S15' | 'M1' | 'M5'
  open: string | number
  high: string | number
  low: string | number
  close: string | number
  volume: string | number
  open_time: string
  close_time: string
  ticks_count: number
  is_closed: boolean
}

export interface MarketStatus {
  mode: 'REALTIME' | 'DELAYED' | 'FROZEN' | 'REPLAY' | 'SYNTHETIC' | 'UNKNOWN'
  active_symbol: { 0: string } | string
  connected: boolean
  events_received: number
  events_lost: number
  estimated_delay_ms: number
  last_timestamp: string
}

export interface PositionRecord {
  position_id: string
  instrument: { 0: string } | string
  side: 'BUY' | 'SELL'
  quantity: string | number
  entry_price: string | number
  current_price: string | number
  unrealized_pnl: string | number
  realized_pnl: string | number
  opened_at: string
}

export interface ExecutionRecord {
  execution_id: string
  client_order_id: string
  instrument: { 0: string } | string
  side: 'BUY' | 'SELL'
  price: string | number
  quantity: string | number
  timestamp: string
}

export interface AccountState {
  account_id: string
  initial_capital: string | number
  current_capital: string | number
  realized_pnl: string | number
  unrealized_pnl: string | number
  open_positions_count: number
  total_trades_count: number
  winning_trades_count: number
  losing_trades_count: number
}

export type MarketEvent =
  | { type: 'Tick'; payload: TradeTick }
  | { type: 'Quote'; payload: Quote }
  | { type: 'Candle'; payload: Candle }
  | { type: 'Status'; payload: MarketStatus }
  | { type: 'AccountUpdated'; payload: AccountState }
  | { type: 'PositionUpdated'; payload: PositionRecord[] }
  | { type: 'ExecutionOccurred'; payload: ExecutionRecord }
  | { type: 'OrderRejected'; payload: { client_order_id: string; reason: string } }

export interface TradeViewState {
  connected: boolean
  dataMode: 'REALTIME' | 'DELAYED' | 'FROZEN' | 'REPLAY' | 'SYNTHETIC' | 'UNKNOWN'
  symbol: string
  lastPrice: number
  bidPrice: number
  askPrice: number
  spread: number
  ticksCount: number
  candles: Candle[]
  recentTicks: TradeTick[]
  marketStatus: MarketStatus | null
  account: AccountState
  positions: PositionRecord[]
  executions: ExecutionRecord[]
  lastError: string | null
}

export function useTradeViewWebSocket(url: string = 'ws://localhost:8080/ws') {
  const [state, setState] = useState<TradeViewState>({
    connected: false,
    dataMode: 'SYNTHETIC',
    symbol: 'NVDA',
    lastPrice: 211.75,
    bidPrice: 211.74,
    askPrice: 211.76,
    spread: 0.02,
    ticksCount: 0,
    candles: [],
    recentTicks: [],
    marketStatus: null,
    account: {
      account_id: 'demo-paper-100k',
      initial_capital: 100000,
      current_capital: 100000,
      realized_pnl: 0,
      unrealized_pnl: 0,
      open_positions_count: 0,
      total_trades_count: 0,
      winning_trades_count: 0,
      losing_trades_count: 0,
    },
    positions: [],
    executions: [],
    lastError: null,
  })

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setState((prev) => ({ ...prev, connected: true }))
      }

      ws.onmessage = (event) => {
        try {
          const parsed: MarketEvent = JSON.parse(event.data)

          if (parsed.type === 'Tick') {
            const tick = parsed.payload
            const p = typeof tick.price === 'string' ? parseFloat(tick.price) : tick.price
            setState((prev) => {
              const updatedTicks = [tick, ...prev.recentTicks.slice(0, 49)]
              return {
                ...prev,
                lastPrice: p,
                ticksCount: prev.ticksCount + 1,
                recentTicks: updatedTicks,
              }
            })
          } else if (parsed.type === 'Quote') {
            const q = parsed.payload
            const bp = typeof q.bid_price === 'string' ? parseFloat(q.bid_price) : q.bid_price
            const ap = typeof q.ask_price === 'string' ? parseFloat(q.ask_price) : q.ask_price
            const sp = parseFloat((ap - bp).toFixed(4))
            setState((prev) => ({
              ...prev,
              bidPrice: bp,
              askPrice: ap,
              spread: Math.max(0, sp),
            }))
          } else if (parsed.type === 'Candle') {
            const candle = parsed.payload
            setState((prev) => {
              const existingIdx = prev.candles.findIndex(
                (c) => c.open_time === candle.open_time && c.timeframe === candle.timeframe
              )
              let nextCandles = [...prev.candles]
              if (existingIdx >= 0) {
                nextCandles[existingIdx] = candle
              } else {
                nextCandles.push(candle)
                if (nextCandles.length > 200) {
                  nextCandles = nextCandles.slice(-200)
                }
              }
              return { ...prev, candles: nextCandles }
            })
          } else if (parsed.type === 'Status') {
            const st = parsed.payload
            setState((prev) => ({
              ...prev,
              dataMode: st.mode,
              marketStatus: st,
            }))
          } else if (parsed.type === 'AccountUpdated') {
            const acc = parsed.payload
            setState((prev) => ({ ...prev, account: acc }))
          } else if (parsed.type === 'PositionUpdated') {
            const pos = parsed.payload
            setState((prev) => ({ ...prev, positions: pos }))
          } else if (parsed.type === 'ExecutionOccurred') {
            const exec = parsed.payload
            setState((prev) => ({
              ...prev,
              executions: [exec, ...prev.executions.slice(0, 49)],
            }))
          } else if (parsed.type === 'OrderRejected') {
            const err = parsed.payload
            setState((prev) => ({ ...prev, lastError: err.reason }))
          }
        } catch {
          // Ignore parse errors
        }
      }

      ws.onclose = () => {
        setState((prev) => ({ ...prev, connected: false }))
        reconnectTimerRef.current = setTimeout(connect, 3000)
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch {
      reconnectTimerRef.current = setTimeout(connect, 5000)
    }
  }, [url])

  const placeOrder = useCallback((side: 'BUY' | 'SELL', quantity: number = 100) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const client_order_id = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      const payload = {
        action: 'PlaceOrder',
        payload: {
          client_order_id,
          instrument: 'NVDA',
          side,
          order_type: 'MARKET',
          price: null,
          quantity: quantity.toString(),
        },
      }
      wsRef.current.send(JSON.stringify(payload))
    }
  }, [])

  const closePosition = useCallback((symbol: string = 'NVDA') => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const payload = {
        action: 'ClosePosition',
        payload: { symbol },
      }
      wsRef.current.send(JSON.stringify(payload))
    }
  }, [])

  const resetAccount = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const payload = {
        action: 'ResetAccount',
        payload: {},
      }
      wsRef.current.send(JSON.stringify(payload))
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      if (wsRef.current) wsRef.current.close()
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    }
  }, [connect])

  return {
    ...state,
    placeOrder,
    closePosition,
    resetAccount,
  }
}
