import classNames from 'classnames'

interface StepProgressBarProps {
  steps: number
  currentStep: number
}

export const StepProgressBar = ({ steps: maxSteps, currentStep }: StepProgressBarProps) => {
  const getSteps = () => {
    const steps = []
    for (let index = 0; index < maxSteps; index++) {
      steps.push(index + 1)
    }
    return steps
  }
  return (
    <div className={`flex flex-row items-center justify-center space-x-2 self-center px-4`}>
      {getSteps().map(step => (
        <div
          key={step}
          className={classNames('h-2 w-2 rounded-full border-2 border-gray-CC', step <= currentStep && 'bg-gray-CC')}
        ></div>
      ))}
    </div>
  )
}
