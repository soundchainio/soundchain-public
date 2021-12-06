interface BadgeGeneralProps {
  number?: number;
}

export const BadgeGeneral = ({ number }: BadgeGeneralProps) => {
  if (!number) return null;

  return (
    <>
      {number > 0 && (
        <div className="absolute rounded-full bg-red-700 h-4 w-4 text-xs text-white font-semibold text-center right-4 top-4">
          <span>{number}</span>
        </div>
      )}
    </>
  );
};
