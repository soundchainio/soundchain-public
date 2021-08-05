import { BottomNavBar } from 'components/BottomNavBar';
import { TopNavBar } from 'components/TopNavBar';

export default function Feed() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopNavBar />
      <div className="bg-custom-black-10 flex flex-1 flex-grow"></div>
      <BottomNavBar />
    </div>
  );
}
