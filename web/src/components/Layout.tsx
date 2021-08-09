import { BottomNavBar } from 'components/BottomNavBar';
import { TopNavBar } from 'components/TopNavBar';

export const Layout: React.FC = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNavBar />
      {children}
      <BottomNavBar />
    </div>
  );
};
