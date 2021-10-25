import { Button } from 'components/Button';
import useMetaMask from 'hooks/useMetaMask';
import { Copy2 as Copy } from 'icons/Copy2';
import { Link as LinkIcon } from 'icons/Link';
import { Matic } from 'icons/Matic';
import Link from 'next/link';
interface WalletProps extends React.ComponentPropsWithoutRef<'div'> {
  title: string;
  correctNetwork?: boolean;
  account?: string;
  balance?: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
  defaultWallet: boolean;
  onDefaultWalletClick: () => void;
  showAddMatic?: boolean;
  showActionButtons?: boolean;
}

const NotTestnet = () => {
  const { addMumbaiTestnet } = useMetaMask();
  return (
    <div>
      <div className="text-white">{`It seems you might not be connected to Mumbai Testnet.`}</div>
      <div className="text-white mt-4 max-w-sm">
        <Button variant="rainbow-xs" onClick={() => addMumbaiTestnet()}>
          Connect to Mumbai Testnet
        </Button>
      </div>
    </div>
  );
};

const Network = () => {
  return (
    <div className="flex flex-row">
      <span className="border-2 border-green-400 border-opacity-75 rounded-full inline-block w-2 h-2 my-auto mr-1"></span>
      <span className="text-gray-80 font-bold text-xs uppercase my-auto mr-1">Network: </span>
      <span className="text-gray-CC font-bold text-xs my-auto">Polygon</span>
    </div>
  );
};

interface AccountProps extends Partial<Omit<WalletProps, 'onDefaultWalletClick'>> {
  onDefaultWalletClick: () => void;
}

const Account = ({ account, balance, defaultWallet, showActionButtons, onDefaultWalletClick }: AccountProps) => {
  return (
    <>
      <div className="flex flex-row text-xxs bg-gray-1A w-full pl-2 pr-3 py-2 items-center justify-between">
        <div className="flex flex-row items-center w-10/12 justify-start">
          <LinkIcon />
          <span className="text-gray-80 md-text-sm font-bold mx-1 truncate w-full">{account}</span>
        </div>
        <button
          className="flex flex-row gap-1 items-center border-2 border-gray-30 border-opacity-75 rounded p-1"
          onClick={() => {
            navigator.clipboard.writeText(account + '');
          }}
        >
          <Copy />
          <span className="text-gray-80 uppercase leading-none">copy</span>
        </button>
      </div>
      <div className="flex w-full">
        <div className="flex-1 flex items-center justify-start bg-gray-20 text-gray-CC font-bold text-xs uppercase px-4 py-3">
          Total Balance
        </div>
        <div className="flex flex-wrap items-center justify-center bg-gray-30 uppercase px-4 py-3">
          <span className="my-auto">
            <Matic />
          </span>
          <span className="mx-1 text-white font-bold text-md leading-tight">{balance}</span>
          <div className="items-end">
            <span className="text-gray-80 font-black text-xxs leading-tight">matic</span>
          </div>
        </div>
      </div>
      {showActionButtons && (
        <div className="flex w-full justify-around py-5">
          <Link href="/" passHref>
            <button className="bg-gray-20 py-2 w-40">
              <span className="uppercase green-gradient-text font-bold text-sm">Buy tokens</span>
            </button>
          </Link>
          <Link href="/wallet/transfer" passHref>
            <button className="bg-gray-20 py-2 w-40">
              <span className="uppercase yellow-gradient-text font-bold text-sm">Send tokens</span>
            </button>
          </Link>
        </div>
      )}

      {!defaultWallet && (
        <label className="justify-start inline-flex items-center cursor-pointer w-full gap-2 p-4">
          <input
            type="checkbox"
            className="h-5 w-5 text-black bg-black border-gray-30 rounded border-2"
            onClick={() => onDefaultWalletClick()}
          />
          <span className="text-sm font-bold text-white">Set as default</span>
        </label>
      )}
    </>
  );
};

export const Wallet = ({ icon: Icon, title, correctNetwork, ...props }: WalletProps) => {
  return (
    <>
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex flex-row space-x-2 items-center">
          <Icon />
          <div className="text-white font-bold text-sm">{title}</div>
        </div>
        {correctNetwork ? <Network /> : <NotTestnet />}
      </div>
      {correctNetwork && <Account {...props} />}
    </>
  );
};
