import { ReactElement } from 'react'

import { Disclosure, Transition } from '@headlessui/react'
import { ArrowRightIcon } from '@heroicons/react/24/outline'

import { twd } from '../../utils/twd'
import { roadmapColors } from './roadmap.config'

const RoadmapStepTitle = twd`font-bold text-lg sm:text-3xl md:text-6xl uppercase`.h2
const RoadmapStepStatus = twd`font-semibold  text-sm sm:text-lg md:text-xl`.span
const RoadmapButton = twd`flex items-center py-4 px-2 md:px-10 text-black bg-[#FE5540]`.as(Disclosure.Button)
const RoadmapPanel = twd`border-x-4 py-4 px-4 border-[#FE5540]`.as(Disclosure.Panel)

export type RoadmapFragments = 'button' | 'status' | 'panel' | 'title'

interface RoadmapStepProps {
  title: string
  status: string
  children: string | ReactElement

  styles?: Partial<Record<RoadmapFragments, string>>
}

export function RoadmapStep({ title, status, children, styles }: RoadmapStepProps) {
  return (
    <Disclosure>
      {({ open }) => (
        <>
          <RoadmapButton className={`${styles?.button}`}>
            <RoadmapStepTitle className={styles?.title}>{title}</RoadmapStepTitle>
            <div className="flex-1" />
            <RoadmapStepStatus className={styles?.status}>{status}</RoadmapStepStatus>
            <ArrowRightIcon className="ml-4 h-6 w-6" />
          </RoadmapButton>
          <Transition
            show={open}
            enter="transition duration-500 ease-out delay-150"
            enterFrom="transform scale-y-0 translate-y-[100%] opacity-0"
            enterTo="transform scale-y-100 translate-y-0 opacity-100"
            leave="transition duration-300 ease-out delay-150"
            leaveFrom="transform scale-y-100 translate-y-0 -translate-x-0 opacity-100"
            leaveTo="transform scale-y-0 translate-y-0 -translate-x-[100%] opacity-0"
          >
            <RoadmapPanel className={` ${styles?.panel}`}>{children}</RoadmapPanel>
          </Transition>
        </>
      )}
    </Disclosure>
  )
}

interface RoadmapStepListProps {
  steps: {
    title: string
    status: string
    description: string
  }[]
}

export function RoadmapStepList({ steps }: RoadmapStepListProps) {
  return (
    <>
      {steps.map((step, index) => {
        const colorIndex = index % 5
        /** We take the step styles based on the position of the step, circling through the roadmapColors  styles*/
        const stepStyles = roadmapColors[colorIndex]
        const styles =
          index === steps.length - 1
            ? {
                ...stepStyles,
                panel: `${stepStyles.panel} border-b-2`, // If we're on the last step, add a border-bottom too.
              }
            : stepStyles

        return (
          <RoadmapStep key={step.title} title={step.title} status={step.status} styles={styles}>
            {step.description}
          </RoadmapStep>
        )
      })}
    </>
  )
}