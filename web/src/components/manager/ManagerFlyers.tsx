import { useDropzone } from 'react-dropzone'
import { useUpload } from 'hooks/useUpload'
import { ImagePlus, Loader2, X } from 'lucide-react'

// "Recent Events" — the artist posts flyers from gigs they've done. Owner uploads
// (Vercel-direct via useUpload → IPFS); promoters see proof of an active touring
// history. Persisted in managerConfig.flyers[] by the parent.
interface Props {
  flyers: string[]
  isOwner: boolean
  onChange: (flyers: string[]) => void
}

export function ManagerFlyers({ flyers, isOwner, onChange }: Props) {
  const { uploading, upload } = useUpload(undefined, (url) => onChange([url, ...flyers].slice(0, 24)))
  const { getRootProps, getInputProps } = useDropzone({
    onDrop: upload,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif'] },
    maxFiles: 1,
    maxSize: 15 * 1024 * 1024,
    noKeyboard: true,
  })

  if (!isOwner && flyers.length === 0) return null

  return (
    <section className="lg:col-span-2">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Recent Events</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {isOwner && (
          <div
            {...getRootProps()}
            className="aspect-[3/4] rounded-xl border border-dashed border-cyan-400/40 bg-black/40 flex flex-col items-center justify-center cursor-pointer hover:border-cyan-400/80 hover:bg-black/50 transition-all"
          >
            <input {...getInputProps()} />
            {uploading ? (
              <Loader2 className="w-5 h-5 text-cyan-300 animate-spin" />
            ) : (
              <>
                <ImagePlus className="w-5 h-5 text-cyan-300" />
                <span className="text-[10px] text-gray-400 mt-1">Add flyer</span>
              </>
            )}
          </div>
        )}
        {flyers.map((url, i) => (
          <div key={url + i} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-900 border border-gray-800 group">
            <img src={url} alt={`Event flyer ${i + 1}`} className="w-full h-full object-cover" />
            {isOwner && (
              <button
                onClick={() => onChange(flyers.filter((u) => u !== url))}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove flyer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
