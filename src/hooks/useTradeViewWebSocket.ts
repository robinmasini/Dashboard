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
  feed_running: boolean
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

/** One sample of account equity, accumulated client-side as the engine reports. */
export interface EquityPoint {
  t: number
  equity: number
  realized: number
  /** Cumulative counters, so any window can be derived by differencing. */
  trades: number
  wins: number
  losses: number
}

export interface Block {
  direction: 'UP' | 'DOWN'
  length: number
  high: string
  low: string
  open: string
  close: string
  start_time: string
  end_time: string
  is_live: boolean
}

export interface BlockStats {
  total: number
  up_count: number
  down_count: number
  up_max_length: number
  down_max_length: number
  up_mean_length: string
  down_mean_length: string
}

export interface Leg {
  direction: 'UP' | 'DOWN'
  from_price: string
  to_price: string
  from_time: string
  to_time: string
  steps: number
  is_confirmed: boolean
}

export interface IndicatorSnapshot {
  instrument: string
  timeframe: 'S1' | 'S5' | 'S15' | 'M1' | 'M5'
  candles: number
  blocks: { blocks: Block[]; stats: BlockStats }
  steps: { finest_step: string; step: string; density: number; legs: Leg[] }
}

export type MarketEvent =
  | { type: 'Tick'; payload: TradeTick }
  | { type: 'Quote'; payload: Quote }
  | { type: 'Candle'; payload: Candle }
  | { type: 'Status'; payload: MarketStatus }
  | { type: 'AccountUpdated'; payload: AccountState }
  | { type: 'PositionUpdated'; payload: PositionRecord[] }
  | { type: 'ExecutionOccurred'; payload: ExecutionRecord }
  | { type: 'OrderRejected'; payload: { client_order_id: string; decision: RiskDecision } }
  | { type: 'Indicators'; payload: IndicatorSnapshot }

export type RiskDecision =
  | { decision: 'ACCEPTED' }
  | { decision: 'REJECTED'; reason: string; detail: string }

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
  equityCurve: EquityPoint[]
  indicators: IndicatorSnapshot | null
  /** Mirrors the engine, not the click: the button shows what is really running. */
  feedRunning: boolean
  lastError: string | null
}

/** Bars retained per timeframe, independently of the other series. */
const CANDLES_PER_TIMEFRAME = 300

const num = (value: string | number) =>
  typeof value === 'string' ? parseFloat(value) : value

