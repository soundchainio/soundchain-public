export const LockedLayout: React.FC = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
      <div className="flex flex-1 flex-col sm:mx-auto sm:w-full sm:max-w-lg bg-gray-20">{children}</div>
    </div>
  );
};
