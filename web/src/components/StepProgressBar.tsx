import classNames from 'classnames';

interface StepProgressBarProps {
  steps: number;
  actualStep: number;
}

export const StepProgressBar = ({ steps: maxSteps, actualStep }: StepProgressBarProps) => {
  const getSteps = () => {
    const steps = [];
    for (let index = 0; index < maxSteps; index++) {
      steps.push(index + 1);
    }
    return steps;
  };
  return (
    <div className={`px-4 flex flex-row space-x-2 items-center self-center justify-center`}>
      {getSteps().map(step => (
        <div
          key={step}
          className={classNames('w-2 h-2 border-2 border-gray-CC rounded-full', step <= actualStep && 'bg-gray-CC')}
        ></div>
      ))}
    </div>
  );
};
