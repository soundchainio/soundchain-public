/**
 * Direct Polygon RPC — kill Magic RPC dependency for ALL reads
 *
 * Frank's rule: "Magic RPC is a middleman we don't need for balance reads.
 * ONLY use Magic for auth + signing. Everything else goes through direct
 * public Polygon RPC, same as QuickSwap does."
 *
 * This module provides balance reads that NEVER touch Magic's RPC relay.
 * Use this for ALL balance checks across the platform.
 */
import Web3 from 'web3'

const POLYGON_RPC = 'https://polygon-bor-rpc.publicnode.com'
const OGUN_ADDRESS = '0x45f1af89486aeec2da0b06340cd9cd3bd741a15c'

const OGUN_ABI = [
  { inputs: [{ name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
]

let directWeb3: Web3 | null = null

function getWeb3(): Web3 {
  if (!directWeb3) directWeb3 = new Web3(POLYGON_RPC)
  return directWeb3
}

/**
 * Get POL (native) balance for any address — direct RPC, no Magic
 */
export async function getPolBalance(address: string): Promise<string> {
  try {
    const web3 = getWeb3()
    const balanceWei = await web3.eth.getBalance(address)
    return web3.utils.fromWei(String(balanceWei), 'ether')
  } catch (err) {
    console.error('[DirectRPC] POL balance fetch failed:', err)
    return '0'
  }
}

/**
 * Get OGUN (ERC-20) balance for any address — direct RPC, no Magic
 */
export async function getOgunBalance(address: string): Promise<string> {
  try {
    const web3 = getWeb3()
    const contract = new web3.eth.Contract(OGUN_ABI as any, OGUN_ADDRESS)
    const balanceWei = await contract.methods.balanceOf(address).call()
    return web3.utils.fromWei(String(balanceWei), 'ether')
  } catch (err) {
    console.error('[DirectRPC] OGUN balance fetch failed:', err)
    return '0'
  }
}

/**
 * Get both POL + OGUN balances in one call — direct RPC, no Magic
 */
export async function getBalances(address: string): Promise<{ pol: string; ogun: string }> {
  const [pol, ogun] = await Promise.all([
    getPolBalance(address),
    getOgunBalance(address),
  ])
  return { pol, ogun }
}

/**
 * Get a direct Web3 instance for Polygon — no Magic dependency
 * Use this for any on-chain reads (NFT ownership, staking state, etc.)
 */
export function getDirectWeb3(): Web3 {
  return getWeb3()
}
