import Link from 'next/link'

export const RoadmapButton = () => {
  return (
    <Link href="/roadmap" passHref>
      <span className="mr-6 bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text font-semibold text-gray-80 transition duration-150 ease-in-out hover:text-transparent">
        Roadmap
      </span>
    </Link>
  )
}
