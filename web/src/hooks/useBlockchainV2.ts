import { SDKBase } from '@magic-sdk/provider';
import { config } from 'config';
import { magic } from 'hooks/useMagicContext';
import { useMe } from 'hooks/useMe';
import { MeQuery } from 'lib/graphql';
import { useCallback } from 'react';
import { Soundchain721 } from 'types/web3-v1-contracts/Soundchain721';
import { SoundchainAuction } from 'types/web3-v1-contracts/SoundchainAuction';
import { SoundchainMarketplace } from 'types/web3-v1-contracts/SoundchainMarketplace';
import Web3 from 'web3';
import { PromiEvent, TransactionReceipt } from 'web3-core/types';
import { AbiItem } from 'web3-utils';
import AirdropClaim from '../contract/MerkleClaimERC20/MerkleClaimERC20.json';
import soundchainAuction from '../contract/Auction.sol/SoundchainAuction.json';
import soundchainMarketplace from '../contract/Marketplace.sol/SoundchainMarketplace.json';
import soundchainContract from '../contract/Soundchain721.sol/Soundchain721.json';
import { Contract } from 'web3-eth-contract';

const nftAddress = config.contractAddress as string;
const marketplaceAddress = config.marketplaceAddress as string;
const auctionAddress = config.auctionAddress as string;
const claimOgunAddress = config.claimOgunAddress as string;
export const gas = 1200000;
const fallbackGasPrice = '300000000000';

const auctionContract = (web3: Web3) =>
  new web3.eth.Contract(soundchainAuction.abi as AbiItem[], auctionAddress) as unknown as SoundchainAuction;

const claimOgunContract = (web3: Web3) =>
  new web3.eth.Contract(AirdropClaim.abi as AbiItem[], claimOgunAddress) as unknown as Contract;

const marketplaceContract = (web3: Web3) =>
  new web3.eth.Contract(soundchainMarketplace.abi as AbiItem[], marketplaceAddress) as unknown as SoundchainMarketplace;

const nftContract = (web3: Web3) =>
  new web3.eth.Contract(soundchainContract.abi as AbiItem[], nftAddress) as unknown as Soundchain721;

interface DefaultParam {
  from: string;
}
class BlockchainFunction<Type> {
  protected params: Type;
  protected me: MeQuery['me'] | undefined;
  protected web3?: Web3;
  protected receipt?: TransactionReceipt;
  protected onReceiptFunction?: (receipt: TransactionReceipt) => void;
  protected onErrorFunction?: (cause: Error) => void;
  protected finallyFunction?: () => void;

  constructor(me: MeQuery['me'] | undefined, params: Type) {
    this.me = me;
    this.params = params;
  }

