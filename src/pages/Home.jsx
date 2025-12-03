import { Link } from 'react-router-dom'

function Home() {
  return (
    <section className="panel">
      <p className="eyebrow">Welcome</p>
      <h1 className="panel-title">Ethereum Playground</h1>
      <p className="lead">
        Use this mini dashboard to connect your MetaMask wallet to Sepolia and
        read live chain data. Head to the chain info page to get started.
      </p>
      <Link className="primary-button" to="/chain-info">
        Go to Chain Info
      </Link>
    </section>
  )
}

export default Home
