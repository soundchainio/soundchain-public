import NextLink from 'next/link';
import Button from './Button';

type TabConfig = {
  name: string;
  href: string;
  current: boolean;
  icon?: (props: React.ComponentProps<'svg'>) => JSX.Element;
};

interface TabNavProps {
  tabs: TabConfig[];
}

export const TabNav: React.FC<TabNavProps> = ({ tabs }) => {
  return (
    <nav className="flex" aria-label="Tabs">
      {tabs.map(Tab)}
    </nav>
  );
};

function Tab(tab: TabConfig) {
  return (
    <NextLink key={tab.name} href={tab.href}>
      {tab.current ? (
        <Button icon={tab.icon} className="w-full text-sm">
          {tab.name}
        </Button>
      ) : (
        <div className="flex flex-row uppercase text-sm items-center justify-center px-3 py-3 font-medium text-gray-400 bg-gray-800 cursor-pointer w-full">
          {tab.icon && <tab.icon className="mr-2 h-5 w-5" aria-hidden="true" />}
          <span>{tab.name}</span>
        </div>
      )}
    </NextLink>
  );
}
