import React, { useRef, useEffect } from 'react'
import qrcode from 'qrcode'
import { authenticator } from 'otplib'
import { Label } from 'components/Label'
import { useMe } from 'hooks/useMe'
import { useFormikContext } from 'formik'
import { CopyText } from 'components/CopyText'

const service = 'Soundchain'

type FormValues = {
  secret: string
}

export const ScanCodeForm = () => {
  const {
    values: { secret },
  } = useFormikContext<FormValues>()
  const me = useMe()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!me) {
      return
    }

    const otpAuth = authenticator.keyuri(me?.email, service, secret)
    qrcode.toCanvas(canvasRef.current, otpAuth, error => error && console.error(error))
  }, [me, secret])

  return (
    <div className="flex flex-grow flex-col">
      <Label textSize="base">SCAN CODE OR ENTER KEY</Label>
      <span className="my-2 text-xs text-gray-60">
        Scan the code below with your authenticator app to add this account.
      </span>

      <canvas className="my-4 self-center" ref={canvasRef} />

      <span className="my-2 text-xs text-gray-60">
        Some authenticator apps also allow you to type in the text version instead.
      </span>

      <CopyText text={secret} />
    </div>
  )
}
