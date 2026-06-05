import axios from 'axios'
import { useCallback, useState } from 'react'

// Vercel-direct upload — Apollo / api.soundchain.io is DEAD, so the old
// presigned-URL query hung forever (the Manager "Uploading…" bug) and took
// every other uploader down with it. This path mints temporary Pinata creds
// from the auth-gated /api/operator/upload-token, uploads the file straight to
// IPFS from the browser (no Vercel 4.5MB body limit), and returns the gateway
// URL. The `finally` GUARANTEES the spinner clears — no more infinite hang.
export const useUpload = (value?: string, onChange?: (value: string) => void, _isGuest?: boolean) => {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | undefined>(value)
  const [fileType, setFileType] = useState<string>('')

  const upload = useCallback(
    async ([file]: File[]) => {
      if (!file) return
      const objectUrl = URL.createObjectURL(file)
      setUploading(true)
      setPreview(objectUrl)
      setFileType(file.type)
      try {
        // 1) same-origin, auth-gated Pinata credentials
        const tokenRes = await fetch('/api/operator/upload-token', { credentials: 'include' })
        if (!tokenRes.ok) {
          throw new Error(
            tokenRes.status === 401 ? 'Please sign in to upload.' : `Upload unavailable (${tokenRes.status}).`,
          )
        }
        const { apiKey, apiSecret, gateway } = await tokenRes.json()

        // 2) browser → Pinata, directly
        const formData = new FormData()
        formData.append('file', file)
        formData.append('pinataMetadata', JSON.stringify({ name: file.name }))
        formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }))
        const pinRes = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
          headers: { pinata_api_key: apiKey, pinata_secret_api_key: apiSecret },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        })
        const cid = pinRes.data?.IpfsHash
        if (!cid) throw new Error('Upload failed — no CID returned.')

        // 3) gateway URL (gateway already ends with /ipfs/)
        const base = (gateway || 'https://gateway.pinata.cloud/ipfs/').replace(/\/+$/, '') + '/'
        const readUrl = `${base}${cid}`
        onChange && onChange(readUrl)
        return readUrl
      } finally {
        setUploading(false)
      }
    },
    [onChange],
  )

  return { preview, fileType, uploading, upload }
}
