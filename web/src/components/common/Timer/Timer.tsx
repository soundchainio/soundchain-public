import { TimeCounter } from './TimeCounter'
import { useRouter } from 'next/router'
import tw from 'tailwind-styled-components'

interface Props {
  date: Date
  endedMessage?: string
  reloadOnEnd?: boolean
}
export const Timer = (props: Props) => {
  const { date, endedMessage, reloadOnEnd } = props
  const router = useRouter()

  if (endedMessage && new Date().getTime() > date.getTime()) {
    return <div className="text-[#FF4D4D]">{endedMessage}</div>
  }

  const renderTimeCard = (number: number) => {
    const array = number.toString().split('')

    if (array.length === 1) array.unshift('0')

    return array.map((time, index) => <TimeCard key={index}>{time || 0}</TimeCard>)
  }

  return (
    <TimeCounter
      date={date}
      onEndTimer={() => {
        if (reloadOnEnd) {
          router.reload()
        }
      }}
    >
      {(days, hours, minutes, seconds) => {
        return (
          <Container>
            <TimeContainer>
              <Time>{renderTimeCard(days)}</Time>
              <Span>days</Span>
            </TimeContainer>

            <TimeContainer>
              <Time>{renderTimeCard(hours)}</Time>
              <Span>hours</Span>
            </TimeContainer>

            <TimeContainer>
              <Time>{renderTimeCard(minutes)}</Time>
              <Span>minutes</Span>
            </TimeContainer>

            <TimeContainer>
              <Time>{renderTimeCard(seconds)}</Time>
              <Span>seconds</Span>
            </TimeContainer>
          </Container>
        )
      }}
    </TimeCounter>
  )
}

const Container = tw.div`
  text-white
  flex
  items-center
  justify-center
  gap-2
  flex-wrap
  my-6

  md:justify-between
`

const TimeContainer = tw.div`
  flex
  flex-col
  items-center
`
const Time = tw.div`
  flex
  items-center
`
const TimeCard = tw.div`
  h-10
  w-10
  flex
  items-center
  justify-center
  rounded-lg
  border 
  border-neutral-700
  bg-neutral-800
  mb-2
  mx-[4px]
`
const Span = tw.span`
text-gray-80
  uppercase
  text-xs
`
