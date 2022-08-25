import React from 'react'

interface NotAvailableMessageProps {
  type: string
}

export const NotAvailableMessage = ({ type }: NotAvailableMessageProps) => {
  return (
    <div className=" w-full justify-items-stretch p-4 text-center text-gray-80">
      This {type} is not available anymore
    </div>
  )
}
