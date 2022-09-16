import { Dropdown } from '../Dropdown'
import { BsBookFill, BsArrowRightShort } from 'react-icons/bs'
import { svgGradientFromPurpleToGreen } from 'styles/svgGradientFromPurpleToGreen'

export const Tokenomics = () => {
  return (
    <>
      {svgGradientFromPurpleToGreen()}
      <Dropdown title="Tokenomics">
        <div className="group flex items-start hover:cursor-pointer">
          <BsBookFill className="mr-4 mt-1 group-hover:fill-[url(#blue-gradient)]" size={25} />
          <span>
            <span className="flex items-center">
              <span className="font-semibold text-white">Whitepaper</span>
              <BsArrowRightShort
                className="-translate-x-3 opacity-0 transition duration-150 ease-in group-hover:translate-x-0 group-hover:fill-[url(#blue-gradient)] group-hover:opacity-100"
                size={25}
              />
            </span>

            <p className="bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text group-hover:text-transparent">
              Learn more about our platform by reading the whitepaper
            </p>
          </span>
        </div>
      </Dropdown>
    </>
  )
}
