import Link from 'next/link'

export const OgunButton = () => {
  return (
    <Link href="/ogun" passHref>
      <span className="mr-6 bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text font-semibold text-gray-80 transition duration-150 ease-in-out hover:text-transparent">
        Ogun
      </span>
    </Link>
  )
}
