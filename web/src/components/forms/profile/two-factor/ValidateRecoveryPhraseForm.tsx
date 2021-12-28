import { Label } from 'components/Label';
import { InputField } from 'components/InputField';

export const ValidateRecoveryPhraseForm = () => {
  return (
    <div className="flex flex-col flex-grow">
      <Label className="text-white mb-4">
        To validate the recovery phrase, enter the 12 words in the correct order
      </Label>
      <InputField type="text" name="recoveryPhraseInput" label="Recovery Phrase" />
    </div>
  );
};
