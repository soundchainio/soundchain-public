import { SDKBase, InstanceWithExtensions } from '@magic-sdk/provider';
import { OAuthExtension } from '@magic-ext/oauth2';
import { config } from 'config';
import { useMagicContext } from 'hooks/useMagicContext';
import { useMe } from 'hooks/useMe';
import { MeQuery } from 'lib/graphql-hooks';
import { useCallback } from 'react';
import { Soundchain721 } from 'types/web3-v1-contracts/Soundchain721';
import { SoundchainAuction } from 'types/web3-v1-contracts/SoundchainAuction';
import { SoundchainMarketplace } from 'types/web3-v1-contracts/SoundchainMarketplace';
import { PayableTransactionObject } from 'types/web3-v1-contracts/types';
import { MerkleClaimERC20 } from 'types/web3-v2-contracts/MerkleClaimERC20';
import { Soundchain721Editions } from 'types/web3-v2-contracts/Soundchain721Editions';
import { SoundchainAuction as SoundchainAuctionV2 } from 'types/web3-v2-contracts/SoundchainAuction';
import { SoundchainMarketplaceEditions } from 'types/web3-v2-contracts/SoundchainMarketplaceEditions';
import Web3 from 'web3';
import { PromiEvent, TransactionReceipt } from 'web3-core/types';
import { AbiItem } from 'web3-utils';
import BN from 'bn.js';
import soundchainAuction from '../contract/Auction.sol/SoundchainAuction.json';
import soundchainMarketplace from '../contract/Marketplace.sol/SoundchainMarketplace.json';
import soundchainContract from '../contract/Soundchain721.sol/Soundchain721.json';
import soundchainContractEditions from '../contract/Soundchain721Editions.sol/Soundchain721Editions.json';
import SoundchainOGUN20 from '../contract/SoundchainOGUN20.sol/SoundchainOGUN20.json';
import merkleClaimERC20 from '../contract/v2/MerkleClaimERC20.sol/MerkleClaimERC20.json';
import soundchainAuctionV2 from '../contract/v2/SoundchainAuction.json';
import soundchainMarketplaceEditions from '../contract/v2/SoundchainMarketplaceEditions.json';

export const gas = 1200000;

const claimOgunAddress = config.claimOgunAddress as string;
export const gasPriceMultiplier = 1.5;

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

  constructor(me: MeQuery['me'] | undefined, params: Type, magic: InstanceWithExtensions<SDKBase, OAuthExtension[]> | null) {
    this.me = me;
    this.params = params;
    this.magic = magic;
  }

  protected async validateAddress(address: string) {
    if (!this.web3?.utils.isAddress(address)) {
      throw new Error(`Invalid address: ${address}`);
    }
  }

  protected async _execute(lambda: (gasPrice: string | number) => PromiEvent<TransactionReceipt>) {
    const { me } = this;
    if (!me?.magicWalletAddress) {
      throw new Error('User address not found');
    }
    await this.validateAddress(me.magicWalletAddress);
    const isLoggedIn = await this.magic?.user.isLoggedIn() || false; // Added login check
    if (!isLoggedIn) return; // Prevent execution if not logged in
    if (this.web3?.currentProvider && (this.web3.currentProvider as unknown as SDKBase['rpcProvider']).isMagic && !isLoggedIn && me.email) {
      try {
        await this.magic?.auth.loginWithMagicLink({ email: me.email, showUI: false });
      } catch (e) {
        if (this.onErrorFunction) {
          this.onErrorFunction(new Error('Failed to refresh login session'));
        }
        return;
      }
    }
    const gasPriceString = await this.web3?.eth.getGasPrice();
    const gasPrice = Math.floor(Number(gasPriceString) * gasPriceMultiplier) ?? fallbackGasPrice;
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

    const gas = await transactionObject.estimateGas({ from, value });
    await this._execute(gasPrice => transactionObject.send({ from, gas, value, gasPrice }) as PromiEvent<TransactionReceipt>);

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

    const gas = await transactionObject.estimateGas({ from });

    await this._execute(gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>);
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
    const gas = await transactionObject.estimateGas({ from, value: (!isPaymentOGUN && value) || undefined });

    await this._execute(gasPrice =>
      transactionObject.send({ from, gas, value: (!isPaymentOGUN && value) || undefined, gasPrice }) as PromiEvent<TransactionReceipt>
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
    const gas = await transactionObject.estimateGas({ from });

    await this._execute(gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>);

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
    const gas = await transactionObject.estimateGas({ from });

    await this._execute(gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>);

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
    const gas = await transactionObject.estimateGas({ from });

    await this._execute(gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>);

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

    const gas = await transactionObject.estimateGas({ from });

    await this._execute(gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>);

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
    const gas = await transactionObject.estimateGas({ from });

    await this._execute(gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>);

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
    const totalPrice = new BN(reservePrice);
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

    const gas = await transactionObject.estimateGas({ from });

    await this._execute(gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>);

    return this.receipt;
  };
}

