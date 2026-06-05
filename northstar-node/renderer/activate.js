/* global passActivation */
const challengeEl = document.getElementById('challenge')
const sigEl = document.getElementById('sig')
const msgEl = document.getElementById('msg')
const betaRow = document.getElementById('betaRow')

function setMsg(text, ok) {
  msgEl.textContent = text
  msgEl.className = 'msg ' + (ok ? 'ok' : 'err')
}

async function newChallenge() {
  challengeEl.textContent = await passActivation.challenge()
  setMsg('', true)
}

document.getElementById('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(challengeEl.textContent)
    setMsg('Message copied — sign it in your wallet.', true)
  } catch (_) {
    setMsg('Copy failed — select the text manually.', false)
  }
})

document.getElementById('regen').addEventListener('click', newChallenge)

document.getElementById('activate').addEventListener('click', async () => {
  const signature = sigEl.value.trim()
  if (!signature) return setMsg('Paste the signature from your wallet first.', false)
  setMsg('Checking the chain…', true)
  const r = await passActivation.verify(signature)
  if (r.ok) {
    setMsg('✓ Pass verified — welcome aboard.', true)
    setTimeout(() => passActivation.enterApp(), 700)
  } else {
    const why = {
      'bad-signature': "That signature didn't match — re-sign the exact message and paste again.",
      'no-challenge': 'Session expired — tap "New message" and try again.',
      'bad-address': 'Could not read a wallet address from that signature.',
      'no-contract': 'Pass contract not configured yet (beta).',
      'rpc-error': 'Network hiccup reaching the chain — try again in a moment.',
    }[r.reason] || 'No North Star Pass found in that wallet.'
    setMsg('✗ ' + why, false)
  }
})

document.getElementById('buy').addEventListener('click', (e) => {
  e.preventDefault()
  passActivation.openBuy()
})

document.getElementById('beta').addEventListener('click', () => passActivation.continueBeta())

;(async () => {
  const state = await passActivation.state()
  // Beta escape only when the gate is on but no real Pass contract is wired yet.
  if (!state.hasContract) betaRow.style.display = 'flex'
  await newChallenge()
})()
