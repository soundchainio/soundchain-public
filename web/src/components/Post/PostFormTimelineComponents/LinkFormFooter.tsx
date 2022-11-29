import tw from 'tailwind-styled-components'

interface LinkFormFooterProps {
  onLinkCancel: () => void
  onSaveClick: () => void
}

export const LinkFormFooter = ({ onLinkCancel, onSaveClick }: LinkFormFooterProps) => {
  return (
    <div className="flex w-full">
      <CancelButton onClick={onLinkCancel}>Cancel</CancelButton>
      <SaveButton onClick={onSaveClick}>Save</SaveButton>
    </div>
  )
}

const CancelButton = tw.button`
    mr-[12px]
    h-10 w-full
    cursor-pointer
    rounded-md
    border-2
    border-neutral-400
    bg-neutral-700
    text-center
    text-neutral-400
  `

const SaveButton = tw.button`
    h-10
    w-full
    cursor-pointer
    rounded-md
    border-2
    border-green-400
    bg-green-900
    text-center
    text-green-400
  `
