import classNames from 'classnames';
import { useMagicContext } from 'hooks/useMagicContext';
import { useMe } from 'hooks/useMe';
import useMetaMask from 'hooks/useMetaMask';
import { Logo } from 'icons/Logo';
import { Matic } from 'components/Matic';
import { MetaMask } from 'icons/MetaMask';
import { DefaultWallet, useUpdateDefaultWalletMutation } from 'lib/graphql';
import React, { useCallback, useState } from 'react';
import { compareWallets } from 'utils/Wallet';
import { useWalletContext } from 'hooks/useWalletContext';

interface WalletSelectorProps {
  className?: string | undefined;
  ownerAddressAccount?: string;
}

export const WalletSelector = ({ className, ownerAddressAccount }: WalletSelectorProps) => {
  const me = useMe();
  const { account: metamaskAccount } = useMetaMask();
  const { account: magicAccount } = useMagicContext();
  const [updateDefaultWallet] = useUpdateDefaultWalletMutation();
  const [selectedWallet, setSelectedWallet] = useState<DefaultWallet>(me?.defaultWallet || DefaultWallet.Soundchain);
  const { balance } = useWalletContext(selectedWallet);

  const onChange = useCallback(
    ({ target: { value } }) => {
      setSelectedWallet(value as DefaultWallet);
      updateDefaultWallet({ variables: { input: { defaultWallet: value } } });
    },
    [updateDefaultWallet],
  );

  const isSoundChainSelected = selectedWallet === DefaultWallet.Soundchain;

  if (compareWallets(magicAccount, ownerAddressAccount) && compareWallets(metamaskAccount, ownerAddressAccount)) {
    return null;
  }

  return (
    <div className={classNames('bg-gray-20', className)}>
      <div className="flex items-center w-full p-4 color justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-white font-bold">WALLET</div>
          <div className="flex flex-row items-center gap-1 font-black text-xxs text-gray-80">
            <span>Balance:</span>
            <Matic value={balance} />
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
