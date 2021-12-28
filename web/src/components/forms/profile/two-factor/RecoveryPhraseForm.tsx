import { useFormikContext } from 'formik';
import { Label } from 'components/Label';
import { CopyText } from 'components/CopyText';

type FormValues = {
  recoveryPhrase: string;
};

export const RecoveryPhraseForm = () => {
  const {
    values: { recoveryPhrase },
  } = useFormikContext<FormValues>();

  return (
    <div className="flex flex-col flex-grow">
      <Label className="text-white mb-4">Recovery Phrase</Label>

      <CopyText text={recoveryPhrase} />
    </div>
  );
};
