import classNames from 'classnames';
import NextLink from 'next/link';
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

function Tab(tab: TabConfig) {
  return (
    <NextLink key={tab.name} href={tab.href}>
      {tab.current ? (
        <Button icon={tab.icon} variant="raibow-xs" className="w-full">
          {tab.name}
        </Button>
      ) : (
        <div className="flex flex-row uppercase items-center justify-center sm:px-3 py-3 font-medium text-gray-400 bg-gray-30 cursor-pointer w-full h-8">
          {tab.icon && <tab.icon className="mr-1 h-5 w-5" aria-hidden="true" />}
          <span>{tab.name}</span>
        </div>
      )}
    </NextLink>
  );
}
