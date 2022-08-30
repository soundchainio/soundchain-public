interface BadgeGeneralProps {
  number?: number
}

export const BadgeGeneral = ({ number }: BadgeGeneralProps) => {
  if (!number) return null

  return (
    <>
      {number > 0 && (
        <div className="absolute right-4 top-4 h-4 w-4 rounded-full bg-red-700 text-center text-xs font-semibold text-white">
          <span>{number}</span>
        </div>
      )}
    </>
  )
}