class UpdateAuction extends BlockchainFunction<CreateAuctionParams> {
  execute = async (web3: Web3) => {
    const { contractAddresses, from, tokenId, reservePrice, startTime, endTime } = this.params;
    const totalPrice = new BN(reservePrice);
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

    const gas = await transactionObject.estimateGas({ from });

    await this._execute(gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>);

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

    const gas = await transactionObject.estimateGas({ from });

    await this._execute(gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>);

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
    const totalPrice = new BN(price);
    const totalOGUNPrice = new BN(priceOGUN);
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

    const gas = await transactionObject.estimateGas({ from });

    await this._execute(gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>);

    return this.receipt;
  };
}

class UpdateListing extends BlockchainFunction<ListItemParams> {
  execute = async (web3: Web3) => {
    const { contractAddresses, from, tokenId, price, priceOGUN, startTime } = this.params;
    const totalPrice = new BN(price);
    const totalOGUNPrice = new BN(priceOGUN);
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

    const gas = await transactionObject.estimateGas({ from });
    await this._execute(gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>);

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
    const gas = await transactionObject.estimateGas({ from });

    await this._execute(gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>);

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
    const gas = 1200000;

    await this._execute(gasPrice =>
      web3.eth.sendTransaction({
        from: from,
        to: to,
        value: amountWei,
        gas,
        gasPrice,
      }) as unknown as PromiEvent<TransactionReceipt> // Enhanced type assertion
    );

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
    const amountWei = web3.utils.toWei(amount, 'ether');
    this.web3 = web3;
    const tokenAddress = config.ogunTokenAddress;
    const contract = new web3.eth.Contract(SoundchainOGUN20.abi as AbiItem[], tokenAddress);

    const data = await contract.methods.transfer(to, amountWei).encodeABI();

    await this._execute(gasPrice =>
      web3.eth.sendTransaction({
        from: from,
        to: tokenAddress,
        value: '0x00',
        gas,
        gasPrice,
        data: data,
      }) as unknown as PromiEvent<TransactionReceipt> // Enhanced type assertion
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
  estimateGas = (web3: Web3) => {
    return this.prepare(web3).estimateGas({ from: this.params.from });
  };
  execute = async (web3: Web3) => {
    const { from, nonce } = this.params;

    this.web3 = web3;

    const transactionObject = this.prepare(web3);

    let gas = 0;
    while (!gas) {
      try {
        gas = await transactionObject.estimateGas({ from });
      } catch {
        setTimeout(() => console.log('Retrying estimate gas'), 1000);
      }
    }
    console.log('Gas estimated: ' + gas);

    await this._execute(gasPrice => transactionObject.send({ from, gas, gasPrice, nonce }) as PromiEvent<TransactionReceipt>);

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
  estimateGas = (web3: Web3) => {
    return this.prepare(web3).estimateGas({ from: this.params.from });
  };
  execute = async (web3: Web3) => {
    const { from, nonce } = this.params;
    this.web3 = web3;

    const transactionObject = this.prepare(web3);
    const gas = await transactionObject.estimateGas({ from });

    await this._execute(gasPrice => transactionObject.send({ from, gas, gasPrice, nonce }) as PromiEvent<TransactionReceipt>);

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
    const totalPrice = new BN(price);
    const totalOGUNPrice = new BN(priceOGUN);
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

    const gas = await transactionObject.estimateGas({ from });

    await this._execute(gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>);

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
    const totalPrice = new BN(price);
    const totalOGUNPrice = new BN(priceOGUN);
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
  estimateGas = (web3: Web3) => {
    return this.prepare(web3).estimateGas({ from: this.params.from });
  };
  execute = async (web3: Web3) => {
    const { from, nonce } = this.params;
    this.web3 = web3;

    const transactionObject = this.prepare(web3);
    const gas = await transactionObject.estimateGas({ from, nonce });

    await this._execute(gasPrice => transactionObject.send({ from, gas, gasPrice, nonce }) as PromiEvent<TransactionReceipt>);

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
  estimateGas = (web3: Web3) => {
    return this.prepare(web3).estimateGas({ from: this.params.from });
  };
  execute = async (web3: Web3) => {
    const { from, nonce } = this.params;
    this.web3 = web3;

    const transactionObject = this.prepare(web3);
    const gas = await transactionObject.estimateGas({ from, nonce });

    await this._execute(gasPrice => transactionObject.send({ from, gas, gasPrice, nonce }) as PromiEvent<TransactionReceipt>);

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
    const gas = await transactionObject.estimateGas({ from });

    await this._execute(gasPrice => transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>);

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
    const gas = await transactionObject.estimateGas({ from });

    await this._execute(gasPrice => {
      return transactionObject.send({ from, gas, gasPrice }) as PromiEvent<TransactionReceipt>;
    });

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
      return new MintNftTokensToEdition(me, { from, toAddress, uri, editionNumber, quantity, nonce }, magic);
    },
    [me, magic],
  );

  const createEdition = useCallback(
    (from: string, toAddress: string, royaltyPercentage: number, editionQuantity: number, nonce: number) => {
      return new CreateEdition(me, { from, toAddress, royaltyPercentage, editionQuantity, nonce }, magic);
    },
    [me, magic],
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
