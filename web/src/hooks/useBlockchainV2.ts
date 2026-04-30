import { SDKBase, InstanceWithExtensions } from '@magic-sdk/provider';
import { OAuthExtension } from '@magic-ext/oauth';
import { config } from 'config';
import { useMagicContext } from 'hooks/useMagicContext';
import { useMe } from 'hooks/useMe';
import { useUnifiedWallet } from 'contexts/UnifiedWalletContext';
import { MeQuery } from 'lib/graphql-hooks';
import { useCallback, useMemo } from 'react';
import { Soundchain721 } from 'types/web3-v1-contracts/Soundchain721';
import { SoundchainAuction } from 'types/web3-v1-contracts/SoundchainAuction';
import { SoundchainMarketplace } from 'types/web3-v1-contracts/SoundchainMarketplace';
import { PayableTransactionObject } from 'types/web3-v1-contracts/types';
import { MerkleClaimERC20 } from 'types/web3-v2-contracts/MerkleClaimERC20';
import { Soundchain721Editions } from 'types/web3-v2-contracts/Soundchain721Editions';
import { SoundchainAuction as SoundchainAuctionV2 } from 'types/web3-v2-contracts/SoundchainAuction';
import { SoundchainMarketplaceEditions } from 'types/web3-v2-contracts/SoundchainMarketplaceEditions';
import { ethers } from 'ethers';
import Web3 from 'web3';
import { PromiEvent, TransactionReceipt } from 'web3-core/types';
import { AbiItem } from 'web3-utils';
// BN removed - Web3.js v4 validator rejects bn.js hex output for uint256 params
// Use String() instead which Web3 v4 accepts as valid uint256
import soundchainAuction from '../contract/Auction.sol/SoundchainAuction.json';
import soundchainMarketplace from '../contract/Marketplace.sol/SoundchainMarketplace.json';
import soundchainContract from '../contract/Soundchain721.sol/Soundchain721.json';
import soundchainContractEditions from '../contract/Soundchain721Editions.sol/Soundchain721Editions.json';
import SoundchainOGUN20 from '../contract/SoundchainOGUN20.sol/SoundchainOGUN20.json';
import merkleClaimERC20 from '../contract/v2/MerkleClaimERC20.sol/MerkleClaimERC20.json';
import soundchainAuctionV2 from '../contract/v2/SoundchainAuction.json';
import soundchainMarketplaceEditions from '../contract/v2/SoundchainMarketplaceEditions.json';

export const gas = 1200000;

// Direct RPC Web3 - bypasses Magic's SDK proxy entirely.
// Magic's proxy corrupts RPC responses (returns HTML on writes).
// This instance is used for ALL read operations: estimateGas, getGasPrice, etc.
// Magic's web3 is ONLY used for send() which requires signing.
const DIRECT_POLYGON_RPC = 'https://polygon-bor-rpc.publicnode.com';
let _directWeb3: Web3 | null = null;
const getDirectWeb3 = (): Web3 => {
  if (!_directWeb3) _directWeb3 = new Web3(DIRECT_POLYGON_RPC);
  return _directWeb3;
};

const claimOgunAddress = config.claimOgunAddress as string;
export const gasPriceMultiplier = 1.2; // 20% safety buffer (was 1.5)

// Extract contract address from web3.js method object.
// web3.js v4 may not expose _parent._address like v1 did.
// Tries multiple property paths to find the contract address.
function getContractAddressFromTxObject(txObject: any): string | undefined {
  const addr = txObject._parent?._address
    || txObject._parent?.options?.address
    || txObject._contract?.options?.address
    || txObject._parent?._contractAddress;
  if (addr) return addr;
  // web3.js v4: try walking the prototype chain
  try {
    const parent = Object.getPrototypeOf(txObject)?.constructor?._address;
    if (parent) return parent;
  } catch { /* ignore */ }
  return undefined;
}

const nftAddress = config.web3.contractsV2.contractAddress as string;
const marketplaceAddress = config.web3.contractsV1.marketplaceAddress as string;
const marketplaceEditionsAddress = config.web3.contractsV2.marketplaceAddress as string;
const auctionAddress = config.web3.contractsV1.auctionAddress as string;
const auctionV2Address = config.web3.contractsV2.auctionAddress as string;
const fallbackGasPrice = '300000000000';

const auctionContract = (web3: Web3, contractAddress?: string) =>
  new web3.eth.Contract(
    soundchainAuction.abi as AbiItem[],
    contractAddress || auctionAddress,
  ) as unknown as SoundchainAuction;

const auctionV2Contract = (web3: Web3, contractAddress?: string) =>
  new web3.eth.Contract(
    soundchainAuctionV2.abi as AbiItem[],
    contractAddress || auctionV2Address,
  ) as unknown as SoundchainAuctionV2;

const claimOgunContract = (web3: Web3) =>
  new web3.eth.Contract(merkleClaimERC20.abi as AbiItem[], claimOgunAddress) as unknown as MerkleClaimERC20;

const marketplaceContract = (web3: Web3, contractAddress?: string) =>
  new web3.eth.Contract(
    soundchainMarketplace.abi as AbiItem[],
    contractAddress || marketplaceAddress,
  ) as unknown as SoundchainMarketplace;

const marketplaceEditionsContract = (web3: Web3, contractAddress?: string | null) =>
  new web3.eth.Contract(
    soundchainMarketplaceEditions.abi as AbiItem[],
    contractAddress || marketplaceEditionsAddress,
  ) as unknown as SoundchainMarketplaceEditions;

const nftContract = (web3: Web3, contractAddress?: string | null) =>
  new web3.eth.Contract(soundchainContract.abi as AbiItem[], contractAddress || nftAddress) as unknown as Soundchain721;

const nftContractEditions = (web3: Web3) =>
  new web3.eth.Contract(soundchainContractEditions.abi as AbiItem[], nftAddress) as unknown as Soundchain721Editions;

export interface ContractAddresses {
  nft?: string | null;
  marketplace?: string | null;
  auction?: string | null;
}

interface DefaultParam {
  from: string;
  contractAddresses?: ContractAddresses;
}

// External-wallet provider context for Magic-SDK-free signing paths (NFT mints, future surfaces).
// Threaded down from useBlockchainV2() via useUnifiedWallet(). Optional — falls back to Magic
// only on the legacy 3-tier _execute() path. The mint path REQUIRES an external wallet here.
export interface ExternalWalletCtx {
  web3ModalProvider: any | null; // EIP-1193 provider from Web3Modal / WalletConnect / MM Mobile
  activeWalletType: string | null;
  activeAddress: string | null;
}

class BlockchainFunction<Type> {
  protected params: Type;
  protected me: MeQuery['me'] | undefined;
  protected web3?: Web3;
  protected transactionHash?: string;
  protected receipt?: TransactionReceipt;
  protected onTransactionHashFunction?: (transactionHash: string) => void;
  protected onReceiptFunction?: (receipt: TransactionReceipt) => void;
  protected onErrorFunction?: (cause: Error) => void;
  protected finallyFunction?: () => void;
  protected magic: InstanceWithExtensions<SDKBase, OAuthExtension[]> | null;
  protected walletCtx: ExternalWalletCtx;

  constructor(
    me: MeQuery['me'] | undefined,
    params: Type,
    magic: InstanceWithExtensions<SDKBase, OAuthExtension[]> | null,
    walletCtx: ExternalWalletCtx = { web3ModalProvider: null, activeWalletType: null, activeAddress: null },
  ) {
    this.me = me;
    this.params = params;
    this.magic = magic;
    this.walletCtx = walletCtx;
  }

  protected async validateAddress(address: string) {
    const dWeb3 = getDirectWeb3();
    if (!dWeb3.utils.isAddress(address)) {
      throw new Error(`Invalid address: ${address}`);
    }
  }

