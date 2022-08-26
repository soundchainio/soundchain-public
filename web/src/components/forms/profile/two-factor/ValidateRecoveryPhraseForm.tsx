import { useFormikContext } from 'formik'
import { InputField } from 'components/InputField'
import React, { useState } from 'react'
import { Badge } from 'components/Badge'

type FormValues = {
  recoveryPhrase: string
}

const shuffle = (array: string[]) => array.sort(() => (Math.random() > 0.5 ? 1 : -1))

export const ValidateRecoveryPhraseForm = () => {
  const {
    values: { recoveryPhrase },
    setFieldValue,
  } = useFormikContext<FormValues>()
  const [words, setWords] = useState(shuffle(recoveryPhrase.split(' ')))
  const [phrase, setPhrase] = useState<string[]>([])

  const handleAdd = (word: string) => {
    const updatedPhrase = [...phrase, word]
    setPhrase(updatedPhrase)
    setFieldValue('recoveryPhraseInput', updatedPhrase.join(' '))
    setWords(words => words.filter(w => w !== word))
  }

  const handleClear = () => {
    setFieldValue('recoveryPhraseInput', '')
    setWords(shuffle(recoveryPhrase.split(' ')))
    setPhrase([])
  }

  return (
    <div className="flex flex-grow flex-col">
      <p className="mb-4 text-gray-80">To validate the recovery phrase, enter the 12 words in the correct order</p>

      <div className="relative">
        <InputField type="text" multiple name="recoveryPhraseInput" label="Recovery Phrase" value={phrase.join(' ')} />
        <button className="absolute right-3 top-3 text-xs text-gray-60" onClick={handleClear}>
          CLEAR
        </button>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {words.map(word => (
          <Badge key={word} label={word} onClick={() => handleAdd(word)} />
        ))}
      </div>
    </div>
  )
}
