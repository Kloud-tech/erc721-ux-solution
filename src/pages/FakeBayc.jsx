import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ethers } from 'ethers'

const SEPOLIA_CHAIN_ID = 11155111
const FAKE_BAYC_ADDRESS = '0x1dA89342716B14602664626CD3482b47D5C2005E'
const fakeBaycAbi = [
  'function name() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function claimAToken() public',
]

function FakeBayc() {
  const navigate = useNavigate()
  const providerRef = useRef(null)
  const contractRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [totalSupply, setTotalSupply] = useState(null)
  const [address, setAddress] = useState('')
  const [txStatus, setTxStatus] = useState('idle')
  const [txHash, setTxHash] = useState('')

  useEffect(() => {
    const connectAndLoad = async (chainIdOverride) => {
      if (!window.ethereum) {
        setError('MetaMask is required to use FakeBAYC.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const provider =
          providerRef.current || new ethers.providers.Web3Provider(window.ethereum, 'any')
        providerRef.current = provider
        const accounts = await provider.send('eth_requestAccounts', [])
        const network = chainIdOverride ? { chainId: chainIdOverride } : await provider.getNetwork()
        const resolvedId = Number(network.chainId)

        if (resolvedId !== SEPOLIA_CHAIN_ID) {
          navigate('/wrong-network', { replace: true })
          return
        }

        const signer = provider.getSigner()
        contractRef.current = new ethers.Contract(FAKE_BAYC_ADDRESS, fakeBaycAbi, signer)
        const userAddress = accounts[0] || (await signer.getAddress())
        const [contractName, supply] = await Promise.all([
          contractRef.current.name(),
          contractRef.current.totalSupply(),
        ])

        setName(contractName)
        setTotalSupply(Number(supply))
        setAddress(userAddress)
      } catch (err) {
        setError(err?.message || 'Unable to connect to MetaMask.')
      } finally {
        setLoading(false)
      }
    }

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
    window.ethereum?.on('chainChanged', handleChainChanged)
    window.ethereum?.on('accountsChanged', handleAccountsChanged)

    return () => {
      window.ethereum?.removeListener('chainChanged', handleChainChanged)
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged)
    }
  }, [navigate])

  const refreshSupply = async () => {
    if (!contractRef.current) return
    try {
      const supply = await contractRef.current.totalSupply()
      setTotalSupply(Number(supply))
    } catch (err) {
      setError(err?.message || 'Failed to refresh supply.')
    }
  }

  const handleClaim = async () => {
    if (!contractRef.current) {
      setError('Contract not initialized. Please reconnect MetaMask.')
      return
    }
    setTxStatus('pending')
    setTxHash('')
    setError('')

    try {
      const tx = await contractRef.current.claimAToken()
      setTxHash(tx.hash)
      await tx.wait()
      await refreshSupply()
    } catch (err) {
      setError(err?.reason || err?.message || 'Claim failed.')
    } finally {
      setTxStatus('idle')
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Fake BAYC</p>
          <h1 className="panel-title">Mint and explore the collection</h1>
        </div>
        <div className="button-row">
          <button className="ghost-button" onClick={refreshSupply} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <Link className="primary-button" to="/fakeBayc/0">
            View token 0
          </Link>
        </div>
      </div>

      <p className="lead">
        Connect MetaMask on Sepolia to read Fake BAYC details and claim a token for yourself.
        Make sure you stay on Sepolia, otherwise we will redirect you to the network warning page.
      </p>

      {error && <div className="alert">{error}</div>}

      <div className="stats-grid">
        <div className="stat">
          <p className="eyebrow">Collection Name</p>
          <p className="stat-value">{name || '—'}</p>
        </div>
        <div className="stat">
          <p className="eyebrow">Total Minted</p>
          <p className="stat-value">{totalSupply ?? '—'}</p>
        </div>
        <div className="stat">
          <p className="eyebrow">Your Address</p>
          <p className="stat-value address">{address || '—'}</p>
        </div>
      </div>

      <div className="panel callout">
        <div>
          <p className="eyebrow">Claim</p>
          <h2 className="panel-title">Mint a new Fake BAYC token</h2>
          <p className="lead">
            Submit a transaction to call <code>claimAToken()</code>. Once it is mined, the total
            supply will update and you can view the metadata with the token explorer below.
          </p>
        </div>
        <div className="button-row">
          <button className="primary-button" onClick={handleClaim} disabled={txStatus === 'pending'}>
            {txStatus === 'pending' ? 'Claiming…' : 'Claim a token'}
          </button>
          {txHash && (
            <a
              className="ghost-button"
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
            >
              View on Etherscan
            </a>
          )}
        </div>
      </div>

      <div className="panel">
        <p className="eyebrow">Explorer</p>
        <h2 className="panel-title">Check token metadata</h2>
        <p className="lead">
          Jump to a specific token to view its metadata. If a token has not been minted yet, we will
          show a friendly error.
        </p>
        <div className="token-links">
          {[0, 1, 2, 3, 4].map((id) => (
            <Link key={id} className="ghost-button" to={`/fakeBayc/${id}`}>
              Token #{id}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FakeBayc
