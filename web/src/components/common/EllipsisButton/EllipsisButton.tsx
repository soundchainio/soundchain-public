import React, { useState } from 'react'
import { MobileModal } from './MobileModal'

const ellipsisSvg = () => {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6.25 18.438A3.436 3.436 0 0 1 2.812 15c0-1.9 1.538-3.438 3.438-3.438 1.9 0 3.438 1.538 3.438 3.438 0 1.9-1.538 3.438-3.438 3.438Zm0-5a1.563 1.563 0 1 0 .001 3.126 1.563 1.563 0 0 0-.001-3.127Zm17.5 5A3.436 3.436 0 0 1 20.312 15c0-1.9 1.538-3.438 3.438-3.438 1.9 0 3.438 1.538 3.438 3.438 0 1.9-1.538 3.438-3.438 3.438Zm0-5a1.563 1.563 0 1 0 .001 3.126 1.563 1.563 0 0 0-.001-3.127Zm-8.75 5A3.436 3.436 0 0 1 11.562 15c0-1.9 1.538-3.438 3.438-3.438 1.9 0 3.438 1.538 3.438 3.438 0 1.9-1.538 3.438-3.438 3.438Zm0-5a1.563 1.563 0 1 0 .001 3.126A1.563 1.563 0 0 0 15 13.437Z"
        fill="#fff"
      />
    </svg>
  )
}

interface EllipsisButtonProps {
  children: React.ReactNode
}

export const EllipsisButton = (props: EllipsisButtonProps) => {
  const { children } = props

  const [show, setShow] = useState(false)

  const closeModal = () => {
    setShow(false)
  }

  return (
    <>
      <div onClick={() => setShow(true)}>{ellipsisSvg()}</div>
      <MobileModal open={show} close={closeModal}>
        {children}
      </MobileModal>
    </>
  )
}
