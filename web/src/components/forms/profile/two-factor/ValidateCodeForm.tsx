import { InputField } from 'components/InputField';

export const ValidateCodeForm = () => {
  return (
    <div className="flex flex-col flex-grow">
      <p className="text-white mb-4">To validate the secret, enter the 6-digit code from the app</p>
      <div className="mt-2 flex flex-col justify-center gap-4">
        <InputField type="number" name="token" max={999999} />
      </div>
    </div>
  );
};