  // Estimate gas via DIRECT RPC (bypasses Magic's proxy which corrupts responses).
  // Uses encodeABI() to extract call data, then calls eth_estimateGas on direct RPC.
  protected async estimateGasDirect(
    txObject: any,
    params: { from: string; value?: string; nonce?: number; contractAddress?: string },
  ): Promise<number> {
    const dWeb3 = getDirectWeb3();
    try {
      const data = txObject.encodeABI();
      const to = params.contractAddress || getContractAddressFromTxObject(txObject);
      const estimate = await dWeb3.eth.estimateGas({
        from: params.from,
        to,
        data,
        ...(params.value ? { value: params.value } : {}),
      });
      return Number(estimate);
    } catch (directErr) {
      // Direct RPC also failed - use safe fallback gas
      console.warn('estimateGas failed on direct RPC, using fallback:', (directErr as any)?.message);
      return 300000;
    }
  }

  // Get gas price via DIRECT RPC (bypasses Magic's proxy)
  protected async getGasPriceDirect(): Promise<string | number> {
    const dWeb3 = getDirectWeb3();
    try {
      return await dWeb3.eth.getGasPrice();
    } catch {
      return fallbackGasPrice;
    }
  }

  // Sign and send transaction via Magic's recommended ethers.js flow.
  // Magic's documented path: ethers.providers.Web3Provider(magic.rpcProvider) → signer.sendTransaction()
  // This invokes Magic's Transaction Signature UI and handles signing + broadcasting.
  // Previous approach (web3.eth.signTransaction) returned [-32603] for legacy OAuth users.
  protected async _signAndBroadcast(
    txObject: any,
    params: { from: string; gas: number; gasPrice: number | string; value?: string; nonce?: number; contractAddress?: string },
  ): Promise<void> {
    if (!this.magic) {
      throw new Error('Magic instance not available for signing');
    }

    const rpcProvider = (this.magic as any).rpcProvider;
    if (!rpcProvider) {
      throw new Error('Magic RPC provider not available');
    }

    const dWeb3 = getDirectWeb3();
    const nonce = params.nonce ?? await dWeb3.eth.getTransactionCount(params.from, 'pending');

    // Resolve contract address — explicit contractAddress takes priority over txObject internals.
    // web3.js v4 may not expose _parent._address like v1 did, so explicit is critical.
    const to = params.contractAddress || getContractAddressFromTxObject(txObject);
    const data = txObject.encodeABI();
    if (!to) {
      throw new Error('Contract address could not be resolved from txObject. web3.js v4 _parent may be missing.');
    }

    // Build raw tx params with hex values for eth_sendTransaction.
    // Sending directly via Magic rpcProvider instead of ethers signer —
    // this lets Magic see the chainId and (hopefully) show Polygon in the popup.
    const txParams: any = {
      from: params.from,
      to,
      data,
      gas: '0x' + BigInt(params.gas).toString(16),
      gasPrice: '0x' + BigInt(String(params.gasPrice)).toString(16),
      nonce: '0x' + BigInt(nonce).toString(16),
      chainId: '0x89', // 137 = Polygon
    };
    if (params.value && params.value !== '0' && params.value !== '0x0' && params.value !== '0x00') {
      txParams.value = '0x' + BigInt(params.value).toString(16);
    }

    // eth_sendTransaction returns the tx hash directly
    const txHash: string = await rpcProvider.request({
      method: 'eth_sendTransaction',
      params: [txParams],
    });

    this.transactionHash = txHash;
    this.onTransactionHashFunction && this.onTransactionHashFunction(txHash);

    // Wait for on-chain confirmation using direct Polygon RPC
    const polygonProvider = new ethers.providers.JsonRpcProvider('https://polygon-bor-rpc.publicnode.com');
    const ethersReceipt = await polygonProvider.waitForTransaction(txHash, 1, 120000);

    // Convert ethers.js receipt to web3.js-compatible format.
    // ethers v5 receipt has events as an array, but web3.js code expects
    // receipt.events['EventName'].returnValues — decode logs using contract ABI.
    const web3Receipt: any = {
      ...ethersReceipt,
      transactionHash: ethersReceipt.transactionHash,
      status: ethersReceipt.status === 1,
      events: {},
    };

    // Decode event logs using known contract ABIs.
    // web3.js v4 doesn't expose _jsonInterface on method objects, so we try all
    // imported ABIs directly rather than relying on txObject._parent internals.
    const knownAbis = [
      soundchainContractEditions.abi,
      soundchainContract.abi,
      soundchainMarketplace.abi,
      soundchainMarketplaceEditions.abi,
      soundchainAuction.abi,
      soundchainAuctionV2.abi,
      SoundchainOGUN20.abi,
      merkleClaimERC20.abi,
    ];
    if (ethersReceipt.logs && ethersReceipt.logs.length > 0) {
      for (let abiIdx = 0; abiIdx < knownAbis.length; abiIdx++) {
        try {
          const iface = new ethers.utils.Interface(knownAbis[abiIdx] as any);
          for (const log of ethersReceipt.logs) {
            try {
              const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
              // Build web3.js-style event object with returnValues
              const returnValues: any = {};
              parsed.args.forEach((val: any, i: number) => {
                const argName = parsed.eventFragment.inputs[i]?.name;
                const value = val && val._isBigNumber ? val.toString() : val;
                returnValues[i] = value;
                if (argName) returnValues[argName] = value;
              });
              web3Receipt.events[parsed.name] = {
                returnValues,
                event: parsed.name,
                logIndex: log.logIndex,
                transactionHash: log.transactionHash,
              };
            } catch {
              // This ABI doesn't match this log — expected
            }
          }
        } catch (abiErr: any) {
          console.warn('[Receipt Decode] ABI', abiIdx, 'failed to construct Interface:', abiErr?.message);
        }
      }
    }
    this.receipt = web3Receipt as TransactionReceipt;
    this.onReceiptFunction && this.onReceiptFunction(web3Receipt as TransactionReceipt);
  }

  // Sign and broadcast a native ETH/POL transfer (not a contract call).
  // Uses ethers.js signer.sendTransaction() via Magic's RPC provider (same as _signAndBroadcast).
  // Previous approach (web3.eth.signTransaction) returned [-32603] for legacy OAuth users.
  protected async _signAndBroadcastNative(
    params: { from: string; to: string; value: string; gas: number | string; gasPrice: number | string; nonce?: number },
  ): Promise<TransactionReceipt> {
    if (!this.magic) {
      throw new Error('Magic instance not available for signing');
    }

    const rpcProvider = (this.magic as any).rpcProvider;
    if (!rpcProvider) {
      throw new Error('Magic RPC provider not available');
    }

    const dWeb3 = getDirectWeb3();
    const nonce = params.nonce ?? await dWeb3.eth.getTransactionCount(params.from, 'pending');

    // Send directly via Magic rpcProvider with Polygon chainId
    const txParams: any = {
      from: params.from,
      to: params.to,
      value: '0x' + BigInt(params.value).toString(16),
      gas: '0x' + BigInt(String(params.gas)).toString(16),
      gasPrice: '0x' + BigInt(String(params.gasPrice)).toString(16),
      nonce: '0x' + BigInt(nonce).toString(16),
      chainId: '0x89', // 137 = Polygon
    };

    const txHash: string = await rpcProvider.request({
      method: 'eth_sendTransaction',
      params: [txParams],
    });

    this.transactionHash = txHash;
    this.onTransactionHashFunction && this.onTransactionHashFunction(txHash);

    // Wait for on-chain confirmation using direct Polygon RPC
    const polygonProvider = new ethers.providers.JsonRpcProvider('https://polygon-bor-rpc.publicnode.com');
    const ethersReceipt = await polygonProvider.waitForTransaction(txHash, 1, 120000);

    const receipt = ethersReceipt as unknown as TransactionReceipt;
    this.receipt = receipt;
    this.onReceiptFunction && this.onReceiptFunction(receipt);

    return receipt;
  }

