import { ethers } from 'ethers'

export const SEPOLIA_CHAIN_ID = 11155111
export const SEPOLIA_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com'

export function getReadProvider() {
  return new ethers.providers.JsonRpcProvider(SEPOLIA_RPC_URL)
}

