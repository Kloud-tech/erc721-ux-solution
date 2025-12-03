import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ethers } from 'ethers'
import { toHttp } from '../utils/ipfs.js'
import { SEPOLIA_CHAIN_ID, getReadProvider } from '../utils/providers.js'

const FAKE_NEFTURIANS_ADDRESS = '0x9bAADf70BD9369F54901CF3Ee1b3c63b60F4F0ED'

const fakeNefturiansAbi = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function tokenURI(uint256 tokenId) view returns (string)',
]

function FakeNefturiansWallet() {
  const { userAddress } = useParams()
  const navigate = useNavigate()
  const providerRef = useRef(null)
  const contractRef = useRef(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [collectionName, setCollectionName] = useState('Fake Nefturians')
  const [symbol, setSymbol] = useState('')
  const [tokens, setTokens] = useState([])

  useEffect(() => {
    const loadTokens = async (chainIdOverride) => {
      if (!ethers.utils.isAddress(userAddress || '')) {
        setError('Adresse invalide.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')
      setTokens([])

      try {
        if (window.ethereum) {
          const walletProvider =
            providerRef.current || new ethers.providers.Web3Provider(window.ethereum, 'any')
          const network = chainIdOverride ? { chainId: chainIdOverride } : await walletProvider.getNetwork()
          if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
            navigate('/wrong-network', { replace: true })
            return
          }
        }

        const readProvider = getReadProvider()
        providerRef.current = readProvider

        const contract = new ethers.Contract(FAKE_NEFTURIANS_ADDRESS, fakeNefturiansAbi, readProvider)
        contractRef.current = contract
        const [name, sym, balance] = await Promise.all([
          contract.name(),
          contract.symbol(),
          contract.balanceOf(userAddress),
        ])
        setCollectionName(name)
        setSymbol(sym)

        const balanceNum = Number(balance)
        if (balanceNum === 0) {
          setTokens([])
          return
        }

        const tokenIds = await Promise.all(
          Array.from({ length: balanceNum }, (_, i) => contract.tokenOfOwnerByIndex(userAddress, i)),
        )

        const tokenData = await Promise.all(
          tokenIds.map(async (idBN) => {
            const id = Number(idBN)
            const uri = await contract.tokenURI(id)
            let metadata = null
            try {
              const metadataResp = await fetch(toHttp(uri))
              if (metadataResp.ok) {
                metadata = await metadataResp.json()
              }
            } catch (err) {
              // ignore fetch errors for individual tokens
            }
            return { id, uri, metadata }
          }),
        )

        setTokens(tokenData)
      } catch (err) {
        setError(err?.message || 'Impossible de charger les tokens.')
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
      loadTokens(nextId)
    }

    loadTokens()
    window.ethereum?.on('chainChanged', handleChainChanged)

    return () => {
      window.ethereum?.removeListener('chainChanged', handleChainChanged)
    }
  }, [navigate, userAddress])

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Fake Nefturians</p>
          <h1 className="panel-title">
            Tokens détenus par {userAddress ? `${userAddress.slice(0, 6)}…${userAddress.slice(-4)}` : ''}
          </h1>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      <p className="lead">
        Collection: {collectionName} {symbol && `(${symbol})`}
      </p>

      {loading && <p className="muted">Chargement des tokens…</p>}
      {!loading && tokens.length === 0 && !error && <p className="muted">Aucun token trouvé pour cette adresse.</p>}

      <div className="token-grid">
        {tokens.map(({ id, uri, metadata }) => {
          const imageUrl = metadata?.image ? toHttp(metadata.image) : ''
          return (
            <div className="token-card" key={id}>
              {imageUrl && (
                <div className="token-card-media">
                  <img src={imageUrl} alt={metadata?.name || `Token #${id}`} />
                </div>
              )}
              <div className="token-card-body">
                <p className="eyebrow">Token #{id}</p>
                <h3 className="panel-title">{metadata?.name || `Fake Nefturians #${id}`}</h3>
                <p className="lead">{metadata?.description}</p>
                <p className="muted">
                  Metadata URI: <code className="code-inline">{uri}</code>
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default FakeNefturiansWallet
