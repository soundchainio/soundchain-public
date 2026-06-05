import { useDropzone } from 'react-dropzone'
import { useUpload } from 'hooks/useUpload'
import { Camera, Loader2, ImagePlus } from 'lucide-react'

// Owner-only cover uploader rendered INSIDE the manager hero. When the page has
// no banner yet it fills the empty top space with a clear call-to-action; once a
// banner is set it shrinks to a discreet "Edit cover" pill in the top corner so
// it never covers the artist's identity block. High-res friendly (up to 15MB) —
// this is the pro's money-maker page, the image stays full quality.
interface ManagerCoverUploaderProps {
  currentUrl?: string
  hasImage: boolean
  onUploaded: (url: string) => void
}

export function ManagerCoverUploader({ currentUrl, hasImage, onUploaded }: ManagerCoverUploaderProps) {
  const { uploading, upload } = useUpload(currentUrl, onUploaded)
  const { getRootProps, getInputProps } = useDropzone({
    onDrop: upload,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif'] },
    maxFiles: 1,
    maxSize: 15 * 1024 * 1024, // 15MB — keep the banner crisp on widescreen
    noKeyboard: true,
  })

  // Empty hero → prominent centered CTA filling the open top space.
  if (!hasImage) {
    return (
      <div
        {...getRootProps()}
        className="absolute inset-x-0 top-0 bottom-24 z-20 flex items-center justify-center cursor-pointer group/cover px-4"
        title="Upload a cover photo"
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-1.5 px-6 py-5 rounded-2xl border border-dashed border-cyan-400/40 bg-black/40 backdrop-blur-sm group-hover/cover:border-cyan-400/80 group-hover/cover:bg-black/50 transition-all text-center max-w-sm">
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 text-cyan-300 animate-spin" />
              <span className="text-xs text-cyan-200">Uploading…</span>
            </>
          ) : (
            <>
              <ImagePlus className="w-6 h-6 text-cyan-300" />
              <span className="text-sm font-semibold text-white">Add your cover photo</span>
              <span className="text-[11px] text-gray-400">Promoters see this first — make it count</span>
            </>
          )}
        </div>
      </div>
    )
  }

  // Has a banner → compact edit pill in the top-right corner.
  return (
    <div {...getRootProps()} className="absolute top-3 right-3 z-20">
      <input {...getInputProps()} />
      <button
        type="button"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-medium hover:bg-black/80 hover:border-cyan-400/50 transition-colors shadow-lg"
        title="Change cover photo"
      >
        {uploading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-300" />
        ) : (
          <Camera className="w-3.5 h-3.5 text-cyan-300" />
        )}
        <span>{uploading ? 'Uploading…' : 'Edit cover'}</span>
      </button>
    </div>
  )
}