  // Sign and broadcast via HD wallet API (completely bypasses Magic SDK).
  // Sends unsigned tx to server, which derives the user's HD wallet key and signs.
  protected async _signViaHdWallet(
    txObject: any,
    params: { from: string; gas: number; gasPrice: number | string; value?: string; contractAddress?: string },
  ): Promise<void> {
    const to = params.contractAddress || getContractAddressFromTxObject(txObject);
    const data = txObject.encodeABI();

    const response = await fetch('/api/hd-wallet/sign-tx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin', // sends JWT cookie
      body: JSON.stringify({
        to,
        data,
        value: params.value || '0',
        gas: params.gas,
        gasPrice: String(params.gasPrice),
      }),
    });

    const result = await response.json();
    if (!result.success || !result.txHash) {
      throw new Error(result.error || 'HD wallet signing failed');
    }

    this.transactionHash = result.txHash;
    this.onTransactionHashFunction && this.onTransactionHashFunction(result.txHash);

    // Poll for receipt via direct RPC
    const dWeb3 = getDirectWeb3();
    for (let i = 0; i < 90; i++) { // 3 min max
      const receipt = await dWeb3.eth.getTransactionReceipt(result.txHash);
      if (receipt) {
        this.receipt = receipt;
        this.onReceiptFunction && this.onReceiptFunction(receipt);
        return;
      }
      await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error('Transaction sent but receipt not confirmed after 3 minutes');
  }

  // Send native POL via HD wallet API (bypasses Magic SDK).
  protected async _sendNativeViaHdWallet(
    params: { to: string; value: string; gas?: number | string; gasPrice?: number | string },
  ): Promise<TransactionReceipt> {
    const response = await fetch('/api/hd-wallet/send-native', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        to: params.to,
        value: params.value,
        gas: params.gas || 21000,
        gasPrice: params.gasPrice ? String(params.gasPrice) : undefined,
      }),
    });

    const result = await response.json();
    if (!result.success || !result.txHash) {
      throw new Error(result.error || 'HD wallet native send failed');
    }

    this.transactionHash = result.txHash;
    this.onTransactionHashFunction && this.onTransactionHashFunction(result.txHash);

    // Poll for receipt
    const dWeb3 = getDirectWeb3();
    for (let i = 0; i < 90; i++) {
      const receipt = await dWeb3.eth.getTransactionReceipt(result.txHash);
      if (receipt) {
        this.receipt = receipt;
        this.onReceiptFunction && this.onReceiptFunction(receipt);
        return receipt;
      }
      await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error('Native send broadcast but receipt not confirmed');
  }

  protected async _execute(
    lambda: (gasPrice: string | number) => PromiEvent<TransactionReceipt>,
    txData?: { txObject: any; from: string; gas: number; value?: string; nonce?: number; contractAddress?: string },
  ) {
    const { me } = this;
    // Resolve wallet address - HD wallet FIRST for new users, then OAuth fallbacks for legacy users
    const userAddress = me?.hdWalletAddress
      || me?.magicWalletAddress
      || me?.googleWalletAddress
      || me?.discordWalletAddress
      || me?.twitchWalletAddress
      || me?.emailWalletAddress;
    if (!userAddress) {
      throw new Error('User address not found');
    }
    await this.validateAddress(userAddress);
    // Only check Magic login if the provider is actually Magic SDK
    const isMagicProvider = this.web3?.currentProvider && (this.web3.currentProvider as unknown as SDKBase['rpcProvider']).isMagic;
    if (isMagicProvider) {
      const isLoggedIn = await this.magic?.user.isLoggedIn() || false;
      if (!isLoggedIn && me?.email) {
        try {
          await this.magic?.auth.loginWithMagicLink({ email: me.email, showUI: false });
        } catch (e) {
          if (this.onErrorFunction) {
            this.onErrorFunction(new Error('Failed to refresh login session'));
          }
          return;
        }
      } else if (!isLoggedIn) {
        if (this.onErrorFunction) {
          this.onErrorFunction(new Error('Magic session expired. Please log in again.'));
        }
        return;
      }
    }
    // Gas price via direct RPC (not Magic's proxy)
    const gasPriceString = await this.getGasPriceDirect();
    const gasPrice = Math.floor(Number(gasPriceString) * gasPriceMultiplier) ?? fallbackGasPrice;

    // Try sign-then-broadcast: sign with Magic, broadcast via direct RPC.
    // This bypasses Magic's proxy for broadcasting (which returns HTML on writes).
    if (txData && this.web3) {
      try {
        await this._signAndBroadcast(txData.txObject, {
          from: txData.from,
          gas: txData.gas,
          gasPrice,
          value: txData.value,
          nonce: txData.nonce,
          contractAddress: txData.contractAddress,
        });
        this.finallyFunction && this.finallyFunction();
        return;
      } catch (signErr: any) {
        // signTransaction might not be supported by all providers (e.g., some Magic versions)
        console.warn('Sign-broadcast failed, trying HD wallet fallback:', signErr?.message);
      }
    }

    // Tier 3: HD wallet server-side signing (completely bypasses Magic SDK)
    // Only works when the tx is FROM the user's HD wallet address
    if (txData && this.me?.hdWalletAddress &&
        txData.from.toLowerCase() === this.me.hdWalletAddress.toLowerCase()) {
      try {
        await this._signViaHdWallet(txData.txObject, {
          from: txData.from,
          gas: txData.gas,
          gasPrice,
          value: txData.value,
          contractAddress: txData.contractAddress,
        });
        this.finallyFunction && this.finallyFunction();
        return;
      } catch (hdErr: any) {
        console.warn('HD wallet signing failed:', hdErr?.message);
        // Fall through to Magic .send() as last resort
      }
    }

    // Fallback: original .send() through Magic's provider
    lambda(gasPrice)
      .on('transactionHash', transactionHash => {
        this.transactionHash = transactionHash;
        this.onTransactionHashFunction && this.onTransactionHashFunction(transactionHash);
      })
      .on('receipt', receipt => {
        this.receipt = receipt;
        this.onReceiptFunction && this.onReceiptFunction(receipt);
      })
      .catch(cause => {
        if (this.onErrorFunction) {
          const error = Object.keys(cause).includes('receipt')
            ? new Error(
                `Transaction reverted by the Blockchain.\r\n
                Please check the transaction on your wallet activity page for more details.\r\n
                ${cause}`,
              )
            : cause;
          this.onErrorFunction(error);
        }
      })
      .finally(this.finallyFunction);
  }

  // Magic-SDK-free signing path. Required for NFT mints (createEdition + safeMintToEditionQuantity)
  // per Apr 30 directive: NO Magic SDK on mints, EVER. L1 OAuth users must import their Magic
  // wallet to MetaMask/CBW first (migration step in the how-to deck).
  // Resolves provider in priority order:
  //   1. Web3Modal EIP-1193 provider (canonical — WalletConnect/MM Mobile/CBW Mobile/etc.)
  //   2. window.ethereum (injected — MM extension/CBW extension/Rainbow/Brave)
  // Throws a migration-guidance error if neither is available, OR if the connected external
  // wallet's address doesn't match the `from` (i.e. user hasn't imported their L1 key yet).
  protected async _executeMintViaExternalWallet(
    txData: { txObject: any; from: string; gas: number; value?: string; nonce?: number; contractAddress?: string },
  ): Promise<TransactionReceipt> {
    const eip1193 =
      this.walletCtx.web3ModalProvider ||
      (typeof window !== 'undefined' ? (window as any).ethereum : null);

    if (!eip1193) {
      throw new Error(
        'NFT minting requires an external wallet. Connect MetaMask, Coinbase Wallet, Rainbow, or Trust — see the Migration step in the How-To deck if you signed up with Google/email.',
      );
    }

    // Verify chain — Polygon mainnet only for SoundChain mints.
    try {
      const chainIdHex: string = await eip1193.request({ method: 'eth_chainId' });
      const chainId = typeof chainIdHex === 'string' ? parseInt(chainIdHex, 16) : Number(chainIdHex);
      if (chainId !== 137) {
        try {
          await eip1193.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x89' }] });
        } catch (_switchErr: any) {
          throw new Error('Switch your wallet network to Polygon (chainId 137) before minting.');
        }
      }
    } catch (chainErr: any) {
      // If the rpc method isn't available, proceed — the signer.sendTransaction will fail loudly
      // if the chain is wrong, which is a better error than blocking on a probe.
      if (chainErr?.message?.includes('Switch your wallet network')) throw chainErr;
    }

    // Verify accounts — the connected wallet MUST match `from`. If user has multiple OAuth
    // wallets (legacy) or hasn't imported their Magic key, the addresses will diverge.
    const accounts: string[] = await eip1193.request({ method: 'eth_accounts' });
    const fromLower = txData.from.toLowerCase();
    const accountsLower = accounts.map(a => a.toLowerCase());
    if (!accountsLower.includes(fromLower)) {
      throw new Error(
        `Connected wallet (${accounts[0] || 'none'}) doesn't match your account address (${txData.from}). Import your Magic OAuth key into MetaMask/Coinbase Wallet first — see the Migration step in the How-To deck.`,
      );
    }

    // Sign + broadcast via ethers v5 — the canonical 2026 Web3 path.
    const provider = new ethers.providers.Web3Provider(eip1193);
    const signer = provider.getSigner(txData.from);

    const txRequest: any = {
      from: txData.from,
      to: txData.contractAddress || getContractAddressFromTxObject(txData.txObject),
      data: txData.txObject.encodeABI(),
      gasLimit: txData.gas,
    };
    if (txData.value) txRequest.value = txData.value;
    if (txData.nonce !== undefined) txRequest.nonce = txData.nonce;

    const tx = await signer.sendTransaction(txRequest);
    this.transactionHash = tx.hash;
    this.onTransactionHashFunction && this.onTransactionHashFunction(tx.hash);

    const receipt = await tx.wait();
    // ethers v5 receipt → web3 receipt shape (good enough for downstream consumers reading .status, .transactionHash, .blockNumber)
    const web3Receipt = receipt as unknown as TransactionReceipt;
    this.receipt = web3Receipt;
    this.onReceiptFunction && this.onReceiptFunction(web3Receipt);
    this.finallyFunction && this.finallyFunction();
    return web3Receipt;
  }

  onTransactionHash(handler: (transactionHash: string) => void) {
    this.onTransactionHashFunction = handler;
    return this;
  }

  onReceipt(handler: (receipt: TransactionReceipt) => void) {
    this.onReceiptFunction = handler;
    return this;
  }

  onError(handler: (cause: Error) => void) {
    this.onErrorFunction = handler;
    return this;
  }

  finally(handler: () => void) {
    this.finallyFunction = handler;
    return this;
  }
}

