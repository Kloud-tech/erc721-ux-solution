import { Link } from 'react-router-dom'

function NetworkError() {
  return (
    <section className="panel error-panel">
      <p className="eyebrow">Wrong Network</p>
      <h1 className="panel-title">Please switch to Sepolia</h1>
      <p className="lead">
        This dashboard only works on the Sepolia test network. Open MetaMask and
        change to Sepolia, then return to the chain info page.
      </p>
      <div className="button-row">
        <Link className="primary-button" to="/chain-info">
          Retry Connection
        </Link>
        <Link className="ghost-button" to="/">
          Back Home
        </Link>
      </div>
    </section>
  )
}

export default NetworkError
