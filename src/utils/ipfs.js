const IPFS_GATEWAY = 'https://ipfs.io/ipfs/'

export function toHttp(uri) {
  if (!uri) return ''
  if (uri.startsWith('ipfs://')) {
    return `${IPFS_GATEWAY}${uri.replace('ipfs://', '')}`
  }
  return uri
}