interface PlaceBidParams extends DefaultParam {
  tokenId: number;
  value: string;
}

class PlaceBid extends BlockchainFunction<PlaceBidParams> {
  execute = async (web3: Web3) => {
    const { contractAddresses, from, value, tokenId } = this.params;
    this.web3 = web3;

    const auctionContractAddress = contractAddresses?.auction || auctionV2Address;

    let transactionObject: PayableTransactionObject<void>;

    if (auctionContractAddress === auctionV2Address) {
      transactionObject = auctionV2Contract(web3, auctionContractAddress).methods.placeBid(
        contractAddresses?.nft || nftAddress,
        tokenId,
        false, // isPaymentOGUN
        value, // bid amount
      );
    } else {
      transactionObject = auctionContract(web3, auctionContractAddress).methods.placeBid(
        contractAddresses?.nft || nftAddress,
        tokenId,
      );
    }

    const gas = await this.estimateGasDirect(transactionObject, { from, value });
    await this._execute(
      gasPrice => transactionObject.send({ from, gas, value, gasPrice }) as PromiEvent<TransactionReceipt>,
      { txObject: transactionObject, from, gas, value },
    );

    return this.receipt;
  };
}

interface ClaimOgunParams extends DefaultParam {
  to: string;
  amount: string;
  proof: string[];
}

class ClaimOgun extends BlockchainFunction<ClaimOgunParams> {
  execute = async (web3: Web3) => {
    const { from, to, amount, proof } = this.params;

    this.web3 = web3;

    const transactionObject = claimOgunContract(web3).methods.claim(to, amount, proof);

    const gas = await this.estimateGasDirect(transactionObject, { from });

    await this._execute(
      gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>,
      { txObject: transactionObject, from, gas },
    );
    return this.receipt;
  };
}

interface HasClaimedOgunParams {
  address: string;
}

class HasClaimedOgun extends BlockchainFunction<HasClaimedOgunParams> {
  execute = async (web3: Web3) => {
    const { address } = this.params;

    this.web3 = web3;

    return await claimOgunContract(web3).methods.hasClaimed(address).call();
  };
}

interface BuyItemParams extends DefaultParam {
  tokenId: number;
  owner: string;
  value: string;
  isPaymentOGUN: boolean;
}

class BuyItem extends BlockchainFunction<BuyItemParams> {
  execute = async (web3: Web3) => {
    const { contractAddresses, owner, value, tokenId, isPaymentOGUN, from } = this.params;
    this.web3 = web3;

    // Calculate 0.05% platform fee on purchase price
    const platformFeeRate = config.soundchainFee || 0.0005;
    const purchaseValue = parseFloat(web3.utils.fromWei(value || '0', 'ether'));
    const platformFee = purchaseValue * platformFeeRate;
    const feeWei = web3.utils.toWei(platformFee.toFixed(18), 'ether');
    const treasuryAddress = config.treasuryAddress;
    const gasPrice = await this.getGasPriceDirect();

    // Step 1: Collect platform fee before purchase
    if (platformFee > 0 && treasuryAddress) {
      try {
        if (isPaymentOGUN) {
          const ogunContract = new web3.eth.Contract(ogunAbi as AbiItem[], ogunAddress);
          const feeTx = ogunContract.methods.transfer(treasuryAddress, feeWei);
          const feeGas = await this.estimateGasDirect(feeTx, { from });
          try {
            await this._signAndBroadcast(feeTx, { from, gas: feeGas, gasPrice });
          } catch {
            await feeTx.send({ from, gas: feeGas, gasPrice });
          }
        } else {
          try {
            await this._signAndBroadcastNative({ from, to: treasuryAddress, value: feeWei, gas: 21000, gasPrice });
          } catch {
            await web3.eth.sendTransaction({ from, to: treasuryAddress, value: feeWei, gas: '21000', gasPrice });
          }
        }
      } catch (feeErr: any) {
        console.warn('Fee collection failed, proceeding with purchase:', feeErr?.message);
      }
    }

    // Step 2: Execute the purchase
    const marketplaceContractAddress = contractAddresses?.marketplace || marketplaceEditionsAddress;

    let transactionObject: PayableTransactionObject<void>;

    if (marketplaceContractAddress === marketplaceEditionsAddress) {
      transactionObject = marketplaceEditionsContract(web3).methods.buyItem(
        contractAddresses?.nft || nftAddress,
        tokenId,
        owner,
        isPaymentOGUN,
      );
    } else {
      transactionObject = marketplaceContract(web3, marketplaceContractAddress).methods.buyItem(
        contractAddresses?.nft || nftAddress,
        tokenId,
        owner,
      );
    }
    const gas = await this.estimateGasDirect(transactionObject, { from, value: (!isPaymentOGUN && value) || undefined });

    const txValue = (!isPaymentOGUN && value) || undefined;
    await this._execute(
      gasPrice => transactionObject.send({ from, gas, value: txValue, gasPrice }) as PromiEvent<TransactionReceipt>,
      { txObject: transactionObject, from, gas, value: txValue },
    );

    return this.receipt;
  };
}

