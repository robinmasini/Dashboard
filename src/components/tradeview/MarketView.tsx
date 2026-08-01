import { useEffect, useRef, useState } from 'react'
import type { useTradeViewWebSocket } from '../../hooks/useTradeViewWebSocket'
import { tv } from './theme'

const MIN_VISIBLE_CANDLES = 12
const MAX_VISIBLE_CANDLES = 160
const CHART_TOP = 20
const CHART_HEIGHT = 350

type TradeViewState = ReturnType<typeof useTradeViewWebSocket>

interface MarketViewProps {
  tradeState: TradeViewState
}

export default function MarketView({ tradeState }: MarketViewProps) {
  const [rightTab, setRightTab] = useState<'STRATEGY' | 'POSITION'>('POSITION')
  const [orderQty, setOrderQty] = useState<number>(100)
  const [replaySpeed] = useState<number>(100)

  // The engine broadcasts candles for every timeframe. Drawing them all at once
  // stacks 1s bars on top of 5m ones; the analysed timeframe is the authority.
  const analysisTimeframe = tradeState.indicators?.timeframe ?? 'S15'
  const timeframeCandles = tradeState.candles.filter((c) => c.timeframe === analysisTimeframe)

  // Zoom is how many bars are on screen; the spacing follows from the width so
  // the series always fills the canvas.
  const [visibleCandles, setVisibleCandles] = useState(40)
  const chartRef = useRef<HTMLDivElement>(null)
  const [chartWidth, setChartWidth] = useState(900)

  useEffect(() => {
    const element = chartRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      setChartWidth(entry.contentRect.width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const zoom = (delta: number) =>
    setVisibleCandles((current) =>
      Math.min(MAX_VISIBLE_CANDLES, Math.max(MIN_VISIBLE_CANDLES, current + delta))
    )

  const activeCandles = timeframeCandles.slice(-visibleCandles)
  const maxPrice = Math.max(...activeCandles.map((c) => parseFloat(String(c.high))), tradeState.lastPrice + 1)
  const minPrice = Math.min(...activeCandles.map((c) => parseFloat(String(c.low))), tradeState.lastPrice - 1)
  const priceRange = Math.max(0.5, maxPrice - minPrice)

  const leftGutter = 50
  const rightGutter = 90
  const plotWidth = Math.max(120, chartWidth - leftGutter - rightGutter)
  const spacing = plotWidth / Math.max(1, activeCandles.length)
  const bodyWidth = Math.max(2, Math.min(14, spacing * 0.6))

  const xOf = (index: number) => leftGutter + index * spacing + spacing / 2
  const yOf = (price: number) => ((maxPrice - price) / priceRange) * CHART_HEIGHT + CHART_TOP

  // Blocks and legs are timestamped; the chart is indexed. This maps one to the
  // other so an overlay can never drift from the bars beneath it.
  const indexByOpenTime = new Map<string, number>()
  activeCandles.forEach((candle, index) => indexByOpenTime.set(candle.open_time, index))

  const indexForTime = (iso: string): number | null => {
    const direct = indexByOpenTime.get(iso)
    if (direct !== undefined) return direct
    const target = Date.parse(iso)
    if (Number.isNaN(target)) return null
    for (let i = 0; i < activeCandles.length; i += 1) {
      const open = Date.parse(activeCandles[i].open_time)
      const close = Date.parse(activeCandles[i].close_time)
      if (target >= open && target <= close) return i
    }
    return null
  }

  const indicators = tradeState.indicators

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: 'calc(100vh - 60px)',
        backgroundColor: '#000000',
        color: '#ffffff',
        overflow: 'hidden',
      }}
    >
      {/* LEFT PANEL: Controls & Settings */}
      <aside
        style={{
          width: '220px',
          minWidth: '220px',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: '#040607',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          fontSize: '0.8rem',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            style={{
              flex: 1,
              padding: '6px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255,255,255,0.08)',
              border: 'none',
              color: '#888',
              fontSize: '0.7rem',
            }}
          >
            SYMBOL
          </button>
          <button
            style={{
              flex: 1,
              padding: '6px',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              border: 'none',
              color: '#000000',
              fontWeight: 700,
              fontSize: '0.7rem',
            }}
          >
            INDICATOR
          </button>
        </div>

        {/* Order Size Setting */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
          <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px' }}>
            TAILLE D'ORDRE (ACTIONS)
          </label>
          <input
            type="number"
            value={orderQty}
            onChange={(e) => setOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
            style={{
              width: '100%',
              backgroundColor: '#0a0d0e',
              border: '1px solid rgba(0, 229, 153, 0.4)',
              borderRadius: '6px',
              padding: '6px 10px',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontFamily: 'monospace',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Candle Section */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontWeight: 600 }}>Candle</span>
            <input type="checkbox" defaultChecked style={{ accentColor: tv.accent }} />
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
            <div>bougies: {timeframeCandles.length} ({analysisTimeframe})</div>
            <div>ticks: {tradeState.ticksCount}</div>
          </div>
        </div>

        {/* Spread Section */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontWeight: 600 }}>Spread</span>
            <span style={{ color: tv.accent, fontFamily: 'monospace' }}>
              ${tradeState.spread.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Step grid, as computed by the engine */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontWeight: 600 }}>Step</span>
            <span style={{ color: tv.textFaint, fontFamily: tv.mono, fontSize: '0.7rem' }}>
              {analysisTimeframe}
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: tv.textMuted, fontFamily: tv.mono }}>
            <Row label="finestStep" value={indicators?.steps.finest_step ?? '—'} />
            <Row label="step" value={indicators?.steps.step ?? '—'} />
            <Row label="densité" value={String(indicators?.steps.density ?? '—')} />
            <Row label="jambes" value={String(indicators?.steps.legs.length ?? 0)} />
          </div>
        </div>

        {/* Block runs */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontWeight: 600 }}>Block</span>
            <span style={{ color: tv.textFaint, fontFamily: tv.mono, fontSize: '0.7rem' }}>
              {indicators?.blocks.stats.total ?? 0}
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', fontFamily: tv.mono }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: tv.accent }}>
              <span>▲ {indicators?.blocks.stats.up_count ?? 0}</span>
              <span style={{ color: tv.textMuted }}>
                max {indicators?.blocks.stats.up_max_length ?? 0} · moy{' '}
                {indicators?.blocks.stats.up_mean_length ?? '0'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: tv.loss }}>
              <span>▼ {indicators?.blocks.stats.down_count ?? 0}</span>
              <span style={{ color: tv.textMuted }}>
                max {indicators?.blocks.stats.down_max_length ?? 0} · moy{' '}
                {indicators?.blocks.stats.down_mean_length ?? '0'}
              </span>
            </div>
          </div>
        </div>

        {/* Error notification if any */}
        {tradeState.lastError && (
          <div style={{ padding: '8px', borderRadius: '6px', backgroundColor: tv.lossSoft, color: tv.loss, fontSize: '0.7rem' }}>
            {tradeState.lastError}
          </div>
        )}
      </aside>

      {/* CENTER AREA: Main Candlestick Chart & Replay Toolbar */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#000000',
          position: 'relative',
        }}
      >
        {/* Ticker Header overlay */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '20px',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>{tradeState.symbol}</h2>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: '#a855f722',
              color: '#c084fc',
              fontSize: '0.65rem',
              fontWeight: 700,
              fontFamily: 'monospace',
            }}
          >
            ● {tradeState.dataMode}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
            Bid: ${tradeState.bidPrice.toFixed(2)} | Ask: ${tradeState.askPrice.toFixed(2)}
          </span>
        </div>

        {/* SVG Interactive Chart Canvas */}
        <div
          ref={chartRef}
          onWheel={(event) => {
            event.preventDefault()
            zoom(event.deltaY > 0 ? 4 : -4)
          }}
          style={{
            flex: 1,
            width: '100%',
            position: 'relative',
            paddingTop: '60px',
            boxSizing: 'border-box',
          }}
        >
          {!tradeState.feedRunning && (
            <div
              style={{
                position: 'absolute',
                top: 70,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 5,
              }}
            >
              <span
                style={{
                  padding: '5px 14px',
                  borderRadius: 14,
                  border: `1px solid ${tv.borderStrong}`,
                  backgroundColor: tv.card,
                  color: tv.textMuted,
                  fontSize: '0.72rem',
                  fontFamily: tv.mono,
                }}
              >
                Marché à l'arrêt — appuyez sur ▶ pour lancer le flux
              </span>
            </div>
          )}

          <svg style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            {/* Grid Lines */}
            {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => {
              const y = ratio * 400
              const priceVal = (maxPrice - ratio * priceRange).toFixed(2)
              return (
                <g key={i}>
                  <line
                    x1="0"
                    y1={y}
                    x2="100%"
                    y2={y}
                    stroke="rgba(255,255,255,0.05)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x="98%"
                    y={y - 4}
                    fill="rgba(255,255,255,0.3)"
                    fontSize="10"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {priceVal}
                  </text>
                </g>
              )
            })}

            {/* Blocks: runs of same-direction candles, drawn behind the bars */}
            {indicators?.blocks.blocks.map((block, i) => {
              const startIndex = indexForTime(block.start_time)
              if (startIndex === null) return null
              const endIndex = Math.min(
                activeCandles.length - 1,
                startIndex + block.length - 1
              )
              const high = parseFloat(block.high)
              const low = parseFloat(block.low)
              const colour = block.direction === 'UP' ? tv.accent : tv.loss

              return (
                <rect
                  key={`block-${i}`}
                  x={xOf(startIndex) - spacing / 2}
                  y={yOf(high)}
                  width={(endIndex - startIndex + 1) * spacing}
                  height={Math.max(1, yOf(low) - yOf(high))}
                  fill={colour}
                  fillOpacity={block.is_live ? 0.06 : 0.11}
                  stroke={colour}
                  strokeOpacity={0.25}
                  strokeDasharray={block.is_live ? '3 3' : undefined}
                  rx="2"
                />
              )
            })}

            {/* Candlesticks Rendering */}
            {activeCandles.map((c, index) => {
              const o = parseFloat(String(c.open))
              const h = parseFloat(String(c.high))
              const l = parseFloat(String(c.low))
              const cl = parseFloat(String(c.close))

              const isBull = cl >= o
              const color = isBull ? tv.accent : tv.loss

              const x = xOf(index)
              const yHigh = yOf(h)
              const yLow = yOf(l)
              const yOpen = yOf(o)
              const yClose = yOf(cl)

              const bodyTop = Math.min(yOpen, yClose)
              const bodyHeight = Math.max(2, Math.abs(yClose - yOpen))

              return (
                <g key={index}>
                  <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1.5" />
                  <rect
                    x={x - bodyWidth / 2}
                    y={bodyTop}
                    width={bodyWidth}
                    height={bodyHeight}
                    fill={color}
                    rx="1"
                  />
                </g>
              )
            })}

            {/* Steps: the swing structure, each leg labelled with its size */}
            {indicators?.steps.legs.map((leg, i) => {
              const fromIndex = indexForTime(leg.from_time)
              const toIndex = indexForTime(leg.to_time)
              if (fromIndex === null || toIndex === null) return null

              const x1 = xOf(fromIndex)
              const y1 = yOf(parseFloat(leg.from_price))
              const x2 = xOf(toIndex)
              const y2 = yOf(parseFloat(leg.to_price))

              return (
                <g key={`leg-${i}`}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeOpacity={leg.is_confirmed ? 0.85 : 0.35}
                    strokeDasharray={leg.is_confirmed ? undefined : '4 4'}
                  />
                  <circle
                    cx={(x1 + x2) / 2}
                    cy={(y1 + y2) / 2}
                    r="9"
                    fill="#000000"
                    stroke={leg.direction === 'UP' ? tv.accent : tv.loss}
                    strokeWidth="1.5"
                  />
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 + 3.5}
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="700"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {leg.steps}
                  </text>
                </g>
              )
            })}

            {/* Current Price Line */}
            {(() => {
              const currentY = yOf(tradeState.lastPrice)
              return (
                <g>
                  <line
                    x1="0"
                    y1={currentY}
                    x2="100%"
                    y2={currentY}
                    stroke={tv.accent}
                    strokeWidth="1"
                  />
                  <rect
                    x="92%"
                    y={currentY - 10}
                    width="70"
                    height="20"
                    fill={tv.accent}
                    rx="4"
                  />
                  <text
                    x="95%"
                    y={currentY + 4}
                    fill="#000000"
                    fontSize="11"
                    fontWeight="800"
                    fontFamily="monospace"
                  >
                    {tradeState.lastPrice.toFixed(2)}
                  </text>
                </g>
              )
            })()}
          </svg>
        </div>

        {/* Floating Quick Action Buttons (ACTIVE REAL ORDERS) */}
        <div
          style={{
            position: 'absolute',
            bottom: '80px',
            right: '240px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#0a0d0e',
            border: '1px solid rgba(0, 229, 153, 0.4)',
            borderRadius: '24px',
            padding: '6px 16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
          }}
        >
          <button
            onClick={() => tradeState.placeOrder('BUY', orderQty)}
            style={{
              padding: '8px 20px',
              borderRadius: '16px',
              backgroundColor: tv.accent,
              border: 'none',
              color: '#000000',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Buy {orderQty}
          </button>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem' }}>
            ${tradeState.lastPrice.toFixed(2)}
          </span>
          <button
            onClick={() => tradeState.placeOrder('SELL', orderQty)}
            style={{
              padding: '8px 20px',
              borderRadius: '16px',
              backgroundColor: tv.loss,
              border: 'none',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Sell {orderQty}
          </button>
        </div>

        {/* REPLAY CONTROLS TOOLBAR */}
        <div
          style={{
            height: '60px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: '#050708',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: '#888', fontFamily: 'monospace' }}>5m</span>
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            ⏮
          </button>
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            ◀
          </button>
          <button
            onClick={() => tradeState.setMarketFeed(!tradeState.feedRunning)}
            title={
              tradeState.feedRunning
                ? 'Arrêter le flux de marché — plus aucun prix ni exécution'
                : 'Démarrer le flux de marché'
            }
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: tradeState.feedRunning ? tv.accent : 'transparent',
              border: `1px solid ${tradeState.feedRunning ? tv.accent : tv.borderStrong}`,
              color: tradeState.feedRunning ? '#000' : tv.text,
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            {tradeState.feedRunning ? '❚❚' : '▶'}
          </button>
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            ▶
          </button>
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            ⏭
          </button>
          <button
            onClick={() => zoom(6)}
            title="Dézoomer (molette vers le bas)"
            style={zoomButtonStyle}
          >
            −
          </button>
          <span
            style={{
              fontSize: '0.7rem',
              color: tv.textMuted,
              fontFamily: tv.mono,
              minWidth: 64,
              textAlign: 'center',
            }}
          >
            {activeCandles.length} bougies
          </span>
          <button
            onClick={() => zoom(-6)}
            title="Zoomer (molette vers le haut)"
            style={zoomButtonStyle}
          >
            +
          </button>
          <span style={{ fontSize: '0.75rem', color: tv.accent, fontFamily: 'monospace' }}>
            {replaySpeed} tk/s
          </span>
        </div>
      </main>

      {/* RIGHT PANEL: Strategy & Active Positions */}
      <aside
        style={{
          width: '320px',
          minWidth: '320px',
          borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: '#040607',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        {/* Tab Toggle */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#0d1113',
            borderRadius: '16px',
            padding: '2px',
            marginBottom: '16px',
          }}
        >
          <button
            onClick={() => setRightTab('STRATEGY')}
            style={{
              flex: 1,
              padding: '6px',
              borderRadius: '14px',
              border: 'none',
              backgroundColor: rightTab === 'STRATEGY' ? '#ffffff' : 'transparent',
              color: rightTab === 'STRATEGY' ? '#000000' : '#888',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            STRATEGY
          </button>
          <button
            onClick={() => setRightTab('POSITION')}
            style={{
              flex: 1,
              padding: '6px',
              borderRadius: '14px',
              border: 'none',
              backgroundColor: rightTab === 'POSITION' ? '#ffffff' : 'transparent',
              color: rightTab === 'POSITION' ? '#000000' : '#888',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            POSITION ({tradeState.positions.length})
          </button>
        </div>

        {rightTab === 'STRATEGY' ? (
          <div>
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                color: '#c084fc',
                fontSize: '0.75rem',
                fontWeight: 600,
                textAlign: 'center',
                marginBottom: '16px',
              }}
            >
              SHADOW — AUCUN ORDRE ENVOYÉ
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
              Moteur de scalping Rust en mode d'observation passif. Les signaux théoriques sont
              enregistrés en local sans soumission au broker.
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
            <div>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: 'rgba(255,255,255,0.4)',
                  fontWeight: 700,
                  marginBottom: '8px',
                }}
              >
                POSITIONS EN COURS ({tradeState.positions.length})
              </div>

              {tradeState.positions.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '0.75rem' }}>
                  Aucune position ouverte. Utilisez Buy/Sell pour ouvrir une position.
                </div>
              ) : (
                tradeState.positions.map((pos) => {
                  const pnlVal = parseFloat(String(pos.unrealized_pnl))
                  const isPosPositive = pnlVal >= 0
                  const symbolStr = typeof pos.instrument === 'object' ? pos.instrument[0] : pos.instrument

                  return (
                    <div
                      key={pos.position_id}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: '#0a0d0e',
                        border: `1px solid ${isPosPositive ? 'rgba(0, 229, 153, 0.4)' : 'rgba(255, 77, 77, 0.4)'}`,
                        marginBottom: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: pos.side === 'BUY' ? tv.accent : tv.loss, fontWeight: 800, fontSize: '0.8rem' }}>
                          {pos.side} {symbolStr}
                        </span>
                        <button
                          onClick={() => tradeState.closePosition(symbolStr)}
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            color: '#fff',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Fermer
                        </button>
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace' }}>
                        ${parseFloat(String(pos.entry_price)).toFixed(2)} × {pos.quantity}
                      </div>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          color: isPosPositive ? tv.accent : tv.loss,
                          fontWeight: 800,
                          marginTop: '6px',
                        }}
                      >
                        PnL: {isPosPositive ? '+' : ''}${pnlVal.toFixed(2)}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: 'rgba(255,255,255,0.4)',
                  fontWeight: 700,
                  marginBottom: '8px',
                }}
              >
                HISTORIQUE EXÉCUTIONS ({tradeState.executions.length})
              </div>
              {tradeState.executions.map((exec) => {
                const priceVal = parseFloat(String(exec.price))
                const timeStr = new Date(exec.timestamp).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
                return (
                  <div
                    key={exec.execution_id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                    }}
                  >
                    <span style={{ color: exec.side === 'BUY' ? tv.accent : tv.loss }}>
                      {exec.side} {exec.quantity}
                    </span>
                    <span>${priceVal.toFixed(2)}</span>
                    <span style={{ color: '#666' }}>{timeStr}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

const zoomButtonStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 8,
  border: `1px solid ${tv.border}`,
  backgroundColor: 'transparent',
  color: tv.textMuted,
  cursor: 'pointer',
  fontSize: '0.9rem',
  lineHeight: 1,
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span>{label}</span>
      <span style={{ color: tv.text }}>{value}</span>
    </div>
  )
}
