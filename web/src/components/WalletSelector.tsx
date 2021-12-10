import { useMagicContext } from 'hooks/useMagicContext';
import { useMe } from 'hooks/useMe';
import useMetaMask from 'hooks/useMetaMask';
import { Logo } from 'icons/Logo';
import { Matic } from 'icons/Matic';
import { MetaMask } from 'icons/MetaMask';
import { DefaultWallet, useUpdateDefaultWalletMutation } from 'lib/graphql';
import React, { useCallback, useState } from 'react';

interface WalletSelectorProps {
  className?: string | undefined;
  ownerAddressAccount?: string;
}

export const WalletSelector = ({ className, ownerAddressAccount }: WalletSelectorProps) => {
  const me = useMe();
  const { account: metamaskAccount, balance: metamaskBalance } = useMetaMask();
  const { account: magicAccount, balance: magicBalance } = useMagicContext();
  const [updateDefaultWallet] = useUpdateDefaultWalletMutation();
  const [selectedWallet, setSelectedWallet] = useState<DefaultWallet>(me?.defaultWallet || DefaultWallet.Soundchain);

  const onChange = useCallback(
    ({ target: { value } }) => {
      setSelectedWallet(value as DefaultWallet);
      updateDefaultWallet({ variables: { input: { defaultWallet: value } } });
    },
    [updateDefaultWallet],
  );

  const isSoundChainSelected = selectedWallet === DefaultWallet.Soundchain;
  const balance = (isSoundChainSelected ? magicBalance : metamaskBalance) || 0;

  if (magicAccount?.toLowerCase() === ownerAddressAccount && metamaskAccount?.toLowerCase() === ownerAddressAccount) {
    return null;
  }

  return (
    <div className={className}>
      <div className="flex items-center w-full p-4 color bg-gray-20 justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-white font-bold">WALLET</div>
          <div className="flex flex-row items-center gap-1 font-black text-xxs text-gray-80">
            <span>Balance:</span>
            <div className="flex justify-center items-center gap-1">
              <Matic />
              <p>
                <strong className="text-white text-xs">{`${balance}`}</strong>
                MATIC
              </p>
            </div>
          </div>
        </div>

        <div className="relative">
          <select
            className="bg-gray-25 text-gray-80 font-bold text-xs rounded-lg border-0 pl-8"
            name="Wallet"
            id="wallet"
            onChange={onChange}
            value={selectedWallet}
          >
            <option value={DefaultWallet.Soundchain}>SoundChain</option>
            {metamaskAccount && <option value={DefaultWallet.MetaMask}>MetaMask</option>}
          </select>
          <span className="absolute top-2 left-2 pointer-events-none">
            {isSoundChainSelected ? (
              <Logo id="soundchain-wallet" height="16" width="16" />
            ) : (
              <MetaMask height="16" width="16" />
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
