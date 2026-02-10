/**
 * OGUN Claim Diagnostics
 * Tests the full streaming rewards claim pipeline
 */

const { ethers } = require('ethers');

const STREAMING_REWARDS_ADDRESS = '0xcf9416c49D525f7a50299c71f33606A158F28546';
const OGUN_ADDRESS = '0x45f1af89486aeec2da0b06340cd9cd3bd741a15c';

const ABI = [
  'function getAvailableBalance() view returns (uint256)',
  'function totalRewardsDistributed() view returns (uint256)',
  'function isAuthorizedDistributor(address distributor) view returns (bool)',
  'function NFT_REWARD_RATE() view returns (uint256)',
  'function BASE_REWARD_RATE() view returns (uint256)',
  'function MAX_DAILY_REWARDS() view returns (uint256)',
  'function owner() view returns (address)',
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
];

async function diagnose() {
  const provider = new ethers.providers.JsonRpcProvider('https://polygon-rpc.com');

  console.log('=== OGUN CLAIM DIAGNOSTICS ===');
  console.log('Contract:', STREAMING_REWARDS_ADDRESS);
  console.log('Network: Polygon Mainnet (137)');
  console.log('');

  // Check if contract exists
  const code = await provider.getCode(STREAMING_REWARDS_ADDRESS);
  const contractExists = code !== '0x';
  console.log('1. CONTRACT DEPLOYED:', contractExists ? 'YES (' + code.length + ' bytes)' : 'NO - NOT DEPLOYED!');

  if (!contractExists) {
    console.log('');
    console.log('CRITICAL: Contract not deployed at this address!');
    console.log('Claims will fall back to DB-only mode (no on-chain distribution).');
    return;
  }

  const contract = new ethers.Contract(STREAMING_REWARDS_ADDRESS, ABI, provider);

  // Check OGUN token balance of the contract
  const ogunContract = new ethers.Contract(OGUN_ADDRESS, ERC20_ABI, provider);
  const ogunBalance = await ogunContract.balanceOf(STREAMING_REWARDS_ADDRESS);
  console.log('2. OGUN IN CONTRACT:', ethers.utils.formatEther(ogunBalance), 'OGUN');

  // Try each contract call independently
  try {
    const availableBalance = await contract.getAvailableBalance();
    console.log('3. AVAILABLE BALANCE:', ethers.utils.formatEther(availableBalance), 'OGUN');
  } catch (e) {
    console.log('3. AVAILABLE BALANCE: CALL FAILED -', e.reason || e.code || e.message.slice(0, 80));
  }

  try {
    const totalDistributed = await contract.totalRewardsDistributed();
    console.log('4. TOTAL DISTRIBUTED:', ethers.utils.formatEther(totalDistributed), 'OGUN');
  } catch (e) {
    console.log('4. TOTAL DISTRIBUTED: CALL FAILED -', e.reason || e.code || e.message.slice(0, 80));
  }

  try {
    const nftRate = await contract.NFT_REWARD_RATE();
    console.log('5. NFT REWARD RATE:', ethers.utils.formatEther(nftRate), 'OGUN/stream');
  } catch (e) {
    console.log('5. NFT REWARD RATE: CALL FAILED -', e.reason || e.code || e.message.slice(0, 80));
  }

  try {
    const baseRate = await contract.BASE_REWARD_RATE();
    console.log('6. BASE REWARD RATE:', ethers.utils.formatEther(baseRate), 'OGUN/stream');
  } catch (e) {
    console.log('6. BASE REWARD RATE: CALL FAILED -', e.reason || e.code || e.message.slice(0, 80));
  }

  try {
    const maxDaily = await contract.MAX_DAILY_REWARDS();
    console.log('7. MAX DAILY REWARDS:', ethers.utils.formatEther(maxDaily), 'OGUN/day');
  } catch (e) {
    console.log('7. MAX DAILY REWARDS: CALL FAILED -', e.reason || e.code || e.message.slice(0, 80));
  }

  try {
    const owner = await contract.owner();
    console.log('8. CONTRACT OWNER:', owner);
  } catch (e) {
    console.log('8. CONTRACT OWNER: CALL FAILED -', e.reason || e.code || e.message.slice(0, 80));
  }

  // Check backend wallet
  console.log('');
  console.log('--- BACKEND WALLET CHECK ---');
  const pk = process.env.WALLET_PRIVATE_KEY;
  if (pk) {
    try {
      const wallet = new ethers.Wallet(pk, provider);
      console.log('9.  WALLET ADDRESS:', wallet.address);

      const polBalance = await provider.getBalance(wallet.address);
      console.log('10. POL BALANCE:', ethers.utils.formatEther(polBalance), 'POL (for gas)');

      const walletOgun = await ogunContract.balanceOf(wallet.address);
      console.log('11. OGUN BALANCE:', ethers.utils.formatEther(walletOgun), 'OGUN');

      try {
        const isAuth = await contract.isAuthorizedDistributor(wallet.address);
        console.log('12. AUTHORIZED DISTRIBUTOR:', isAuth ? 'YES' : 'NO - CLAIMS WILL REVERT!');
        if (!isAuth) {
          console.log('    FIX: Call addDistributor(' + wallet.address + ') on the contract via Gnosis Safe');
        }
      } catch (e) {
        console.log('12. AUTHORIZED CHECK: CALL FAILED -', e.reason || e.code || e.message.slice(0, 80));
      }
    } catch (e) {
      console.log('WALLET ERROR:', e.message);
    }
  } else {
    console.log('9. WALLET_PRIVATE_KEY: NOT SET');
    console.log('   Claims will use DB-only fallback (tracked but not distributed on-chain)');
  }

  // Treasury check
  console.log('');
  console.log('--- TREASURY CHECK ---');
  const treasury = '0x519bed3fe32272fa8f1aecaf86dbfbd674ee703b';
  const treasuryOgun = await ogunContract.balanceOf(treasury);
  const treasuryPol = await provider.getBalance(treasury);
  console.log('13. TREASURY:', treasury);
  console.log('    OGUN:', ethers.utils.formatEther(treasuryOgun));
  console.log('    POL:', ethers.utils.formatEther(treasuryPol));

  console.log('');
  console.log('=== DIAGNOSTICS COMPLETE ===');
}

diagnose().catch(e => console.error('DIAGNOSTIC FAILED:', e.message));
