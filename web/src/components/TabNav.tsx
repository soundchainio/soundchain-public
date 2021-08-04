import classNames from 'classnames';
import NextLink from 'next/link';

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
    <nav className="flex space-x-4" aria-label="Tabs">
      {tabs.map(tab => (
        <NextLink key={tab.name} href={tab.href} aria-current={tab.current ? 'page' : undefined}>
          <div
            className={classNames(
              tab.current ? 'bg-gray-800 text-green-500' : 'text-green-500 hover:bg-gray-800',
              'flex flex-row justify-center px-3 py-3 font-medium text-sm rounded-md cursor-pointer w-full',
            )}
          >
            {tab.icon && <tab.icon className="text-green-500 mr-2 h-5 w-5" aria-hidden="true" />}
            <span>{tab.name}</span>
          </div>
        </NextLink>
      ))}
    </nav>
  );
};
