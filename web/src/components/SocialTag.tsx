interface SocialTagProps {
  icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element
  url: string
  ariaLabel: string
}
export const SocialTag = ({ ariaLabel, icon: Icon, url }: SocialTagProps) => {
  return (
    <a
      aria-label={ariaLabel}
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex h-8 w-8 items-center justify-center"
    >
      <Icon />
    </a>
  )
}