class ApproveMarketplace extends BlockchainFunction<DefaultParam> {
  execute = async (web3: Web3) => {
    const { contractAddresses, from } = this.params;
    this.web3 = web3;

    const transactionObject = nftContract(web3, contractAddresses?.nft).methods.setApprovalForAll(
      marketplaceEditionsAddress,
      true,
    );
    const gas = await this.estimateGasDirect(transactionObject, { from });

    await this._execute(
      gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>,
      { txObject: transactionObject, from, gas },
    );

    return this.receipt;
  };
}

class ApproveAuction extends BlockchainFunction<DefaultParam> {
  execute = async (web3: Web3) => {
    const { contractAddresses, from } = this.params;
    this.web3 = web3;

    const transactionObject = nftContract(web3, contractAddresses?.nft).methods.setApprovalForAll(
      auctionV2Address,
      true,
    );
    const gas = await this.estimateGasDirect(transactionObject, { from });

    await this._execute(
      gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>,
      { txObject: transactionObject, from, gas },
    );

    return this.receipt;
  };
}

interface TokenParams extends DefaultParam {
  tokenId: number;
}

class BurnNft extends BlockchainFunction<TokenParams> {
  execute = async (web3: Web3) => {
    const { contractAddresses, from, tokenId } = this.params;
    this.web3 = web3;

    const transactionObject = nftContract(web3, contractAddresses?.nft).methods.burn(tokenId);
    const gas = await this.estimateGasDirect(transactionObject, { from });

    await this._execute(
      gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>,
      { txObject: transactionObject, from, gas },
    );

    return this.receipt;
  };
}

class CancelAuction extends BlockchainFunction<TokenParams> {
  execute = async (web3: Web3) => {
    const { contractAddresses, from, tokenId } = this.params;
    this.web3 = web3;

    const auctionContractAddress = contractAddresses?.auction || auctionV2Address;

    let transactionObject: PayableTransactionObject<void>;

    if (auctionContractAddress === auctionV2Address) {
      transactionObject = auctionV2Contract(web3, auctionContractAddress).methods.cancelAuction(
        contractAddresses?.nft || nftAddress,
        tokenId,
      );
    } else {
      transactionObject = auctionContract(web3, auctionContractAddress).methods.cancelAuction(
        contractAddresses?.nft || nftAddress,
        tokenId,
      );
    }

    const gas = await this.estimateGasDirect(transactionObject, { from });

    await this._execute(
      gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>,
      { txObject: transactionObject, from, gas },
    );

    return this.receipt;
  };
}

class CancelListing extends BlockchainFunction<TokenParams> {
  execute = async (web3: Web3) => {
    const { contractAddresses, from, tokenId } = this.params;
    this.web3 = web3;

    const marketplaceContractAddress = contractAddresses?.marketplace || marketplaceEditionsAddress;

    let transactionObject: PayableTransactionObject<void>;

    if (marketplaceContractAddress === marketplaceEditionsAddress) {
      transactionObject = marketplaceEditionsContract(web3).methods.cancelListing(
        contractAddresses?.nft || nftAddress,
        tokenId,
      );
    } else {
      transactionObject = marketplaceContract(web3, marketplaceContractAddress).methods.cancelListing(
        contractAddresses?.nft || nftAddress,
        tokenId,
      );
    }
    const gas = await this.estimateGasDirect(transactionObject, { from });

    await this._execute(
      gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>,
      { txObject: transactionObject, from, gas },
    );

    return this.receipt;
  };
}

interface CreateAuctionParams extends TokenParams {
  reservePrice: string;
  startTime: number;
  endTime: number;
}

class CreateAuction extends BlockchainFunction<CreateAuctionParams> {
  execute = async (web3: Web3) => {
    const { contractAddresses, from, tokenId, reservePrice, startTime, endTime } = this.params;
    const totalPrice = String(reservePrice);
    this.web3 = web3;

    const auctionContractAddress = contractAddresses?.auction || auctionV2Address;
    let transactionObject: PayableTransactionObject<void>;

    if (auctionContractAddress === auctionV2Address) {
      transactionObject = auctionV2Contract(web3).methods.createAuction(
        contractAddresses?.nft || nftAddress,
        tokenId,
        totalPrice,
        false,
        startTime,
        endTime,
      );
    } else {
      transactionObject = auctionContract(web3).methods.createAuction(
        contractAddresses?.nft || nftAddress,
        tokenId,
        totalPrice,
        startTime,
        endTime,
      );
    }

    const gas = await this.estimateGasDirect(transactionObject, { from });

    await this._execute(
      gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>,
      { txObject: transactionObject, from, gas },
    );

    return this.receipt;
  };
}

class UpdateAuction extends BlockchainFunction<CreateAuctionParams> {
  execute = async (web3: Web3) => {
    const { contractAddresses, from, tokenId, reservePrice, startTime, endTime } = this.params;
    const totalPrice = String(reservePrice);
    this.web3 = web3;

    const auctionContractAddress = contractAddresses?.auction || auctionV2Address;

    let transactionObject: PayableTransactionObject<void>;

    if (auctionContractAddress === auctionV2Address) {
      transactionObject = auctionV2Contract(web3).methods.updateAuction(
        contractAddresses?.nft || nftAddress,
        tokenId,
        totalPrice,
        false,
        startTime,
        endTime,
      );
    } else {
      transactionObject = auctionContract(web3).methods.updateAuction(
        contractAddresses?.nft || nftAddress,
        tokenId,
        totalPrice,
        startTime,
        endTime,
      );
    }

    const gas = await this.estimateGasDirect(transactionObject, { from });

    await this._execute(
      gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>,
      { txObject: transactionObject, from, gas },
    );

    return this.receipt;
  };
}

class ResultAuction extends BlockchainFunction<TokenParams> {
  execute = async (web3: Web3) => {
    const { contractAddresses, from, tokenId } = this.params;
    this.web3 = web3;

    const auctionContractAddress = contractAddresses?.auction || auctionV2Address;

    let transactionObject: PayableTransactionObject<void>;

    if (auctionContractAddress === auctionV2Address) {
      transactionObject = auctionV2Contract(web3).methods.resultAuction(contractAddresses?.nft || nftAddress, tokenId);
    } else {
      transactionObject = auctionContract(web3).methods.resultAuction(contractAddresses?.nft || nftAddress, tokenId);
    }

    const gas = await this.estimateGasDirect(transactionObject, { from });

    await this._execute(
      gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>,
      { txObject: transactionObject, from, gas },
    );

    return this.receipt;
  };
}

interface ListItemParams extends TokenParams {
  price: string;
  priceOGUN: string;
  startTime: number;
}

class ListItem extends BlockchainFunction<ListItemParams> {
  execute = async (web3: Web3) => {
    const { contractAddresses, from, tokenId, price, priceOGUN, startTime } = this.params;
    const totalPrice = String(price);
    const totalOGUNPrice = String(priceOGUN);
    this.web3 = web3;
    const acceptsMATIC = +price > 0;
    const acceptsOGUN = +priceOGUN > 0;

    const marketplaceContractAddress = contractAddresses?.marketplace || marketplaceEditionsAddress;

    let transactionObject: PayableTransactionObject<void>;

    if (marketplaceContractAddress === marketplaceEditionsAddress) {
      transactionObject = marketplaceEditionsContract(web3, marketplaceContractAddress).methods.listItem(
        contractAddresses?.nft || nftAddress,
        tokenId,
        1,
        totalPrice,
        totalOGUNPrice,
        acceptsMATIC,
        acceptsOGUN,
        startTime,
      );
    } else {
      transactionObject = marketplaceContract(web3, marketplaceContractAddress).methods.listItem(
        contractAddresses?.nft || nftAddress,
        tokenId,
        1,
        totalPrice,
        startTime,
      );
    }

    const gas = await this.estimateGasDirect(transactionObject, { from });

    await this._execute(
      gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>,
      { txObject: transactionObject, from, gas },
    );

    return this.receipt;
  };
}

