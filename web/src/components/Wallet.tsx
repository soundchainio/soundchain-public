import Link from 'next/link';
import { Link as LinkIcon } from 'icons/Link';
import { Copy2 as Copy } from 'icons/Copy2';
import { Matic } from 'icons/Matic';
import useMetaMask from 'hooks/useMetaMask';
import { Button } from 'components/Button';
interface WalletProps extends React.ComponentPropsWithoutRef<'div'> {
  title: string;
  correctNetwork?: boolean;
  account?: string;
  balance?: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
  defaultWallet?: boolean
  showAddMatic?: boolean
  showActionButtons?: boolean
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
  )
}

const Account = ({ account, balance, defaultWallet, showActionButtons }: Partial<WalletProps>) => {
  return (
    <>
      <div className="flex flex-row bg-gray-1A w-full pl-2 pr-3 py-2 items-center justify-between">
        <div className="flex flex-row items-center w-10/12 justify-start">
          <LinkIcon />
          <span className="text-gray-80 text-xs md-text-sm font-bold mx-1 truncate w-full">{account}</span>
        </div>
        <div className="flex justify-end w-2/12">
          <button className="flex flex-row items-center border border-gray-30 border-opacity-75 rounded-sm p-0.5" onClick={() => { navigator.clipboard.writeText(account + '') }}>
            <Copy />
            <span className="text-gray-80 text-xs pl-1 uppercase leading-none">copy</span>
          </button>
        </div>
      </div>
      <div className="flex w-full">
        <div className="flex items-center justify-center w-7/12 bg-gray-20 text-gray-CC font-bold text-xs md-text-sm uppercase py-3">Total Balance</div>
        <div className="flex flex-wrap items-center justify-center w-5/12 bg-gray-30 uppercase py-3">
          <span className="my-auto"><Matic /></span>
          <span className="mx-1 text-gray-CC font-bold text-md leading-tight">{balance}</span>
          <div className="items-end">
            <span className="text-gray-80 font-bold text-xs leading-tight">matic</span>
          </div>
        </div>
      </div>
      {showActionButtons &&
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
      }
      <div className="flex w-full justify-between px-4">
        <div className="flex items-center justify-start">
          {!defaultWallet &&
            <label className="inline-flex items-center m-2">
              <input type="checkbox" className="form-checkbox rounded bg-black text-black" />
              <span className="ml-2 text-sm font-bold text-white ">Default Wallet</span>
            </label>
          }
        </div>
        <div className="flex items-center justify-end">
          {balance &&
            <>
              <a
                className="text-sm text-gray-80 font-bold underline m-2"
                href="https://faucet.polygon.technology/"
                target="_blank"
                rel="noreferrer"
              >
                Need some Matic?
              </a>
              <span className="my-auto mr-2"><Matic /></span>
            </>
          }
        </div>
      </div>
    </>
  )
}

export const Wallet = ({ icon: Icon, title, correctNetwork, ...props }: WalletProps) => {
  return (
    <>
      <div className="flex flex-col space-y-2 px-6 py-5">
        <div className="flex flex-row space-x-2 items-center">
          <Icon />
          <div className="text-gray-CC font-bold">{title}</div>
        </div>
        {correctNetwork ? <Network /> : <NotTestnet />}
      </div>
      {correctNetwork && <Account {...props} />}
    </>
  )
}