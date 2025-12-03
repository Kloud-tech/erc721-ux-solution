import { useEffect, useMemo, useRef, useState } from 'react'
import { ethers } from 'ethers'
import { useNavigate } from 'react-router-dom'
import { SEPOLIA_CHAIN_ID, getReadProvider } from '../utils/providers.js'
import { toHttp } from '../utils/ipfs.js'

const FAKE_MEEBITS_ADDRESS = '0xD1d148Be044AEB4948B48A03BeA2874871a26003'
const FAKE_MEEBITS_CLAIMER = '0x5341e225Ab4D29B838a813E380c28b0eFD6FBa55'
const SIGNATURES_URL = '/claimer-signatures.json'

const meebitsAbi = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
]

const claimerAbi = [
  'function claimAToken(uint256 tokenId, bytes signature)',
  'function whitelist(address) view returns (bool)',
]

function FakeMeebits() {
  const navigate = useNavigate()
  const providerRef = useRef(null)
  const claimerRef = useRef(null)
  const meebitsReadRef = useRef(null)
  const signaturesCacheRef = useRef(null)
  const maxTokenRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [address, setAddress] = useState('')
  const [name, setName] = useState('Fake Meebits')
  const [symbol, setSymbol] = useState('')
  const [totalSupply, setTotalSupply] = useState(null)
  const [tokenId, setTokenId] = useState('')
  const [signature, setSignature] = useState('')
  const [availability, setAvailability] = useState(null)
  const [tokenMeta, setTokenMeta] = useState(null)
  const [txStatus, setTxStatus] = useState('idle')
  const [txHash, setTxHash] = useState('')
  const [whitelisted, setWhitelisted] = useState(null)
  const [sigLoading, setSigLoading] = useState(false)
  const [availableIds, setAvailableIds] = useState([])

  const parsedTokenId = useMemo(() => {
    const n = Number(tokenId)
    return Number.isFinite(n) && n >= 0 ? n : null
  }, [tokenId])

  useEffect(() => {
    const connectAndLoad = async (chainIdOverride) => {
      if (!window.ethereum) {
        setError('MetaMask est requis pour interagir avec Fake Meebits.')
        setLoading(false)
        return
      }
      setError('')
      setLoading(true)
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
        const meebitsRead = new ethers.Contract(FAKE_MEEBITS_ADDRESS, meebitsAbi, readProvider)
        const claimer = new ethers.Contract(FAKE_MEEBITS_CLAIMER, claimerAbi, signer)

        claimerRef.current = claimer
        meebitsReadRef.current = meebitsRead

        const userAddress = accounts[0] || (await signer.getAddress())
        const [collectionName, collectionSymbol, supply, isWhite] = await Promise.all([
          meebitsRead.name(),
          meebitsRead.symbol(),
          meebitsRead.totalSupply(),
          claimer.whitelist(userAddress).catch(() => false),
        ])

        setAddress(userAddress)
        setName(collectionName)
        setSymbol(collectionSymbol)
        const supplyNum = Number(supply)
        setTotalSupply(supplyNum)
        setWhitelisted(Boolean(isWhite))
        // Preload signatures to build dropdown.
        await ensureSignatureCache()
        populateAvailableIds(supplyNum)
      } catch (err) {
        setError(err?.message || 'Connexion MetaMask impossible.')
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
      setWhitelisted(null)
    }

    connectAndLoad()
    window.ethereum?.on('chainChanged', handleChainChanged)
    window.ethereum?.on('accountsChanged', handleAccountsChanged)

    return () => {
      window.ethereum?.removeListener('chainChanged', handleChainChanged)
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged)
    }
  }, [navigate])

  const checkAvailability = async () => {
    if (!meebitsReadRef.current || parsedTokenId === null) {
      setError('Choisis un token ID valide.')
      return
    }
    setError('')
    setAvailability(null)
    setTokenMeta(null)
    try {
      const owner = await meebitsReadRef.current.ownerOf(parsedTokenId)
      setAvailability({ status: 'minted', owner })
      const uri = await meebitsReadRef.current.tokenURI(parsedTokenId).catch(() => '')
      if (uri) {
        const resp = await fetch(toHttp(uri))
        if (resp.ok) {
          const json = await resp.json()
          setTokenMeta({ uri, metadata: json })
        }
      }
    } catch (err) {
      const msg = err?.reason || err?.message || ''
      if (msg.toLowerCase().includes('nonexistent') || msg.toLowerCase().includes('exist')) {
        setAvailability({ status: 'available' })
      } else {
        setError('Lecture du token impossible. Vérifie le réseau et réessaie.')
      }
    }
  }

  const ensureSignatureCache = async () => {
    if (signaturesCacheRef.current) return signaturesCacheRef.current
    setSigLoading(true)
    try {
      const resp = await fetch(SIGNATURES_URL)
      if (!resp.ok) throw new Error('Impossible de charger les signatures.')
      const json = await resp.json()
      const map = new Map()
      let maxToken = 0
      json.forEach((entry) => {
        const id = Number(entry.tokenNumber)
        map.set(id, entry.signature)
        if (id > maxToken) maxToken = id
      })
      signaturesCacheRef.current = map
      maxTokenRef.current = maxToken
      return map
    } finally {
      setSigLoading(false)
    }
  }

  const populateAvailableIds = (supply) => {
    const maxToken = maxTokenRef.current
    if (supply === null || maxToken === null || supply > maxToken) {
      setAvailableIds([])
      return
    }
    const ids = []
    for (let i = supply; i <= maxToken; i++) {
      ids.push(i)
    }
    setAvailableIds(ids)
  }

  const loadSignatureFromBundle = async () => {
    if (parsedTokenId === null) {
      setError('Choisis un token ID valide.')
      return null
    }

    try {
      setSigLoading(true)
      setError('')
      const map = (await ensureSignatureCache()) || new Map()
      const sig = map.get(parsedTokenId)
      if (!sig) {
        setError("Aucune signature trouvée pour ce token dans l'outil embarqué.")
        return null
      }
      setSignature(sig)
      return sig
    } catch (err) {
      setError(err?.message || 'Chargement de la signature impossible.')
      return null
    } finally {
      setSigLoading(false)
    }
  }

  const handleClaim = async () => {
    if (!claimerRef.current) {
      setError('Contrat non initialisé. Reconnecte MetaMask.')
      return
    }
    if (parsedTokenId === null) {
      setError('Choisis un token ID valide.')
      return
    }
    let sig = signature?.trim()
    if (!sig) {
      sig = await loadSignatureFromBundle()
      if (!sig) return
    }

    setError('')
    setTxStatus('pending')
    setTxHash('')

    sig = sig.startsWith('0x') ? sig : `0x${sig}`

    try {
      const readProvider = getReadProvider()
      const claimerRead = new ethers.Contract(FAKE_MEEBITS_CLAIMER, claimerAbi, readProvider)
      await claimerRead.callStatic.claimAToken(parsedTokenId, sig, { from: address })

      const gasLimit =
        (await claimerRef.current.estimateGas
          .claimAToken(parsedTokenId, sig)
          .catch(() => null)) || ethers.BigNumber.from(400000)

      const tx = await claimerRef.current.claimAToken(parsedTokenId, sig, { gasLimit })
      setTxHash(tx.hash)
      await tx.wait()
      await checkAvailability()
      const meebitsRead = meebitsReadRef.current
      if (meebitsRead) {
        const supply = await meebitsRead.totalSupply().catch(() => null)
        if (supply) {
          const supplyNum = Number(supply)
          setTotalSupply(supplyNum)
          populateAvailableIds(supplyNum)
        }
      }
    } catch (err) {
      const message = err?.reason || err?.message || 'Claim impossible.'
      setError(message)
    } finally {
      setTxStatus('idle')
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Fake Meebits</p>
          <h1 className="panel-title">Claim with signature</h1>
        </div>
        <div className="button-row">
          <button className="ghost-button" onClick={checkAvailability} disabled={loading}>
            {loading ? 'Loading…' : 'Check token'}
          </button>
        </div>
      </div>

      <p className="lead">
        Connect MetaMask on Sepolia, enter an unminted token ID, paste the signature from
        <code className="code-inline"> claimerV1-tools </code>, then call the claimer contract
        to mint.
      </p>

      {error && <div className="alert">{error}</div>}

      <div className="stats-grid">
        <div className="stat">
          <p className="eyebrow">Collection</p>
          <p className="stat-value">
            {name} {symbol && `(${symbol})`}
          </p>
        </div>
        <div className="stat">
          <p className="eyebrow">Total Minted</p>
          <p className="stat-value">{totalSupply ?? '—'}</p>
        </div>
        <div className="stat">
          <p className="eyebrow">Your Address</p>
          <p className="stat-value address">{address || '—'}</p>
        </div>
        <div className="stat">
          <p className="eyebrow">Whitelist Status</p>
          <p className="stat-value">{whitelisted === null ? '—' : whitelisted ? 'Yes' : 'No'}</p>
        </div>
      </div>

      <div className="panel callout">
        <div className="form-grid">
          <label className="form-field">
            <span className="eyebrow">Token dispo</span>
            <select
              value={parsedTokenId ?? ''}
              onChange={(e) => setTokenId(e.target.value)}
              disabled={availableIds.length === 0}
            >
              <option value="">Sélectionner un token</option>
              {availableIds.map((id) => (
                <option key={id} value={id}>
                  Token #{id}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span className="eyebrow">Token ID</span>
            <input
              type="number"
              min="0"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              placeholder="e.g. 42"
            />
          </label>
          <label className="form-field full">
            <span className="eyebrow">Signature (hex)</span>
            <textarea
              rows="3"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="0x..."
            />
          </label>
        </div>
        <div className="button-row">
          <button className="ghost-button" onClick={checkAvailability} disabled={loading}>
            Vérifier la disponibilité
          </button>
          <button className="ghost-button" onClick={loadSignatureFromBundle} disabled={sigLoading || parsedTokenId === null}>
            {sigLoading ? 'Chargement…' : 'Auto-remplir signature'}
          </button>
          <button className="primary-button" onClick={handleClaim} disabled={txStatus === 'pending'}>
            {txStatus === 'pending' ? 'Claiming…' : 'Claim token'}
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

      {availability?.status === 'available' && (
        <div className="alert" style={{ borderColor: '#15803d', color: '#bbf7d0', background: '#0f172a' }}>
          Token disponible : tu peux le claim avec la signature fournie.
        </div>
      )}
      {availability?.status === 'minted' && (
        <div className="alert">
          Token déjà minté — propriétaire : <code className="code-inline">{availability.owner}</code>
        </div>
      )}

      {tokenMeta && (
        <div className="token-layout">
          {tokenMeta.metadata?.image && (
            <div className="token-media">
              <img src={toHttp(tokenMeta.metadata.image)} alt={tokenMeta.metadata?.name} />
            </div>
          )}
          <div className="token-details">
            <p className="eyebrow">Name</p>
            <h2 className="panel-title">{tokenMeta.metadata?.name}</h2>
            <p className="lead">{tokenMeta.metadata?.description}</p>
            <p className="muted">
              Metadata URI: <code className="code-inline">{tokenMeta.uri}</code>
            </p>
            <div className="attributes-grid">
              {(tokenMeta.metadata?.attributes || []).map((attr) => (
                <div className="attribute" key={`${attr.trait_type}-${attr.value}`}>
                  <p className="eyebrow">{attr.trait_type}</p>
                  <p className="stat-value">{attr.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default FakeMeebits
