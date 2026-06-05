// North Star Pass — on-chain license verification, fully serverless.
// The "license" is a soulbound NFT (the Pass) in the user's wallet. We verify
// ownership by (1) having them SIGN a challenge (proves they control the address)
// then (2) reading the Pass contract's balanceOf for that address DIRECTLY off a
// public RPC. No license server, no database — the chain is the source of truth.
const { ethers } = require('ethers')

// Config — ships OFF (enabled=false) so the beta runs ungated until the Pass
// contract is deployed. Flip PASS_GATE_ENABLED=1 + set PASS_CONTRACT to turn on.
const cfg = {
  enabled: process.env.PASS_GATE_ENABLED === '1',
  contract: process.env.PASS_CONTRACT || '', // North Star Pass NFT address
  chainId: Number(process.env.PASS_CHAIN_ID || 137), // Polygon (SoundChain-native)
  rpc: process.env.PASS_RPC || 'https://polygon-rpc.com',
  standard: (process.env.PASS_STANDARD || 'erc721').toLowerCase(), // erc721 | erc1155
  tokenId: process.env.PASS_TOKEN_ID || '0', // for erc1155
  buyUrl: process.env.PASS_BUY_URL || 'https://soundchain.io/northstar',
}

const ERC721_ABI = ['function balanceOf(address owner) view returns (uint256)']
const ERC1155_ABI = ['function balanceOf(address account, uint256 id) view returns (uint256)']

// A human-readable challenge the user signs in their wallet. Bound to this device
// + a nonce + timestamp so a signature can't be trivially replayed elsewhere.
function makeChallenge() {
  const nonce = ethers.hexlify(ethers.randomBytes(16))
  return [
    'SoundChain · North Star — activate this device',
    '',
    'Sign this message to prove you hold a North Star Pass.',
    'This is free and does NOT send a transaction.',
    '',
    'nonce: ' + nonce,
    'issued: ' + new Date().toISOString(),
  ].join('\n')
}

// Recover the signer address from a signed challenge. null if invalid.
function recoverAddress(challenge, signature) {
  try {
    return ethers.verifyMessage(challenge, signature)
  } catch (_) {
    return null
  }
}

// Read the Pass balance for an address straight off the chain. No server.
async function holdsPass(address) {
  if (!ethers.isAddress(address)) return { ok: false, reason: 'bad-address' }
  if (!cfg.contract) return { ok: false, reason: 'no-contract' }
  try {
    const provider = new ethers.JsonRpcProvider(cfg.rpc, cfg.chainId)
    let bal
    if (cfg.standard === 'erc1155') {
      const c = new ethers.Contract(cfg.contract, ERC1155_ABI, provider)
      bal = await c.balanceOf(address, cfg.tokenId)
    } else {
      const c = new ethers.Contract(cfg.contract, ERC721_ABI, provider)
      bal = await c.balanceOf(address)
    }
    return { ok: bal > 0n, balance: bal.toString() }
  } catch (e) {
    return { ok: false, reason: 'rpc-error', detail: String((e && e.message) || e) }
  }
}

// Full check: signature proves ownership of `address`, then chain confirms the Pass.
async function verify(challenge, signature) {
  const address = recoverAddress(challenge, signature)
  if (!address) return { ok: false, reason: 'bad-signature' }
  const pass = await holdsPass(address)
  return { ok: pass.ok, address, ...pass }
}

module.exports = { cfg, makeChallenge, recoverAddress, holdsPass, verify }