class UpdateListing extends BlockchainFunction<ListItemParams> {
  execute = async (web3: Web3) => {
    const { contractAddresses, from, tokenId, price, priceOGUN, startTime } = this.params;
    const totalPrice = String(price);
    const totalOGUNPrice = String(priceOGUN);
    this.web3 = web3;
    const acceptsMATIC = +price > 0;
    const acceptsOGUN = +priceOGUN > 0;

    const marketplaceContractAddress = contractAddresses?.marketplace || marketplaceEditionsAddress;

    let transactionObject: PayableTransactionObject<void>;

    if (marketplaceContractAddress === marketplaceEditionsAddress) {
      transactionObject = marketplaceEditionsContract(web3, marketplaceContractAddress).methods.updateListing(
        contractAddresses?.nft || nftAddress,
        tokenId,
        totalPrice,
        totalOGUNPrice,
        acceptsMATIC,
        acceptsOGUN,
        startTime,
      );
    } else {
      transactionObject = marketplaceContract(web3, marketplaceContractAddress).methods.updateListing(
        contractAddresses?.nft || nftAddress,
        tokenId,
        totalPrice,
        startTime,
      );
    }

    const gas = await this.estimateGasDirect(transactionObject, { from });
    await this._execute(
      gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>,
      { txObject: transactionObject, from, gas },
    );

    return this.receipt;
  };
}

interface MintNftParams extends DefaultParam {
  uri: string;
  toAddress: string;
  royaltyPercentage: number;
  editionQuantity: number;
}

class MintNft extends BlockchainFunction<MintNftParams> {
  execute = async (web3: Web3) => {
    const { from, uri, toAddress, royaltyPercentage, editionQuantity } = this.params;
    this.web3 = web3;
    const transactionObject = nftContractEditions(web3).methods.createEditionWithNFTs(
      editionQuantity,
      toAddress,
      uri,
      royaltyPercentage,
    );
    const gas = await this.estimateGasDirect(transactionObject, { from, contractAddress: nftAddress });

    await this._execute(
      gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>,
      { txObject: transactionObject, from, gas, contractAddress: nftAddress },
    );

    return this.receipt;
  };
}

interface SendMaticParams extends DefaultParam {
  to: string;
  amount: string;
}

class SendMatic extends BlockchainFunction<SendMaticParams> {
  execute = async (web3: Web3) => {
    const { from, to, amount } = this.params;
    const amountWei = web3.utils.toWei(amount, 'ether');
    this.web3 = web3;
    const gasPrice = await this.getGasPriceDirect();
    const adjustedGasPrice = Math.floor(Number(gasPrice) * gasPriceMultiplier) || fallbackGasPrice;

    try {
      // Sign with Magic, broadcast via direct RPC
      const receipt = await this._signAndBroadcastNative({
        from, to, value: amountWei, gas: 21000, gasPrice: adjustedGasPrice,
      });
      this.receipt = receipt;
      this.onReceiptFunction && this.onReceiptFunction(receipt);
    } catch (signErr: any) {
      console.warn('Sign-broadcast failed for SendMatic, trying HD wallet:', signErr?.message);
      // Try HD wallet server-side signing
      if (this.me?.hdWalletAddress && from.toLowerCase() === this.me.hdWalletAddress.toLowerCase()) {
        try {
          const receipt = await this._sendNativeViaHdWallet({
            to, value: amountWei, gas: 21000, gasPrice: adjustedGasPrice,
          });
          this.receipt = receipt;
          return this.receipt;
        } catch (hdErr: any) {
          console.warn('HD wallet native send failed:', hdErr?.message);
        }
      }
      // Last resort: original .send()
      await this._execute(gasPrice =>
        web3.eth.sendTransaction({ from, to, value: amountWei, gas: 21000, gasPrice }) as unknown as PromiEvent<TransactionReceipt>
      );
    }

    return this.receipt;
  };
}

interface SendOgunParams extends DefaultParam {
  to: string;
  amount: string;
}

class SendOgun extends BlockchainFunction<SendOgunParams> {
  execute = async (web3: Web3) => {
    const { from, to, amount } = this.params;
    this.web3 = web3;
    const tokenAddress = config.ogunTokenAddress;
    const contract = new web3.eth.Contract(SoundchainOGUN20.abi as AbiItem[], tokenAddress);

    // Calculate 0.05% platform fee on OGUN transfer (tips)
    const platformFeeRate = config.soundchainFee || 0.0005;
    const amountNum = parseFloat(amount);
    const platformFee = amountNum * platformFeeRate;
    const feeWei = web3.utils.toWei(platformFee.toFixed(18), 'ether');
    const amountWei = web3.utils.toWei(amount, 'ether');
    const treasuryAddress = config.treasuryAddress;
    const gasPrice = await this.getGasPriceDirect();

    // Step 1: Send platform fee to treasury (in OGUN)
    if (platformFee > 0 && treasuryAddress) {
      const feeTx = contract.methods.transfer(treasuryAddress, feeWei);
      const feeGas = await this.estimateGasDirect(feeTx, { from });
      try {
        await this._signAndBroadcast(feeTx, { from, gas: feeGas, gasPrice });
      } catch {
        // Fallback to direct send
        await feeTx.send({ from, gas: feeGas, gasPrice });
      }
    }

    // Step 2: Send OGUN to recipient
    const transferTx = contract.methods.transfer(to, amountWei);
    const transferGas = await this.estimateGasDirect(transferTx, { from });

    await this._execute(
      gasPrice => transferTx.send({ from, gas: transferGas, gasPrice }) as unknown as PromiEvent<TransactionReceipt>,
      { txObject: transferTx, from, gas: transferGas },
    );
    return this.receipt;
  };
}

interface MintNftTokensToEditionParams extends DefaultParam {
  uri: string;
  toAddress: string;
  editionNumber: number;
  quantity: number;
  nonce: number;
}

class MintNftTokensToEdition extends BlockchainFunction<MintNftTokensToEditionParams> {
  prepare = (web3: Web3) => {
    const { uri, toAddress, editionNumber, quantity } = this.params;
    return nftContractEditions(web3).methods.safeMintToEditionQuantity(toAddress, uri, editionNumber, quantity);
  };
  estimateGas = async (_web3: Web3) => {
    const txObj = this.prepare(_web3);
    return this.estimateGasDirect(txObj, { from: this.params.from, contractAddress: nftAddress });
  };
  execute = async (web3: Web3) => {
    const { from, nonce } = this.params;

    this.web3 = web3;

    const transactionObject = this.prepare(web3);
    const gas = await this.estimateGasDirect(transactionObject, { from, contractAddress: nftAddress });

    // Apr 30 directive: NFT mints sign via external wallet ONLY (no Magic SDK).
    await this._executeMintViaExternalWallet({
      txObject: transactionObject, from, gas, nonce, contractAddress: nftAddress,
    });

    return this.receipt;
  };
}

interface CreateEditionParams extends DefaultParam {
  editionQuantity: number;
  toAddress: string;
  royaltyPercentage: number;
  nonce: number;
}

class CreateEdition extends BlockchainFunction<CreateEditionParams> {
  prepare = (web3: Web3) => {
    const { editionQuantity, toAddress, royaltyPercentage } = this.params;
    return nftContractEditions(web3).methods.createEdition(editionQuantity, toAddress, royaltyPercentage);
  };
  estimateGas = async (_web3: Web3) => {
    const txObj = this.prepare(_web3);
    return this.estimateGasDirect(txObj, { from: this.params.from, contractAddress: nftAddress });
  };
  execute = async (web3: Web3) => {
    const { from, nonce } = this.params;
    this.web3 = web3;

    const transactionObject = this.prepare(web3);
    const gas = await this.estimateGasDirect(transactionObject, { from, contractAddress: nftAddress });

    // Apr 30 directive: NFT mints sign via external wallet ONLY (no Magic SDK).
    await this._executeMintViaExternalWallet({
      txObject: transactionObject, from, gas, nonce, contractAddress: nftAddress,
    });

    return this.receipt;
  };
}

