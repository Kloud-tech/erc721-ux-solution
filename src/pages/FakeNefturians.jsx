import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ethers } from 'ethers'
import { SEPOLIA_CHAIN_ID, getReadProvider } from '../utils/providers.js'

const FAKE_NEFTURIANS_ADDRESS = '0x9bAADf70BD9369F54901CF3Ee1b3c63b60F4F0ED'

const fakeNefturiansAbi = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function tokenPrice() view returns (uint256)',
  'function buyAToken() payable',
]

function formatEth(value) {
  if (!value) return '—'
  return `${ethers.utils.formatEther(value)} ETH`
}

function FakeNefturians() {
  const navigate = useNavigate()
  const providerRef = useRef(null)
  const contractRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('Fake Nefturians')
  const [symbol, setSymbol] = useState('')
  const [totalSupply, setTotalSupply] = useState(null)
  const [price, setPrice] = useState(null)
  const [address, setAddress] = useState('')
  const [txStatus, setTxStatus] = useState('idle')
  const [txHash, setTxHash] = useState('')

  useEffect(() => {
    const connectAndLoad = async (chainIdOverride) => {
      if (!window.ethereum) {
        setError('MetaMask is required to buy a Fake Nefturian.')
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
        const readProvider = getReadProvider()
        const contract = new ethers.Contract(FAKE_NEFTURIANS_ADDRESS, fakeNefturiansAbi, signer)
        const readContract = new ethers.Contract(
          FAKE_NEFTURIANS_ADDRESS,
          fakeNefturiansAbi,
          readProvider,
        )
        contractRef.current = contract
        const userAddress = accounts[0] || (await signer.getAddress())
        const [collectionName, collectionSymbol, supply, tokenPrice] = await Promise.all([
          readContract.name(),
          readContract.symbol(),
          readContract.totalSupply(),
          readContract.tokenPrice(),
        ])

        setName(collectionName)
        setSymbol(collectionSymbol)
        setTotalSupply(Number(supply))
        setPrice(tokenPrice)
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

  const refreshStats = async () => {
    if (!contractRef.current) return
    try {
      const readProvider = getReadProvider()
      const readContract = new ethers.Contract(
        FAKE_NEFTURIANS_ADDRESS,
        fakeNefturiansAbi,
        readProvider,
      )
      const [supply, tokenPrice] = await Promise.all([
        readContract.totalSupply(),
        readContract.tokenPrice(),
      ])
      setTotalSupply(Number(supply))
      setPrice(tokenPrice)
    } catch (err) {
      setError(err?.message || 'Unable to refresh data.')
    }
  }

  const handleBuy = async () => {
    if (!contractRef.current || !price) {
      setError('Contract not ready. Please reconnect.')
      return
    }
    setTxStatus('pending')
    setError('')
    setTxHash('')
    try {
      // Preflight call to surface revert reasons before sending a paid tx.
      const readProvider = getReadProvider()
      const readContract = new ethers.Contract(FAKE_NEFTURIANS_ADDRESS, fakeNefturiansAbi, readProvider)
      try {
        await readContract.callStatic.buyAToken({ value: price, from: address })
      } catch (staticErr) {
        const msg = staticErr?.reason || staticErr?.message || 'Purchase would revert.'
        setError(msg)
        return
      }

      const gasLimit =
        (await contractRef.current.estimateGas
          .buyAToken({ value: price })
          .catch(() => null)) || ethers.BigNumber.from(300000)

      const tx = await contractRef.current.buyAToken({ value: price, gasLimit })
      setTxHash(tx.hash)
      await tx.wait()
      await refreshStats()
    } catch (err) {
      const message = err?.reason || err?.message || 'Purchase failed.'
      const friendly = message.toLowerCase().includes('insufficient funds')
        ? 'Fonds insuffisants pour le gas ou le prix du token. Ajoute un peu plus de Sepolia ETH.'
        : message
      setError(friendly)
    } finally {
      setTxStatus('idle')
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Fake Nefturians</p>
          <h1 className="panel-title">Purchase a Nefturian on Sepolia</h1>
        </div>
        <div className="button-row">
          <button className="ghost-button" onClick={refreshStats} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          {address && (
            <Link className="primary-button" to={`/fakeNefturians/${address}`}>
              View my tokens
            </Link>
          )}
        </div>
      </div>

      <p className="lead">
        Connect MetaMask on Sepolia to see the current minimum price and buy a Fake Nefturian token.
        We will redirect you if you change networks.
      </p>

      {error && <div className="alert">{error}</div>}

      <div className="stats-grid">
        <div className="stat">
          <p className="eyebrow">Collection</p>
          <p className="stat-value">
            {name} {symbol ? `(${symbol})` : ''}
          </p>
        </div>
        <div className="stat">
          <p className="eyebrow">Total Minted</p>
          <p className="stat-value">{totalSupply ?? '—'}</p>
        </div>
        <div className="stat">
          <p className="eyebrow">Minimum Price</p>
          <p className="stat-value">{formatEth(price)}</p>
        </div>
        <div className="stat">
          <p className="eyebrow">Your Address</p>
          <p className="stat-value address">{address || '—'}</p>
        </div>
      </div>

      <div className="panel callout">
        <div>
          <p className="eyebrow">Buy</p>
          <h2 className="panel-title">Mint a Fake Nefturian</h2>
          <p className="lead">
            The contract exposes a payable <code>buyAToken()</code> function. We send the on-chain
            token price along with the transaction.
          </p>
        </div>
        <div className="button-row">
          <button className="primary-button" onClick={handleBuy} disabled={txStatus === 'pending'}>
            {txStatus === 'pending' ? 'Purchasing…' : 'Buy a token'}
          </button>
          {txHash && (
            <a
              className="ghost-button"
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
            >
              View transaction
            </a>
          )}
        </div>
      </div>

      <div className="panel">
        <p className="eyebrow">Explorer</p>
        <h2 className="panel-title">Look up any wallet</h2>
        <p className="lead">
          Want to see which tokens a wallet owns? Replace the address in the URL:
          <code className="code-inline">/fakeNefturians/0xYourAddress</code>.
        </p>
        {address && (
          <Link className="ghost-button" to={`/fakeNefturians/${address}`}>
            Open my inventory
          </Link>
        )}
      </div>
    </section>
  )
}

export default FakeNefturians
