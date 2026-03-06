import React, { useState } from 'react'
import { MdKeyboardArrowUp, MdKeyboardArrowDown } from 'react-icons/md'
import tw from 'tailwind-styled-components'

interface AccordionProps {
  children: React.ReactNode
  title: string | React.ReactNode
}
export const Accordion = (props: AccordionProps) => {
  const { title, children } = props

  const [isOpen, setIsOpen] = useState(true)

  const openCloseAccordion = () => {
    setIsOpen(!isOpen)
  }

  return (
    <Container>
      <TitleContainer isOpen={isOpen}>
        <Title>{title}</Title>

        {isOpen ? (
          <MdKeyboardArrowUp size={45} color="white" className="hover:cursor-pointer" onClick={openCloseAccordion} />
        ) : (
          <MdKeyboardArrowDown size={45} color="white" className="hover:cursor-pointer" onClick={openCloseAccordion} />
        )}
      </TitleContainer>

      <Children isOpen={isOpen}>{children}</Children>
    </Container>
  )
}

const Container = tw.div`
  min-w-[320px] 
  max-w-[350px]
  bg-[#19191A] 
  rounded-xl 
  p-4
  w-full

  sm:max-w-[800px]
`
const TitleContainer = tw.div<{ isOpen: boolean }>`
  flex 
  items-center 
  justify-between
  w-full
  transition-all

  ${({ isOpen }) => (isOpen ? 'mb-8' : '')}
`
const Title = tw.h3`
  text-xl 
  font-bold 
  text-white
`
const Children = tw.div<{ isOpen: boolean }>`
  w-full
  
  ${({ isOpen }) => (isOpen ? '' : 'hidden')}
`