interface ListEditionParams extends DefaultParam {
  editionNumber: number;
  price: string;
  priceOGUN: string;
  startTime: number;
}

class ListEdition extends BlockchainFunction<ListEditionParams> {
  execute = async (web3: Web3) => {
    const { contractAddresses, editionNumber, from, price, priceOGUN, startTime } = this.params;
    const totalPrice = String(price);
    const totalOGUNPrice = String(priceOGUN);
    this.web3 = web3;
    const acceptsMATIC = +price > 0;
    const acceptsOGUN = +priceOGUN > 0;

    const transactionObject = marketplaceEditionsContract(web3).methods.listEdition(
      contractAddresses?.nft || nftAddress,
      editionNumber,
      totalPrice,
      totalOGUNPrice,
      acceptsMATIC,
      acceptsOGUN,
      startTime,
    );

    const gas = await this.estimateGasDirect(transactionObject, { from });

    await this._execute(
      gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>,
      { txObject: transactionObject, from, gas },
    );

    return this.receipt;
  };
}

export interface ListBatchParams extends DefaultParam {
  tokenIds: number[];
  price: string;
  priceOGUN: string;
  startTime: number;
  nonce?: number;
}

class ListBatch extends BlockchainFunction<ListBatchParams> {
  prepare = (web3: Web3) => {
    const { contractAddresses, tokenIds, price, priceOGUN, startTime } = this.params;
    const totalPrice = String(price);
    const totalOGUNPrice = String(priceOGUN);
    const acceptsMATIC = +price > 0;
    const acceptsOGUN = +priceOGUN > 0;

    this.web3 = web3;
    return marketplaceEditionsContract(web3).methods.listBatch(
      contractAddresses?.nft || nftAddress,
      tokenIds,
      totalPrice,
      totalOGUNPrice,
      acceptsMATIC,
      acceptsOGUN,
      startTime,
    );
  };
  estimateGas = async (_web3: Web3) => {
    const txObj = this.prepare(_web3);
    return this.estimateGasDirect(txObj, { from: this.params.from });
  };
  execute = async (web3: Web3) => {
    const { from, nonce } = this.params;
    this.web3 = web3;

    const transactionObject = this.prepare(web3);
    const gas = await this.estimateGasDirect(transactionObject, { from });

    await this._execute(
      gasPrice => transactionObject.send({ from, gas, gasPrice, nonce }) as PromiEvent<TransactionReceipt>,
      { txObject: transactionObject, from, gas, nonce },
    );

    return this.receipt;
  };
}

export interface CancelListingBatchParams extends DefaultParam {
  tokenIds: number[];
  nonce?: number;
}

class CancelListingBatch extends BlockchainFunction<CancelListingBatchParams> {
  prepare = (web3: Web3) => {
    const { contractAddresses, tokenIds } = this.params;
    return marketplaceEditionsContract(web3).methods.cancelListingBatch(contractAddresses?.nft || nftAddress, tokenIds);
  };
  estimateGas = async (_web3: Web3) => {
    const txObj = this.prepare(_web3);
    return this.estimateGasDirect(txObj, { from: this.params.from });
  };
  execute = async (web3: Web3) => {
    const { from, nonce } = this.params;
    this.web3 = web3;

    const transactionObject = this.prepare(web3);
    const gas = await this.estimateGasDirect(transactionObject, { from });

    await this._execute(
      gasPrice => transactionObject.send({ from, gas, gasPrice, nonce }) as PromiEvent<TransactionReceipt>,
      { txObject: transactionObject, from, gas, nonce },
    );

    return this.receipt;
  };
}

interface CancelEditionListingParams extends DefaultParam {
  editionNumber: number;
}

class CancelEditionListing extends BlockchainFunction<CancelEditionListingParams> {
  execute = async (web3: Web3) => {
    const { contractAddresses, editionNumber, from } = this.params;
    this.web3 = web3;

    const transactionObject = marketplaceEditionsContract(web3).methods.cancelEditionListing(
      contractAddresses?.nft || nftAddress,
      editionNumber,
    );
    const gas = await this.estimateGasDirect(transactionObject, { from });

    await this._execute(
      gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>,
      { txObject: transactionObject, from, gas },
    );

    return this.receipt;
  };
}

interface TransferNftTokenParams extends TokenParams {
  to: string;
}

class TransferNftToken extends BlockchainFunction<TransferNftTokenParams> {
  execute = async (web3: Web3) => {
    const { contractAddresses, from, to, tokenId } = this.params;
    this.web3 = web3;
    const transactionObject = nftContract(web3, contractAddresses?.nft).methods.transferFrom(from, to, tokenId);
    const gas = await this.estimateGasDirect(transactionObject, { from });

    await this._execute(
      gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>,
      { txObject: transactionObject, from, gas },
    );

    return this.receipt;
  };
}

interface ReadRewardsRateParams {
  contractAddress: string;
}

class ReadRewardsRate extends BlockchainFunction<ReadRewardsRateParams> {
  execute = async (web3: Web3) => {
    const { contractAddress } = this.params;
    this.web3 = web3;

    return await marketplaceEditionsContract(web3, contractAddress).methods.rewardsRate().call();
  };
}

interface BlockchainV2 {
  placeBid: (tokenId: number, from: string, value: string, contractAddresses: ContractAddresses) => PlaceBid;
  claimOgun: (from: string, to: string, amount: string, proof: string[]) => ClaimOgun;
  hasClaimedOgun: (address: string) => HasClaimedOgun;
  buyItem: (tokenId: number, from: string, owner: string, isPaymentOGUN: boolean, value: string, contractAddresses: ContractAddresses) => BuyItem;
  approveMarketplace: (from: string, contractAddresses: ContractAddresses) => ApproveMarketplace;
  approveAuction: (from: string, contractAddresses: ContractAddresses) => ApproveAuction;
  burnNftToken: (tokenId: number, from: string, contractAddresses: ContractAddresses) => BurnNft;
  cancelAuction: (tokenId: number, from: string, contractAddresses?: ContractAddresses) => CancelAuction;
  cancelListing: (tokenId: number, from: string, contractAddresses?: ContractAddresses) => CancelListing;
  createAuction: (tokenId: number, reservePrice: string, startTime: number, endTime: number, from: string, contractAddresses: ContractAddresses) => CreateAuction;
  updateAuction: (tokenId: number, reservePrice: string, startTime: number, endTime: number, from: string, contractAddresses: ContractAddresses) => UpdateAuction;
  listItem: (tokenId: number, from: string, price: string, priceOGUN: string, startTime: number, contractAddresses: ContractAddresses) => ListItem;
  updateListing: (tokenId: number, from: string, price: string, priceOGUN: string, startTime: number, contractAddresses: ContractAddresses) => UpdateListing;
  mintNftToken: (uri: string, from: string, toAddress: string, royaltyPercentage: number, editionQuantity: number) => MintNft;
  resultAuction: (tokenId: number, from: string, contractAddresses: ContractAddresses) => ResultAuction;
  sendMatic: (to: string, from: string, amount: string) => SendMatic;
  sendOgun: (to: string, from: string, amount: string) => SendOgun;
  transferNftToken: (tokenId: number, from: string, to: string, contractAddresses: ContractAddresses) => TransferNftToken;
  mintNftTokensToEdition: (uri: string, from: string, toAddress: string, editionNumber: number, quantity: number, nonce: number) => MintNftTokensToEdition;
  createEdition: (from: string, toAddress: string, royaltyPercentage: number, editionQuantity: number, nonce: number) => CreateEdition;
  listEdition: (editionNumber: number, from: string, price: string, priceOGUN: string, startTime: number, contractAddresses: ContractAddresses) => ListEdition;
  cancelEditionListing: (editionNumber: number, from: string, contractAddresses?: ContractAddresses) => CancelEditionListing;
  listBatch: (payload: ListBatchParams) => ListBatch;
  cancelListingBatch: (payload: CancelListingBatchParams) => CancelListingBatch;
  getEditionRoyalties: (web3: Web3, editionId: number) => Promise<number>;
  getRewardsRate: (web3: Web3) => Promise<string>;
}

