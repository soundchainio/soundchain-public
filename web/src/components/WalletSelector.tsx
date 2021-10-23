import classNames from 'classnames';
import { useMagicContext } from 'hooks/useMagicContext';
import { useMe } from 'hooks/useMe';
import useMetaMask from 'hooks/useMetaMask';
import { CheckmarkFilled } from 'icons/CheckmarkFilled';
import { Logo } from 'icons/Logo';
import { Matic } from 'icons/Matic';
import { MetaMask } from 'icons/MetaMask';
import { DefaultWallet, useUpdateDefaultWalletMutation } from 'lib/graphql';
import React from 'react';

interface WalletSelectorProps {
  className?: string | undefined;
  ownerAddressAccount?: string;
}

interface WalletProps {
  walletName: string;
  balance: string;
  isSounchainWallet?: boolean;
  onDefaultWalletClick: () => void;
  className?: string | undefined;
}

export const WalletSelector = ({ className, ownerAddressAccount }: WalletSelectorProps) => {
  const me = useMe();
  const { account: metamaskAccount, balance } = useMetaMask();
  const { account: magicAccount, balance: magicBalance } = useMagicContext();
  const [updateDefaultWallet] = useUpdateDefaultWalletMutation();

  const Wallet = ({ walletName, balance, isSounchainWallet, onDefaultWalletClick, className }: WalletProps) => {
    return (
      <div className={classNames('flex items-center w-full py-3 px-4 color bg-gray-20', className)}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-white font-bold">
            {isSounchainWallet ? <Logo id="soundchain-wallet" height="20" width="20" /> : <MetaMask />}
            {walletName} Wallet
          </div>
          <div className="flex flex-row items-center gap-1 font-black text-xxs text-gray-80">
            <span>Balance:</span>
            <div className="flex justify-center items-center gap-1">
              <Matic />
              <p>
                <strong className="text-white text-xs">{`${balance} `}</strong>
                MATIC
              </p>
            </div>
          </div>
        </div>
        {me?.defaultWallet === walletName ? (
          <div className="flex items-center gap-1 ml-auto">
            <CheckmarkFilled />
            <span className="flex-shrink-0 text-xxs uppercase font-bold green-gradient-text">Wallet selected</span>
          </div>
        ) : (
          <button
            className="flex-shrink-0 text-xxs rounded border-2 border-gray-50 bg-gray-30 text-white text-xs uppercase flex justify-center items-center gap-2 px-3 font-bold ml-auto h-9"
            onClick={onDefaultWalletClick}
          >
            Select wallet
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={className}>
      {magicAccount?.toLowerCase() !== ownerAddressAccount && (
        <Wallet
          walletName={DefaultWallet.Soundchain}
          balance={magicBalance || '0'}
          isSounchainWallet
          onDefaultWalletClick={() =>
            updateDefaultWallet({ variables: { input: { defaultWallet: DefaultWallet.Soundchain } } })
          }
        />
      )}
      {metamaskAccount && metamaskAccount?.toLowerCase() !== ownerAddressAccount && (
        <Wallet
          className="bg-gray-15"
          walletName={DefaultWallet.MetaMask}
          balance={balance || '0'}
          onDefaultWalletClick={() =>
            updateDefaultWallet({ variables: { input: { defaultWallet: DefaultWallet.MetaMask } } })
          }
        />
      )}
    </div>
  );
};
