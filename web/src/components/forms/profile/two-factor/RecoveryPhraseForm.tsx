import { useFormikContext } from 'formik';
import { toast } from 'react-toastify';
import { Label } from 'components/Label';
import { Info } from 'icons/Info';
import { Copy } from 'icons/Copy';

type FormValues = {
  recoveryPhrase: string;
};

export const RecoveryPhraseForm = () => {
  const {
    values: { recoveryPhrase },
  } = useFormikContext<FormValues>();

  return (
    <div className="flex flex-col flex-grow">
      <div className="flex flex-col flex-grow">
        <Label textSize="base" className="mb-2">
          RECOVERY PHRASE
        </Label>

        <p className="text-gray-60 mb-4">
          Write down or copy these words in the right order and save them somewhere safe.
        </p>

        <div className="bg-gray-1A p-3">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {recoveryPhrase.split(' ').map((word, index) => (
              <span key={word} className="text-gray-80 text-sm border border-gray-80 rounded px-2 py-1">
                {index + 1} {word}
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <button
            className="w-24 h-8 mt-2 flex gap-1 items-center justify-center border-2 border-gray-30 border-opacity-75 rounded p-1 text-xxs"
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

      <div className="rounded-md bg-yellow-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Info className="h-5 w-5" fill="rgb(250 204 21)" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Attention needed</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>You will be prompt to enter the words in the next step to complete the setup</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