const useBlockchainV2 = (): BlockchainV2 => {
  const me = useMe();
  const { magic } = useMagicContext();
  const { web3ModalProvider, activeWalletType, activeAddress } = useUnifiedWallet();
  const walletCtx: ExternalWalletCtx = useMemo(
    () => ({ web3ModalProvider, activeWalletType, activeAddress }),
    [web3ModalProvider, activeWalletType, activeAddress],
  );

  const placeBid = useCallback(
    (tokenId: number, from: string, value: string, contractAddresses: ContractAddresses) => {
      return new PlaceBid(me, { from, value, tokenId, contractAddresses }, magic);
    },
    [me, magic],
  );

  const claimOgun = useCallback(
    (from: string, to: string, amount: string, proof: string[]) => {
      return new ClaimOgun(me, { from, to, amount, proof }, magic);
    },
    [me, magic],
  );

  const hasClaimedOgun = useCallback(
    (address: string) => {
      return new HasClaimedOgun(me, { address }, magic);
    },
    [me, magic],
  );

  const buyItem = useCallback(
    (
      tokenId: number,
      from: string,
      owner: string,
      isPaymentOGUN: boolean,
      value: string,
      contractAddresses: ContractAddresses,
    ) => {
      return new BuyItem(me, { tokenId, from, owner, isPaymentOGUN, value, contractAddresses }, magic);
    },
    [me, magic],
  );

  const approveMarketplace = useCallback(
    (from: string, contractAddresses: ContractAddresses) => {
      return new ApproveMarketplace(me, { from, contractAddresses }, magic);
    },
    [me, magic],
  );

  const approveAuction = useCallback(
    (from: string, contractAddresses: ContractAddresses) => {
      return new ApproveAuction(me, { from, contractAddresses }, magic);
    },
    [me, magic],
  );

  const burnNftToken = useCallback(
    (tokenId: number, from: string, contractAddresses: ContractAddresses) => {
      return new BurnNft(me, { from, tokenId, contractAddresses }, magic);
    },
    [me, magic],
  );

  const cancelAuction = useCallback(
    (tokenId: number, from: string, contractAddresses?: ContractAddresses) => {
      return new CancelAuction(me, { from, tokenId, contractAddresses }, magic);
    },
    [me, magic],
  );

  const cancelListing = useCallback(
    (tokenId: number, from: string, contractAddresses?: ContractAddresses) => {
      return new CancelListing(me, { from, tokenId, contractAddresses }, magic);
    },
    [me, magic],
  );

  const createAuction = useCallback(
    (
      tokenId: number,
      reservePrice: string,
      startTime: number,
      endTime: number,
      from: string,
      contractAddresses: ContractAddresses,
    ) => {
      return new CreateAuction(me, { from, tokenId, reservePrice, startTime, endTime, contractAddresses }, magic);
    },
    [me, magic],
  );

  const updateAuction = useCallback(
    (
      tokenId: number,
      reservePrice: string,
      startTime: number,
      endTime: number,
      from: string,
      contractAddresses: ContractAddresses,
    ) => {
      return new UpdateAuction(me, { from, tokenId, reservePrice, startTime, endTime, contractAddresses }, magic);
    },
    [me, magic],
  );

  const resultAuction = useCallback(
    (tokenId: number, from: string, contractAddresses: ContractAddresses) => {
      return new ResultAuction(me, { from, tokenId, contractAddresses }, magic);
    },
    [me, magic],
  );

  const listItem = useCallback(
    (
      tokenId: number,
      from: string,
      price: string,
      priceOGUN: string,
      startTime: number,
      contractAddresses: ContractAddresses,
    ) => {
      return new ListItem(me, { from, tokenId, price, priceOGUN, startTime, contractAddresses }, magic);
    },
    [me, magic],
  );

  const updateListing = useCallback(
    (
      tokenId: number,
      from: string,
      price: string,
      priceOGUN: string,
      startTime: number,
      contractAddresses: ContractAddresses,
    ) => {
      return new UpdateListing(me, { from, tokenId, price, priceOGUN, startTime, contractAddresses }, magic);
    },
    [me, magic],
  );

  const mintNftToken = useCallback(
    (uri: string, from: string, toAddress: string, royaltyPercentage: number, editionQuantity: number) => {
      return new MintNft(me, { from, uri, toAddress, royaltyPercentage, editionQuantity }, magic);
    },
    [me, magic],
  );

  const sendMatic = useCallback(
    (to: string, from: string, amount: string) => {
      return new SendMatic(me, { from, to, amount }, magic);
    },
    [me, magic],
  );

  const sendOgun = useCallback(
    (to: string, from: string, amount: string) => {
      return new SendOgun(me, { from, to, amount }, magic);
    },
    [me, magic],
  );

  const transferNftToken = useCallback(
    (tokenId: number, from: string, to: string, contractAddresses: ContractAddresses) => {
      return new TransferNftToken(me, { from, to, tokenId, contractAddresses }, magic);
    },
    [me, magic],
  );

  const mintNftTokensToEdition = useCallback(
    (uri: string, from: string, toAddress: string, editionNumber: number, quantity: number, nonce: number) => {
      // walletCtx threaded so mint signs via Web3Modal/window.ethereum — no Magic SDK.
      return new MintNftTokensToEdition(me, { from, toAddress, uri, editionNumber, quantity, nonce }, magic, walletCtx);
    },
    [me, magic, walletCtx],
  );

  const createEdition = useCallback(
    (from: string, toAddress: string, royaltyPercentage: number, editionQuantity: number, nonce: number) => {
      return new CreateEdition(me, { from, toAddress, royaltyPercentage, editionQuantity, nonce }, magic, walletCtx);
    },
    [me, magic, walletCtx],
  );

  const listEdition = useCallback(
    (
      editionNumber: number,
      from: string,
      price: string,
      priceOGUN: string,
      startTime: number,
      contractAddresses: ContractAddresses,
    ) => {
      return new ListEdition(me, { editionNumber, from, price, priceOGUN, startTime, contractAddresses }, magic);
    },
    [me, magic],
  );

  const cancelEditionListing = useCallback(
    (editionNumber: number, from: string, contractAddresses?: ContractAddresses) => {
      return new CancelEditionListing(me, { editionNumber, from, contractAddresses }, magic);
    },
    [me, magic],
  );

  const listBatch = useCallback(
    (payload: ListBatchParams) => {
      return new ListBatch(me, payload, magic);
    },
    [me, magic],
  );

  const cancelListingBatch = useCallback(
    (payload: CancelListingBatchParams) => {
      return new CancelListingBatch(me, payload, magic);
    },
    [me, magic],
  );

  const getEditionRoyalties = useCallback(async (web3: Web3, editionId: number) => {
    const royalties = await (await nftContractEditions(web3).methods.editions(editionId).call()).royaltyPercentage;
    return parseFloat(royalties);
  }, []);

  const getRewardsRate = useCallback(
    async (web3: Web3) => {
      return await new ReadRewardsRate(me, { contractAddress: marketplaceEditionsAddress }, magic).execute(web3);
    },
    [me, magic],
  );

  return {
    placeBid,
    claimOgun,
    hasClaimedOgun,
    buyItem,
    approveMarketplace,
    approveAuction,
    burnNftToken,
    cancelAuction,
    cancelListing,
    createAuction,
    updateAuction,
    listItem,
    updateListing,
    mintNftToken,
    resultAuction,
    sendMatic,
    sendOgun,
    transferNftToken,
    mintNftTokensToEdition,
    createEdition,
    listEdition,
    cancelEditionListing,
    listBatch,
    cancelListingBatch,
    getEditionRoyalties,
    getRewardsRate,
  };
};

export default useBlockchainV2;
