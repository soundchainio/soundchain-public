import { Dropdown } from '../Dropdown'
import { BsBookFill, BsArrowRightShort } from 'react-icons/bs'
import { svgGradientFromPurpleToGreen } from 'styles/svgGradientFromPurpleToGreen'
import Link from 'next/link'

export const Whitepaper = () => {
  return (
    <>
      {svgGradientFromPurpleToGreen()}
      <Dropdown title="Whitepaper" cursor="default">
        <div className="p-4">
          <Link href="https://soundchain.gitbook.io/">
            <a target="_blank" rel="noreferrer">
              <div className="group flex items-start hover:cursor-pointer">
                <BsBookFill className="mr-4 mt-1 group-hover:fill-[url(#blue-gradient)]" size={20} />
                <span>
                  <span className="flex items-center">
                    <span className="font-semibold text-slate-300">Whitepaper</span>
                    <BsArrowRightShort
                      className="-translate-x-3 opacity-0 transition-all group-hover:translate-x-0 group-hover:fill-[url(#blue-gradient)] group-hover:opacity-100 "
                      size={20}
                    />
                  </span>

                  <p className="bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text text-sm text-gray-80 group-hover:text-transparent">
                    Learn more about our platform by reading the full whitepaper
                  </p>
                </span>
              </div>
            </a>
          </Link>

          <div className="flex">
            <div className="ml-11 mt-10 mr-10 flex flex-col items-start">
              <span className="mb-2 font-semibold text-slate-300">Token</span>

              <Link href="https://soundchain.gitbook.io/soundchain/token/ogun/airdrop">
                <a target="_blank" rel="noreferrer" className="mb-1 ">
                  <span className="bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text text-gray-80 transition duration-150 ease-in-out hover:text-transparent">
                    Airdrop
                  </span>
                </a>
              </Link>

              <Link href="https://soundchain.gitbook.io/soundchain/token/ogun/staking">
                <a target="_blank" rel="noreferrer" className="mb-1">
                  <span className="bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text text-gray-80 transition duration-150 ease-in-out hover:text-transparent">
                    Staking
                  </span>
                </a>
              </Link>

              <Link href="https://soundchain.gitbook.io/soundchain/token/ogun/buy-sell-ogun">
                <a target="_blank" rel="noreferrer" className="mb-1">
                  <span className="bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text text-gray-80 transition duration-150 ease-in-out hover:text-transparent">
                    Buy/Sell Ogun
                  </span>
                </a>
              </Link>
            </div>

            <div className="ml-11 mt-10 flex flex-col items-start">
              <span className="mb-2 font-semibold text-slate-300">Support</span>

              <Link href="https://soundchain.gitbook.io/soundchain/support/faq">
                <a target="_blank" rel="noreferrer" className="mb-1 ">
                  <span className="bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text text-gray-80 transition duration-150 ease-in-out hover:text-transparent">
                    FAQ
                  </span>
                </a>
              </Link>

              <Link href="https://soundchain.gitbook.io/soundchain/support/social">
                <a target="_blank" rel="noreferrer" className="mb-1">
                  <span className="bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text text-gray-80 transition duration-150 ease-in-out hover:text-transparent">
                    Social
                  </span>
                </a>
              </Link>

              <Link href="https://soundchain.gitbook.io/soundchain/support/feedback">
                <a target="_blank" rel="noreferrer" className="mb-1">
                  <span className="bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text text-gray-80 transition duration-150 ease-in-out hover:text-transparent">
                    Feedback
                  </span>
                </a>
              </Link>
            </div>
          </div>
        </div>
      </Dropdown>
    </>
  )
}
