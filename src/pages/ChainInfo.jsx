import { useEffect, useRef, useState } from 'react'
import { ethers } from 'ethers'
import { useNavigate } from 'react-router-dom'
import { SEPOLIA_CHAIN_ID, getReadProvider } from '../utils/providers.js'

function formatChainId(id) {
  if (!id) return '—'
  const hex = `0x${id.toString(16)}`
  return `${id} (${hex})`
}

function ChainInfo() {
  const navigate = useNavigate()
  const connectRef = useRef(null)
  const [address, setAddress] = useState('')
  const [chainId, setChainId] = useState(null)
  const [blockNumber, setBlockNumber] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!window.ethereum) {
      setError('MetaMask is required to connect to Sepolia.')
      setLoading(false)
      return
    }

    const walletProvider = new ethers.providers.Web3Provider(window.ethereum, 'any')
    const readProvider = getReadProvider()

    const ensureSepolia = async (chainIdOverride) => {
      const network = chainIdOverride
        ? { chainId: chainIdOverride }
        : await walletProvider.getNetwork()
      const resolvedId = Number(network.chainId)

      if (resolvedId !== SEPOLIA_CHAIN_ID) {
        navigate('/wrong-network', { replace: true })
        return null
      }

      setChainId(resolvedId)
      return resolvedId
    }

    const handleBlock = (nextBlock) => setBlockNumber(nextBlock)

    const connectAndLoad = async (chainIdOverride) => {
      setLoading(true)
      setError('')

      try {
        const accounts = await walletProvider.send('eth_requestAccounts', [])
        const validChain = await ensureSepolia(chainIdOverride)
        if (!validChain) return

        const signer = walletProvider.getSigner()
        const userAddress = accounts[0] || (await signer.getAddress())

        setAddress(userAddress)
        setBlockNumber(await readProvider.getBlockNumber())

        readProvider.off('block', handleBlock)
        readProvider.on('block', handleBlock)
      } catch (err) {
        setError(err?.message || 'Failed to connect to MetaMask.')
      } finally {
        setLoading(false)
      }
    }

    connectRef.current = connectAndLoad

    const handleChainChanged = (chainIdHex) => {
      const nextId = Number(chainIdHex)
      if (nextId !== SEPOLIA_CHAIN_ID) {
        navigate('/wrong-network', { replace: true })
        return
      }

      connectAndLoad(nextId)
    }

    const handleAccountsChanged = (accounts) => {
      setAddress(accounts[0] || '')
    }

    connectAndLoad()
    window.ethereum.on('chainChanged', handleChainChanged)
    window.ethereum.on('accountsChanged', handleAccountsChanged)

    return () => {
      window.ethereum?.removeListener('chainChanged', handleChainChanged)
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged)
      readProvider.off('block', handleBlock)
    }
  }, [navigate])

  const handleRefresh = () => {
    connectRef.current?.()
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Network</p>
          <h1 className="panel-title">Sepolia Chain Info</h1>
        </div>
        <button className="ghost-button" onClick={handleRefresh} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <p className="lead">
        Connect with MetaMask to view live Sepolia details. We listen for network
        and block updates so this page stays current.
      </p>

      {error && <div className="alert">{error}</div>}

      <div className="stats-grid">
        <div className="stat">
          <p className="eyebrow">Chain ID</p>
          <p className="stat-value">{formatChainId(chainId)}</p>
        </div>
        <div className="stat">
          <p className="eyebrow">Last Block</p>
          <p className="stat-value">{blockNumber ?? '—'}</p>
        </div>
        <div className="stat">
          <p className="eyebrow">User Address</p>
          <p className="stat-value address">{address || '—'}</p>
        </div>
      </div>

      <p className="muted">
        If you change networks, we will redirect you to a warning page until you
        return to Sepolia.
      </p>
    </section>
  )
}

export default ChainInfo
