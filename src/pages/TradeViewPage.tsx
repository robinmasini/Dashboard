import { useEffect } from 'react'

export default function TradeViewPage() {
  useEffect(() => {
    document.title = 'TradeView - Interactive Brokers Scalping Robot'
  }, [])

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000000',
        margin: 0,
        padding: 0,
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 999999,
        overflow: 'hidden'
      }}
    />
  )
}
