import React from 'react'
import { CurrencyType, TrackPrice } from '../lib/graphql'
import { Matic } from './Matic'
import { Ogun } from './Ogun'

interface PriceProps {
  price?: TrackPrice
  className?: string
}

type PriceDisplayProps = PriceProps & Record<string, unknown>

export function PriceDisplay(props: PriceDisplayProps) {
  if (!props.price) return null
  if (props.price.currency === CurrencyType.Matic) {
    return <Matic {...props} value={props.price.value} className={props.className} />
  }

  return <Ogun {...props} value={props.price.value} className={props.className} />
}
