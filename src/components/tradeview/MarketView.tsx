import { useState } from 'react'
import type { useTradeViewWebSocket } from '../../hooks/useTradeViewWebSocket'

type TradeViewState = ReturnType<typeof useTradeViewWebSocket>

interface MarketViewProps {
  tradeState: TradeViewState
}

export default function MarketView({ tradeState }: MarketViewProps) {
  const [rightTab, setRightTab] = useState<'STRATEGY' | 'POSITION'>('POSITION')
  const [orderQty, setOrderQty] = useState<number>(100)
  const [replaySpeed] = useState<number>(100)
  const [isReplaying, setIsReplaying] = useState<boolean>(true)

  // Extract recent candles for chart rendering
  const activeCandles = tradeState.candles.slice(-30)
  const maxPrice = Math.max(...activeCandles.map((c) => parseFloat(String(c.high))), tradeState.lastPrice + 1)
  const minPrice = Math.min(...activeCandles.map((c) => parseFloat(String(c.low))), tradeState.lastPrice - 1)
  const priceRange = Math.max(0.5, maxPrice - minPrice)

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
            <input type="checkbox" defaultChecked style={{ accentColor: '#00e599' }} />
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
            <div>bougies: {tradeState.candles.length}</div>
            <div>ticks: {tradeState.ticksCount}</div>
          </div>
        </div>

        {/* Spread Section */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontWeight: 600 }}>Spread</span>
            <span style={{ color: '#00e599', fontFamily: 'monospace' }}>
              ${tradeState.spread.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Error notification if any */}
        {tradeState.lastError && (
          <div style={{ padding: '8px', borderRadius: '6px', backgroundColor: '#ff4d4d22', color: '#ff4d4d', fontSize: '0.7rem' }}>
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
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>NVDA</h2>
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
          style={{
            flex: 1,
            width: '100%',
            position: 'relative',
            paddingTop: '60px',
            boxSizing: 'border-box',
          }}
        >
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

            {/* Candlesticks Rendering */}
            {activeCandles.map((c, index) => {
              const o = parseFloat(String(c.open))
              const h = parseFloat(String(c.high))
              const l = parseFloat(String(c.low))
              const cl = parseFloat(String(c.close))

              const isBull = cl >= o
              const color = isBull ? '#00e599' : '#ff4d4d'

              const x = 50 + index * 24
              const yHigh = ((maxPrice - h) / priceRange) * 350 + 20
              const yLow = ((maxPrice - l) / priceRange) * 350 + 20
              const yOpen = ((maxPrice - o) / priceRange) * 350 + 20
              const yClose = ((maxPrice - cl) / priceRange) * 350 + 20

              const bodyTop = Math.min(yOpen, yClose)
              const bodyHeight = Math.max(3, Math.abs(yClose - yOpen))

              return (
                <g key={index}>
                  <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1.5" />
                  <rect
                    x={x - 6}
                    y={bodyTop}
                    width="12"
                    height={bodyHeight}
                    fill={color}
                    rx="1"
                  />
                </g>
              )
            })}

            {/* Current Price Line */}
            {(() => {
              const currentY = ((maxPrice - tradeState.lastPrice) / priceRange) * 350 + 20
              return (
                <g>
                  <line
                    x1="0"
                    y1={currentY}
                    x2="100%"
                    y2={currentY}
                    stroke="#00e599"
                    strokeWidth="1"
                  />
                  <rect
                    x="92%"
                    y={currentY - 10}
                    width="70"
                    height="20"
                    fill="#00e599"
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
              backgroundColor: '#00e599',
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
              backgroundColor: '#ff4d4d',
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
            onClick={() => setIsReplaying(!isReplaying)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#00e599',
              border: 'none',
              color: '#000',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            {isReplaying ? '❚❚' : '▶'}
          </button>
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            ▶
          </button>
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            ⏭
          </button>
          <span style={{ fontSize: '0.75rem', color: '#00e599', fontFamily: 'monospace' }}>
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
                        <span style={{ color: pos.side === 'BUY' ? '#00e599' : '#ff4d4d', fontWeight: 800, fontSize: '0.8rem' }}>
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
                          color: isPosPositive ? '#00e599' : '#ff4d4d',
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
                    <span style={{ color: exec.side === 'BUY' ? '#00e599' : '#ff4d4d' }}>
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
