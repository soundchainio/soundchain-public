import { toast } from 'react-toastify';
import { useFormikContext } from 'formik';
import { Label } from 'components/Label';
import { Copy2 as Copy } from 'icons/Copy2';
import { Locker as LockerIcon } from 'icons/Locker';

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

      <div className="flex flex-row text-xxs bg-gray-1A w-full pl-2 pr-3 py-2 items-center justify-between">
        <div className="flex flex-row items-center w-10/12 justify-start">
          <LockerIcon />
          <span className="text-gray-80 md-text-sm font-bold mx-1 truncate w-full">{recoveryPhrase}</span>
        </div>
        <button
          className="flex flex-row gap-1 items-center border-2 border-gray-30 border-opacity-75 rounded p-1"
          onClick={() => {
            navigator.clipboard.writeText(recoveryPhrase);
            toast('Copied to clipboard');
          }}
          type="button"
        >
          <Copy />
          <span className="text-gray-80 uppercase leading-none">copy</span>
        </button>
      </div>
    </div>
  );
};
