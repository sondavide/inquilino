import { useState, useRef } from 'react'
import { useLang } from '../../../i18n'
import type { ListingMediaItem, ListingFieldValidation } from '../../../types'
import { uploadMedia, deleteMedia, setCoverMedia } from '../../../api/listings'
import { resolveMediaUrl } from '../../../lib/utils'
import { getVS } from '../FieldStatusBadge'

const STATUS_BORDER: Record<string, string> = {
  APPROVED: 'border-green-400',
  FLAGGED:  'border-red-500',
  PENDING:  'border-orange-300',
}

interface Props {
  listingId: string
  media: ListingMediaItem[]
  onMediaChange: (media: ListingMediaItem[]) => void
  validations?: ListingFieldValidation[]
}

export default function Step8Media({ listingId, media, onMediaChange, validations }: Props) {
  const { t } = useLang()
  const images = media.filter(m => m.mediaType === 'IMAGE')
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const inputRef                  = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files || !listingId) return
    setError(null)
    setUploading(true)
    try {
      const uploaded: ListingMediaItem[] = []
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        if (file.size > 20 * 1024 * 1024) { setError(t('s8.fileTooLarge')); continue }
        const item = await uploadMedia(listingId, file, 'IMAGE')
        uploaded.push(item)
      }
      onMediaChange([...media, ...uploaded])
    } catch {
      setError(t('s8.uploadError'))
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (mediaId: string) => {
    try {
      await deleteMedia(listingId, mediaId)
      onMediaChange(media.filter(m => m.id !== mediaId))
    } catch {
      setError(t('s8.deleteError'))
    }
  }

  const handleSetCover = async (mediaId: string) => {
    try {
      await setCoverMedia(listingId, mediaId)
      onMediaChange(media.map(m => ({ ...m, isCover: m.id === mediaId })))
    } catch {
      setError(t('s8.uploadError'))
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-800">{t('s8.heading')}</h2>
      <p className="text-sm text-gray-500">{t('s8.hint')}</p>

      {listingId ? (
        <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center
                     cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
          <p className="text-gray-500 text-sm">
            {uploading ? t('s8.dropzoneUploading') : t('s8.dropzone')}
          </p>
          <p className="text-xs text-gray-400 mt-1">{t('s8.dropzoneFormats')}</p>
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => handleFiles(e.target.files)} />
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
          {t('s8.saveDraftFirst')}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.slice().sort((a, b) => a.sortOrder - b.sortOrder).map(item => (
            <div key={item.id}
              className={`relative rounded-xl overflow-hidden border-2 transition
                ${item.isCover
                  ? 'border-blue-500'
                  : (() => { const v = getVS(validations, `media.${item.id}`); return v ? STATUS_BORDER[v.status] : 'border-gray-200' })()
                }`}>
              <img src={resolveMediaUrl(item.fileUrl)} alt="" className="w-full h-32 object-cover" />
              {item.isCover && (
                <span className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                  {t('s8.coverLabel')}
                </span>
              )}
              {(() => {
                const v = getVS(validations, `media.${item.id}`)
                if (!v) return null
                if (v.status === 'APPROVED') return <span className="absolute top-1 right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">✓</span>
                if (v.status === 'FLAGGED')  return <span className="absolute top-1 right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded font-medium" title={v.note ?? ''}>✗</span>
                return <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-orange-400" />
              })()}
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 flex justify-center gap-2 p-1">
                {!item.isCover && (
                  <button type="button" onClick={() => handleSetCover(item.id)}
                    className="text-xs text-white hover:text-yellow-300 transition">
                    {t('s8.setCover')}
                  </button>
                )}
                <button type="button" onClick={() => handleDelete(item.id)}
                  className="text-xs text-red-300 hover:text-red-100 transition">
                  {t('s8.delete')}
                </button>
              </div>
              {(() => {
                const v = getVS(validations, `media.${item.id}`)
                if (v?.status === 'FLAGGED' && v.note) return (
                  <div className="absolute bottom-8 left-0 right-0 bg-red-600/90 text-white text-[10px] px-2 py-1 leading-tight">
                    ⚠ {v.note}
                  </div>
                )
                return null
              })()}
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && listingId && (
        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {t('s8.noPhotosWarning')}
        </p>
      )}
    </div>
  )
}
