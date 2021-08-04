import { RegisterEmailForm } from 'components/RegisterEmailForm';
import { SetupProfileForm } from 'components/SetupProfileForm';
import { useState } from 'react';

export default function CreateAccountPage() {
  const [step, setStep] = useState(1);

  return (
    <div className="min-h-screen flex flex-col px-6 lg:px-8 bg-black">
      <div className="flex flex-1 flex-col sm:mx-auto sm:w-full sm:max-w-lg bg-black">
        {step === 0 && <RegisterEmailForm onSubmit={values => console.log(values)} />}
        {step === 1 && <SetupProfileForm onSubmit={values => console.log(values)} />}
      </div>
    </div>
  );
}
