import { FaDiscord, FaTwitter, FaYoutube, FaTelegramPlane } from 'react-icons/fa'
import { AiFillInstagram } from 'react-icons/ai'
import Link from 'next/link'

export const SocialMediaMenu = () => {
  return (
    <>
      <div className="fixed top-[30%] left-0 z-50 flex h-full flex-col">
        <Link href="https://discord.gg/5yZG6BTTHV">
          <a target="_blank" rel="noreferrer">
            <span className="pointer-events-none flex h-12 w-12 items-center justify-center bg-[#5865f2] transition-transform  hover:scale-[1.5] md:pointer-events-auto">
              <FaDiscord size={25} />
            </span>
          </a>
        </Link>

        <Link href="https://t.me/DbHfqlVpV644ZGMx">
          <a target="_blank" rel="noreferrer">
            <span className="pointer-events-none flex h-12 w-12 items-center justify-center bg-[#30a2e8] transition-transform  hover:scale-[1.5] md:pointer-events-auto ">
              <FaTelegramPlane size={25} className="mr-1" />
            </span>
          </a>
        </Link>

        <Link href="https://www.instagram.com/soundchain.io/">
          <a target="_blank" rel="noreferrer">
            <span className="pointer-events-none flex h-12 w-12 items-center justify-center bg-gradient-to-tr from-[#f09433] via-[#e6683c] via-[#dc2743]  via-[#cc2366] to-[#bc1888]  transition-transform hover:scale-[1.5] md:pointer-events-auto">
              <AiFillInstagram size={25} />
            </span>
          </a>
        </Link>

        <Link href="https://twitter.com/soundchain_io">
          <a target="_blank" rel="noreferrer">
            <span className="pointer-events-none flex h-12 w-12 items-center justify-center bg-[#1da1f3] transition-transform hover:scale-[1.5] md:pointer-events-auto">
              <FaTwitter size={25} />
            </span>
          </a>
        </Link>

        <Link href="https://www.youtube.com/channel/UC-TJ1KIYWCYLtngwaELgyLQ">
          <a target="_blank" rel="noreferrer">
            <span className=" pointer-events-none flex h-12 w-12 items-center justify-center bg-[#fe0000] transition-transform hover:scale-[1.5] md:pointer-events-auto">
              <FaYoutube size={25} />
            </span>
          </a>
        </Link>
      </div>
    </>
  )
}
