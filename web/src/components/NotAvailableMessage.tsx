import React from 'react';

interface NotAvailableMessageProps {
  type: string;
}

export const NotAvailableMessage = ({ type }: NotAvailableMessageProps) => {

  return (
    <div className=" justify-items-stretch w-full text-gray-80 p-4 text-center">
      This {type} is not available anymore
    </div>
  );
};
