import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ethers } from 'ethers'
import { toHttp } from '../utils/ipfs.js'

const SEPOLIA_CHAIN_ID = 11155111
const FAKE_BAYC_ADDRESS = '0x1dA89342716B14602664626CD3482b47D5C2005E'
const fakeBaycAbi = [
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function name() view returns (string)',
]

function FakeBaycToken() {
  const { tokenId } = useParams()
  const navigate = useNavigate()
  const providerRef = useRef(null)
  const contractRef = useRef(null)
  const fetchRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [collectionName, setCollectionName] = useState('Fake BAYC')
  const [tokenUri, setTokenUri] = useState('')
  const [metadata, setMetadata] = useState(null)

  useEffect(() => {
    const fetchMetadata = async (chainIdOverride) => {
      if (!window.ethereum) {
        setError('MetaMask is required to read FakeBAYC metadata.')
        setLoading(false)
        return
      }

      setError('')
      setLoading(true)
      setMetadata(null)
      setTokenUri('')

      try {
        const provider =
          providerRef.current || new ethers.providers.Web3Provider(window.ethereum, 'any')
        providerRef.current = provider
        await provider.send('eth_requestAccounts', [])
        const network = chainIdOverride ? { chainId: chainIdOverride } : await provider.getNetwork()
        const resolvedId = Number(network.chainId)
        if (resolvedId !== SEPOLIA_CHAIN_ID) {
          navigate('/wrong-network', { replace: true })
          return
        }

        const signer = provider.getSigner()
        const contract = new ethers.Contract(FAKE_BAYC_ADDRESS, fakeBaycAbi, signer)
        contractRef.current = contract
        const [name, uri] = await Promise.all([contract.name(), contract.tokenURI(tokenId)])
        setCollectionName(name)
        setTokenUri(uri)

        const metadataResponse = await fetch(toHttp(uri))
        if (!metadataResponse.ok) {
          throw new Error('Metadata not found.')
        }
        const json = await metadataResponse.json()
        setMetadata(json)
      } catch (err) {
        const message =
          err?.code === 'CALL_EXCEPTION' ||
          err?.reason?.includes('existent') ||
          err?.message?.includes('nonexistent')
            ? 'This token does not exist yet on FakeBAYC.'
            : err?.message || 'Unable to load metadata.'
        setError(message)
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
      fetchMetadata(nextId)
    }

    fetchMetadata()
    window.ethereum?.on('chainChanged', handleChainChanged)
    fetchRef.current = fetchMetadata

    return () => {
      window.ethereum?.removeListener('chainChanged', handleChainChanged)
    }
  }, [navigate, tokenId])

  const imageUrl = metadata?.image ? toHttp(metadata.image) : ''
  const attributes = metadata?.attributes || []
  const handleRefresh = () => fetchRef.current?.()

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Fake BAYC Token</p>
          <h1 className="panel-title">
            {collectionName} — #{tokenId}
          </h1>
        </div>
        <button className="ghost-button" onClick={handleRefresh} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="alert">{error}</div>}
      {tokenUri && (
        <p className="muted">
          Metadata URI: <code className="code-inline">{tokenUri}</code>
        </p>
      )}

      {metadata && !error && (
        <div className="token-layout">
          {imageUrl && (
            <div className="token-media">
              <img src={imageUrl} alt={`Token ${tokenId}`} />
            </div>
          )}
          <div className="token-details">
            <p className="eyebrow">Name</p>
            <h2 className="panel-title">{metadata.name || `FakeBAYC #${tokenId}`}</h2>
            <p className="lead">{metadata.description}</p>

            <div className="attributes-grid">
              {attributes.length === 0 && <p className="muted">No attributes found.</p>}
              {attributes.map((attr) => (
                <div className="attribute" key={`${attr.trait_type}-${attr.value}`}>
                  <p className="eyebrow">{attr.trait_type}</p>
                  <p className="stat-value">{attr.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading && !error && <p className="muted">Loading token metadata…</p>}
    </section>
  )
}

export default FakeBaycToken
