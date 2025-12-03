import { NavLink, Route, Routes } from 'react-router-dom'
import ChainInfo from './pages/ChainInfo.jsx'
import NetworkError from './pages/NetworkError.jsx'
import Home from './pages/Home.jsx'
import NotFound from './pages/NotFound.jsx'
import FakeBayc from './pages/FakeBayc.jsx'
import FakeBaycToken from './pages/FakeBaycToken.jsx'
import './App.css'

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">Sepolia Dashboard</div>
        <nav className="nav">
          <NavLink to="/" className="nav-link">
            Home
          </NavLink>
          <NavLink to="/chain-info" className="nav-link">
            Chain Info
          </NavLink>
          <NavLink to="/fakeBayc" className="nav-link">
            Fake BAYC
          </NavLink>
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chain-info" element={<ChainInfo />} />
          <Route path="/fakeBayc" element={<FakeBayc />} />
          <Route path="/fakeBayc/:tokenId" element={<FakeBaycToken />} />
          <Route path="/wrong-network" element={<NetworkError />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
