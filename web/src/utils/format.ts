import Web3 from 'web3'

export const currency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    ...(value < 0.01 && { maximumSignificantDigits: 3 }),
  }).format(value)
}

export const fixedDecimals = (value: number | string) => {
  const s = value.toString()
  if (!s || isNaN(parseFloat(s))) {
    return 0
  }
  const [integerPart, decimals] = s.split('.')
  const n = parseFloat(s)

  if (decimals?.length > 6) {
    return parseFloat(n.toPrecision(Math.min(integerPart.length + 3, 21)))
  }

  return n
}

export const priceToShow = (wei: string) => fixedDecimals(Web3.utils.fromWei(wei, 'ether'))

export const formatToCompactNumber = (number: number) => {
  const formatter = Intl.NumberFormat('en', { notation: 'compact', minimumFractionDigits: 1 })

  const n = formatter.format(number)

  return n
}

export const limitTextToNumberOfCharacters = (text: string, number: number) => {
  if (text.length <= number) return text

  return `${text.split('').splice(0, number).join('')}...`
}
