import Link from 'next/link'
import { BsArrowRightShort, BsBookFill } from 'react-icons/bs'
import { svgGradientFromPurpleToGreen } from 'styles/svgGradientFromPurpleToGreen'

import { Dropdown } from '../Dropdown'

export const Whitepaper = () => {
  return (
    <>
      {svgGradientFromPurpleToGreen()}
      <Dropdown title="Whitepaper" cursor="default">
        <div className="p-4">
          <Link href="https://soundchain-1.gitbook.io/soundchain-docs/" target="_blank" rel="noreferrer" passHref>
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
          </Link>

          <div className="flex">
            <div className="ml-11 mt-10 mr-10 flex flex-col items-start">
              <span className="mb-2 font-semibold text-slate-300">Token</span>

              <Link
                href="https://soundchain-1.gitbook.io/soundchain-docs/tokenomics/ogun-overview"
                target="_blank"
                rel="noreferrer"
                className="mb-1 "
                passHref
              >
                <span className="bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text text-gray-80 transition duration-150 ease-in-out hover:text-transparent">
                  Airdrop
                </span>
              </Link>

              <Link
                href="https://soundchain-1.gitbook.io/soundchain-docs/platform/staking"
                target="_blank"
                rel="noreferrer"
                className="mb-1"
                passHref
              >
                <span className="bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text text-gray-80 transition duration-150 ease-in-out hover:text-transparent">
                  Staking
                </span>
              </Link>

              <Link
                href="https://soundchain-1.gitbook.io/soundchain-docs/tokenomics/buy-sell"
                target="_blank"
                rel="noreferrer"
                className="mb-1"
                passHref
              >
                <span className="bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text text-gray-80 transition duration-150 ease-in-out hover:text-transparent">
                  Buy/Sell Ogun
                </span>
              </Link>
            </div>

            <div className="ml-11 mt-10 flex flex-col items-start">
              <span className="mb-2 font-semibold text-slate-300">Support</span>

              <Link
                href="https://soundchain-1.gitbook.io/soundchain-docs/support/faq"
                passHref
                target="_blank"
                rel="noreferrer"
                className="mb-1 "
              >
                <span className="bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text text-gray-80 transition duration-150 ease-in-out hover:text-transparent">
                  FAQ
                </span>
              </Link>

              <Link
                href="https://soundchain-1.gitbook.io/soundchain-docs/support/community"
                passHref
                target="_blank"
                rel="noreferrer"
                className="mb-1"
              >
                <span className="bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text text-gray-80 transition duration-150 ease-in-out hover:text-transparent">
                  Social
                </span>
              </Link>

              <Link
                href="https://soundchain-1.gitbook.io/soundchain-docs/support/contact"
                passHref
                target="_blank"
                rel="noreferrer"
                className="mb-1"
              >
                <span className="bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text text-gray-80 transition duration-150 ease-in-out hover:text-transparent">
                  Feedback
                </span>
              </Link>
            </div>
          </div>
        </div>
      </Dropdown>
    </>
  )
}
