import rmLogo from '../../assets/rm-logo.png'
import './RMLoader.css'

export default function RMLoader() {
  return (
    <div className="rm-loader-screen">
      <div className="rm-loader-container">
        <img src={rmLogo} alt="Chargement..." className="rm-loader-logo" />
        <div className="rm-loader-bar">
          <div className="rm-loader-bar-inner" />
        </div>
      </div>
    </div>
  )
}