export function useTradeViewWebSocket(url: string = 'ws://localhost:8080/ws') {
  const [state, setState] = useState<TradeViewState>({
    connected: false,
    dataMode: 'SYNTHETIC',
    // Placeholder only: the engine announces the instrument it is running.
    symbol: 'MES',
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
      // Placeholder until the engine reports; it owns the real funding amount.
      initial_capital: 39000,
      current_capital: 39000,
      realized_pnl: 0,
      unrealized_pnl: 0,
      open_positions_count: 0,
      total_trades_count: 0,
      winning_trades_count: 0,
      losing_trades_count: 0,
    },
    positions: [],
    executions: [],
    equityCurve: [],
    indicators: null,
    feedRunning: false,
    lastError: null,
  })

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intentionalCloseRef = useRef(false)

  const clearReconnect = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }

  const connect = useCallback(() => {
    // Never stack sockets: React re-mounts (StrictMode) and stale reconnect
    // timers would otherwise churn connections, leaving `wsRef` pointing at a
    // socket that is still CONNECTING when a command is sent.
    const existing = wsRef.current
    if (
      existing &&
      (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)
    ) {
      return
    }

    try {
      intentionalCloseRef.current = false
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        clearReconnect()
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
                // Trim per timeframe. A shared cap lets the 1-second stream,
                // which arrives far more often, evict the slower series the
                // chart is actually drawing.
                const sameTimeframe = nextCandles.filter((c) => c.timeframe === candle.timeframe)
                if (sameTimeframe.length > CANDLES_PER_TIMEFRAME) {
                  const cutoff = sameTimeframe[sameTimeframe.length - CANDLES_PER_TIMEFRAME]
                  nextCandles = nextCandles.filter(
                    (c) => c.timeframe !== candle.timeframe || c.open_time >= cutoff.open_time
                  )
                }
              }
              return { ...prev, candles: nextCandles }
            })
          } else if (parsed.type === 'Status') {
            const st = parsed.payload
            const announced =
              typeof st.active_symbol === 'string' ? st.active_symbol : st.active_symbol?.[0]
            setState((prev) => ({
              ...prev,
              dataMode: st.mode,
              marketStatus: st,
              feedRunning: st.feed_running ?? prev.feedRunning,
              // The engine is the authority on which instrument is running.
              symbol: announced || prev.symbol,
            }))
          } else if (parsed.type === 'AccountUpdated') {
            const acc = parsed.payload
            setState((prev) => {
              const realized = num(acc.realized_pnl)
              const equity = num(acc.current_capital) + num(acc.unrealized_pnl)
              const last = prev.equityCurve[prev.equityCurve.length - 1]

              // Only sample when the account actually moved, so the curve does
              // not grow by one point per incoming tick.
              const moved =
                !last || last.equity !== equity || last.realized !== realized
              if (!moved) return { ...prev, account: acc }

              const point: EquityPoint = {
                t: Date.now(),
                equity,
                realized,
                trades: acc.total_trades_count,
                wins: acc.winning_trades_count,
                losses: acc.losing_trades_count,
              }
              const curve = [...prev.equityCurve, point]
              return {
                ...prev,
                account: acc,
                equityCurve: curve.length > 5000 ? curve.slice(-5000) : curve,
              }
            })
          } else if (parsed.type === 'PositionUpdated') {
            const pos = parsed.payload
            setState((prev) => ({ ...prev, positions: pos }))
          } else if (parsed.type === 'ExecutionOccurred') {
            const exec = parsed.payload
            setState((prev) => ({
              ...prev,
              executions: [exec, ...prev.executions.slice(0, 49)],
            }))
          } else if (parsed.type === 'Indicators') {
            const snapshot = parsed.payload
            setState((prev) => ({ ...prev, indicators: snapshot }))
          } else if (parsed.type === 'OrderRejected') {
            const { decision } = parsed.payload
            const message =
              decision.decision === 'REJECTED'
                ? `${decision.reason}: ${decision.detail}`
                : 'Order rejected'
            setState((prev) => ({ ...prev, lastError: message }))
          }
        } catch {
          // Ignore parse errors
        }
      }

      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null
        setState((prev) => ({ ...prev, connected: false }))
        if (intentionalCloseRef.current) return
        clearReconnect()
        reconnectTimerRef.current = setTimeout(connect, 3000)
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch {
      clearReconnect()
      reconnectTimerRef.current = setTimeout(connect, 5000)
    }
  }, [url])

  /** Sends a command, surfacing the failure rather than dropping it silently. */
  const send = useCallback((payload: object, description: string) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setState((prev) => ({
        ...prev,
        lastError: `${description} non envoyé : moteur non connecté`,
      }))
      return false
    }
    ws.send(JSON.stringify(payload))
    return true
  }, [])

  // The instrument is read back from state so an order can never be sent on a
  // symbol the engine is not running.
  const symbolRef = useRef(state.symbol)
  symbolRef.current = state.symbol

  const placeOrder = useCallback(
    (side: 'BUY' | 'SELL', quantity: number = 100) => {
      send(
        {
          action: 'PlaceOrder',
          payload: {
            client_order_id: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            instrument: symbolRef.current,
            side,
            order_type: 'MARKET',
            price: null,
            quantity: quantity.toString(),
          },
        },
        `Ordre ${side}`
      )
    },
    [send]
  )

  const closePosition = useCallback(
    (symbol?: string) => {
      send(
        { action: 'ClosePosition', payload: { symbol: symbol ?? symbolRef.current } },
        'Fermeture de position'
      )
    },
    [send]
  )

  const setMarketFeed = useCallback(
    (running: boolean) => {
      send(
        { action: 'SetMarketFeed', payload: { running } },
        running ? 'Démarrage du marché' : 'Arrêt du marché'
      )
    },
    [send]
  )

  const resetAccount = useCallback(() => {
    send({ action: 'ResetAccount', payload: {} }, 'Réinitialisation du compte')
  }, [send])

  useEffect(() => {
    connect()
    return () => {
      clearReconnect()
      intentionalCloseRef.current = true
      wsRef.current?.close()
    }
  }, [connect])

  return {
    ...state,
    placeOrder,
    closePosition,
    resetAccount,
    setMarketFeed,
  }
}