  protected async _execute(lambda: (gasPrice: string) => PromiEvent<TransactionReceipt>) {
    const { me } = this;
    if ((this.web3?.currentProvider as SDKBase['rpcProvider']).isMagic && !(await magic.user.isLoggedIn()) && me) {
      await magic.auth.loginWithMagicLink({ email: me.email });
    }
    const gasPrice = (await this.web3?.eth.getGasPrice()) ?? fallbackGasPrice;
    lambda(gasPrice)
      .on('receipt', receipt => {
        this.receipt = receipt;
        this.onReceiptFunction && this.onReceiptFunction(receipt);
      })
      .catch(cause => {
        if (this.onErrorFunction) {
          const error = Object.keys(cause).includes('receipt')
            ? new Error(
              `Transaction reverted by the Blockchain.\r\n
                Please check the transaction on your wallet activity page for more details.`,
            )
            : cause;
          this.onErrorFunction(error);
        }
      })
      .finally(this.finallyFunction);
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
  isPaymentOGUN: boolean;
}
class PlaceBid extends BlockchainFunction<PlaceBidParams> {
  execute = async (web3: Web3) => {
    const { from, value, tokenId, isPaymentOGUN } = this.params;
    this.web3 = web3;

    if (isPaymentOGUN) {
      await this._execute(gasPrice =>
        auctionContract(web3).methods.placeBid(nftAddress, tokenId, isPaymentOGUN, value).send({ from, gas, gasPrice }),
      );
    } else {
      await this._execute(gasPrice =>
        auctionContract(web3).methods.placeBid(nftAddress, tokenId, isPaymentOGUN, value).send({ from, gas, value, gasPrice }),
      );
    }
    return this.receipt;
  };
}
interface ClaimOgunParams extends DefaultParam {
  address: string;
  value: string;
  proof: string[];
}
class ClaimOgun extends BlockchainFunction<ClaimOgunParams> {
  execute = async (web3: Web3) => {
    const { from, address, value, proof } = this.params;
    this.web3 = web3;
    await this._execute(gasPrice =>
      claimOgunContract(web3).methods.claim(address, value, proof).send({ from, gas, gasPrice }),
    );
    return this.receipt;
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
    const { owner, value, tokenId, isPaymentOGUN, from } = this.params;
    this.web3 = web3;

    if (isPaymentOGUN) {
      await this._execute(gasPrice =>
        marketplaceContract(web3).methods.buyItem(nftAddress, tokenId, owner, isPaymentOGUN).send({ from, gas, gasPrice }),
      );
    } else {
      await this._execute(gasPrice =>
        marketplaceContract(web3).methods.buyItem(nftAddress, tokenId, owner, isPaymentOGUN).send({ from, gas, value, gasPrice }),
      );
    }

    return this.receipt;
  };
}
class ApproveMarketplace extends BlockchainFunction<DefaultParam> {
  execute = async (web3: Web3) => {
    const { from } = this.params;
    this.web3 = web3;

    await this._execute(gasPrice =>
      nftContract(web3).methods.setApprovalForAll(marketplaceAddress, true).send({ from, gas, gasPrice }),
    );

    return this.receipt;
  };
}
class ApproveAuction extends BlockchainFunction<DefaultParam> {
  execute = async (web3: Web3) => {
    const { from } = this.params;
    this.web3 = web3;

    await this._execute(gasPrice =>
      nftContract(web3).methods.setApprovalForAll(auctionAddress, true).send({ from, gas, gasPrice }),
    );

    return this.receipt;
  };
}
interface TokenParams extends DefaultParam {
  tokenId: number;
}
class BurnNft extends BlockchainFunction<TokenParams> {
  execute = async (web3: Web3) => {
    const { from, tokenId } = this.params;
    this.web3 = web3;

    await this._execute(gasPrice => nftContract(web3).methods.burn(tokenId).send({ from, gas, gasPrice }));

    return this.receipt;
  };
}
class CancelAuction extends BlockchainFunction<TokenParams> {
  execute = async (web3: Web3) => {
    const { from, tokenId } = this.params;
    this.web3 = web3;

    await this._execute(gasPrice =>
      auctionContract(web3).methods.cancelAuction(nftAddress, tokenId).send({ from, gas, gasPrice }),
    );

    return this.receipt;
  };
}
class CancelListing extends BlockchainFunction<TokenParams> {
  execute = async (web3: Web3) => {
    const { from, tokenId } = this.params;
    this.web3 = web3;

    await this._execute(gasPrice =>
      marketplaceContract(web3).methods.cancelListing(nftAddress, tokenId).send({ from, gas, gasPrice }),
    );

    return this.receipt;
  };
}
interface CreateAuctionParams extends TokenParams {
  reservePrice: string;
  isPaymentOGUN: boolean;
  startTime: number;
  endTime: number;
}
class CreateAuction extends BlockchainFunction<CreateAuctionParams> {
  execute = async (web3: Web3) => {
    const { from, tokenId, reservePrice, isPaymentOGUN, startTime, endTime } = this.params;
    const totalPrice = Web3.utils.toBN(reservePrice).muln(1 + config.soundchainFee);
    this.web3 = web3;

    await this._execute(gasPrice =>
      auctionContract(web3)
        .methods.createAuction(nftAddress, tokenId, totalPrice, isPaymentOGUN, startTime, endTime)
        .send({ from, gas, gasPrice }),
    );

    return this.receipt;
  };
}
class UpdateAuction extends BlockchainFunction<CreateAuctionParams> {
  execute = async (web3: Web3) => {
    const { from, tokenId, reservePrice, isPaymentOGUN, startTime, endTime } = this.params;
    const totalPrice = Web3.utils.toBN(reservePrice).muln(1 + config.soundchainFee);
    this.web3 = web3;

    await this._execute(gasPrice =>
      auctionContract(web3)
        .methods.updateAuction(nftAddress, tokenId, totalPrice, isPaymentOGUN, startTime, endTime)
        .send({ from, gas, gasPrice }),
    );

    return this.receipt;
  };
}
class ResultAuction extends BlockchainFunction<TokenParams> {
  execute = async (web3: Web3) => {
    const { from, tokenId } = this.params;
    this.web3 = web3;

    await this._execute(gasPrice =>
      auctionContract(web3).methods.resultAuction(nftAddress, tokenId).send({ from, gas, gasPrice }),
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
    const { from, tokenId, price, priceOGUN, startTime } = this.params;
    const totalPrice = Web3.utils.toBN(price).muln(1 + config.soundchainFee);
    const totalOGUNPrice = Web3.utils.toBN(priceOGUN).muln(1 + config.soundchainFee);
    this.web3 = web3;
    const acceptsMATIC = +price > 0;
    const acceptsOGUN = +priceOGUN > 0;

    await this._execute(gasPrice =>
      marketplaceContract(web3)
        .methods.listItem(nftAddress, tokenId, 1, totalPrice, totalOGUNPrice, acceptsMATIC, acceptsOGUN, startTime)
        .send({ from, gas, gasPrice }),
    );

    return this.receipt;
  };
}
class UpdateListing extends BlockchainFunction<ListItemParams> {
  execute = async (web3: Web3) => {
    const { from, tokenId, price, priceOGUN, startTime } = this.params;
    const totalPrice = Web3.utils.toBN(price).muln(1 + config.soundchainFee);
    const totalOGUNPrice = Web3.utils.toBN(priceOGUN).muln(1 + config.soundchainFee);
    this.web3 = web3;
    const acceptsMATIC = +price > 0;
    const acceptsOGUN = +priceOGUN > 0;

    await this._execute(gasPrice =>
      marketplaceContract(web3)
        .methods.updateListing(nftAddress, tokenId, totalPrice, totalOGUNPrice, acceptsMATIC, acceptsOGUN, startTime)
        .send({ from, gas, gasPrice }),
    );

    return this.receipt;
  };
}
interface MintNftParams extends DefaultParam {
  uri: string;
  toAddress: string;
  royaltyPercentage: number;
}
class MintNft extends BlockchainFunction<MintNftParams> {
  execute = async (web3: Web3) => {
    const { from, uri, toAddress, royaltyPercentage } = this.params;
    this.web3 = web3;

    await this._execute(gasPrice =>
      nftContract(web3).methods.safeMint(toAddress, uri, royaltyPercentage).send({ from, gas, gasPrice }),
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
    const amountWei = web3.utils.toWei(amount);
    this.web3 = web3;

    await this._execute(gasPrice =>
      web3.eth.sendTransaction({
        from: from,
        to: to,
        value: amountWei,
        gas,
        gasPrice,
      }),
    );

    return this.receipt;
  };
}

interface TransferNftTokenParams extends TokenParams {
  to: string;
}
class TransferNftToken extends BlockchainFunction<TransferNftTokenParams> {
  execute = async (web3: Web3) => {
    const { from, to, tokenId } = this.params;
    this.web3 = web3;

    await this._execute(gasPrice =>
      nftContract(web3).methods.transferFrom(from, to, tokenId).send({ from, gas, gasPrice }),
    );

    return this.receipt;
  };
}
const useBlockchainV2 = () => {
  const me = useMe();

  const placeBid = useCallback(
    (tokenId: number, from: string, value: string, isPaymentOGUN:boolean) => {
      return new PlaceBid(me, { from, value, tokenId, isPaymentOGUN });
    },
    [me],
  );
  const claimOgun = useCallback(
    (from: string, address: string, value: string, proof: string[]) => {
      return new ClaimOgun(me, { from, address, value, proof });
    },
    [me],
  );
  const buyItem = useCallback(
    (tokenId: number, from: string, owner: string, isPaymentOGUN:boolean, value: string) => {
      return new BuyItem(me, { tokenId, from, owner, isPaymentOGUN, value });
    },
    [me],
  );
  const approveMarketplace = useCallback(
    (from: string) => {
      return new ApproveMarketplace(me, { from });
    },
    [me],
  );
  const approveAuction = useCallback(
    (from: string) => {
      return new ApproveAuction(me, { from });
    },
    [me],
  );
  const burnNftToken = useCallback(
    (tokenId: number, from: string) => {
      return new BurnNft(me, { from, tokenId });
    },
    [me],
  );
  const cancelAuction = useCallback(
    (tokenId: number, from: string) => {
      return new CancelAuction(me, { from, tokenId });
    },
    [me],
  );
  const cancelListing = useCallback(
    (tokenId: number, from: string) => {
      return new CancelListing(me, { from, tokenId });
    },
    [me],
  );
  const createAuction = useCallback(
    (tokenId: number, reservePrice: string, startTime: number, endTime: number, from: string, isPaymentOGUN:boolean) => {
      return new CreateAuction(me, { from, tokenId, reservePrice, isPaymentOGUN, startTime, endTime });
    },
    [me],
  );
  const updateAuction = useCallback(
    (tokenId: number, reservePrice: string, startTime: number, endTime: number, from: string, isPaymentOGUN:boolean) => {
      return new UpdateAuction(me, { from, tokenId, reservePrice, isPaymentOGUN, startTime, endTime });
    },
    [me],
  );
  const resultAuction = useCallback(
    (tokenId: number, from: string) => {
      return new ResultAuction(me, { from, tokenId });
    },
    [me],
  );
  const listItem = useCallback(
    (tokenId: number, from: string, price: string, priceOGUN: string, startTime: number) => {
      return new ListItem(me, { from, tokenId, price, priceOGUN, startTime });
    },
    [me],
  );
  const updateListing = useCallback(
    (tokenId: number, from: string, price: string, priceOGUN: string, startTime: number) => {
      return new UpdateListing(me, { from, tokenId, price, priceOGUN, startTime });
    },
    [me],
  );
  const mintNftToken = useCallback(
    (uri: string, from: string, toAddress: string, royaltyPercentage: number) => {
      return new MintNft(me, { from, uri, toAddress, royaltyPercentage });
    },
    [me],
  );
  const sendMatic = useCallback(
    (to: string, from: string, amount: string) => {
      return new SendMatic(me, { from, to, amount });
    },
    [me],
  );
  const transferNftToken = useCallback(
    (tokenId: number, from: string, to: string) => {
      return new TransferNftToken(me, { from, to, tokenId });
    },
    [me],
  );

  return {
    placeBid,
    claimOgun,
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
    transferNftToken,
  };
};

export default useBlockchainV2;
