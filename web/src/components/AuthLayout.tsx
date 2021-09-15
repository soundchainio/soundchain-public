import { TopNavBar } from './TopNavBar';

export const AuthLayout: React.FC = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-20 pb-6">
      <TopNavBar />
      <div className="flex flex-1 flex-col sm:mx-auto sm:w-full sm:max-w-lg bg-gray-20 px-6 lg:px-8 pt-6">
        {children}
      </div>
    </div>
  );
};
