import { Button } from 'components/common/Buttons/Button'
import { InputField } from 'components/InputField'
import { Form, Formik } from 'formik'
import { Bandcamp } from 'icons/Bandcamp'
import { Soundcloud } from 'icons/Soundcloud'
import { Youtube } from 'icons/Youtube'
import React from 'react'
import * as yup from 'yup'

export interface FormValues {
  soundcloud?: string
  youtube?: string
  bandcamp?: string
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape(
  {
    soundcloud: yup.string().when(['youtube', 'bandcamp'], {
      is: (youtube: string, bandcamp: string) => !youtube && !bandcamp,
      then: yup.string().required('At least one of the fields are required'),
    }),
    youtube: yup.string().when(['soundcloud', 'bandcamp'], {
      is: (soundcloud: string, bandcamp: string) => !soundcloud && !bandcamp,
      then: yup.string().required('At least one of the fields are required'),
    }),
    bandcamp: yup.string().when(['soundcloud', 'youtube'], {
      is: (soundcloud: string, youtube: string) => !soundcloud && !youtube,
      then: yup.string().required('At least one of the fields are required'),
    }),
  },
  [
    ['soundcloud', 'youtube'],
    ['soundcloud', 'bandcamp'],
    ['youtube', 'bandcamp'],
  ],
)

interface Props {
  handleSubmit: (values: FormValues) => void
  loading: boolean
}

const sourceList = [
  { name: 'SoundCloud', fieldName: 'soundcloud', icon: <Soundcloud className="h-7 w-7" /> },
  { name: 'YouTube', fieldName: 'youtube', icon: <Youtube className="h-7 w-7" /> },
  { name: 'BandCamp', fieldName: 'bandcamp', icon: <Bandcamp className="h-6 scale-50" /> },
]

export const RequestVerificationForm = ({ handleSubmit, loading }: Props) => {
  const defaultValues: FormValues = {
    soundcloud: '',
    bandcamp: '',
    youtube: '',
  }

  return (
    <Formik<FormValues>
      initialValues={defaultValues}
      enableReinitialize
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      <Form className="flex flex-col gap-4" placeholder="" onPointerEnterCapture={() => {}} onPointerLeaveCapture={() => {}}>
        <div className="mt-2 flex flex-1 flex-col gap-6">
          {sourceList.map(src => (
            <div key={src.name} className="flex items-center gap-2">
              <label htmlFor={`id_${src.fieldName}`} className="flex flex-col items-center justify-center  text-xs">
                <div className="flex w-20 flex-col items-center text-xs">{src.icon}</div>
                {src.name}
              </label>
              <div className="flex-1">
                <InputField
                  id={`id_${src.fieldName}`}
                  name={src.fieldName}
                  type="text"
                  placeholder={`${src.name} Link`}
                />
              </div>
            </div>
          ))}
        </div>
        <Button
          type="submit"
          variant="outline"
          borderColor="bg-green-gradient"
          className="mt-5 h-12"
          disabled={loading}
        >
          REQUEST VERIFICATION
        </Button>
      </Form>
    </Formik>
  )
}
