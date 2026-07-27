import tvLogo from '../../assets/tv.png'
import './TVLoader.css'

export default function TVLoader() {
  return (
    <div className="tv-loader-screen">
      <div className="tv-loader-container">
        <img src={tvLogo} alt="TradeView Loading..." className="tv-loader-logo" />
        <div className="tv-loader-bar">
          <div className="tv-loader-bar-inner" />
        </div>
      </div>
    </div>
  )
}
