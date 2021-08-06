import classNames from 'classnames';
import { useRouter } from 'next/router';
import { Button } from './Button';

type TabConfig = {
  name: string;
  href: string;
  current: boolean;
  icon?: (props: React.ComponentProps<'svg'>) => JSX.Element;
};

interface TabNavProps extends React.ComponentPropsWithoutRef<'nav'> {
  tabs: TabConfig[];
}

export const TabNav: React.FC<TabNavProps> = ({ tabs, className }) => {
  return (
    <nav className={classNames(className, 'flex')} aria-label="Tabs">
      {tabs.map(Tab)}
    </nav>
  );
};

const Tab = (tab: TabConfig) => {
  const router = useRouter();
  return (
    <div key={tab.name} onClick={() => router.push(tab.href)} className="w-full">
      {tab.current ? (
        <Button icon={tab.icon} variant="raibow-xs" className="w-full">
          {tab.name}
        </Button>
      ) : (
        <div className="flex flex-row uppercase items-center justify-center sm:px-3 py-3 font-medium text-gray-400 bg-gray-30 cursor-pointer w-full h-8">
          {tab.icon && <tab.icon className="mr-1 h-4 w-4" aria-hidden="true" />}
          <span>{tab.name}</span>
        </div>
      )}
    </div>
  );
};
