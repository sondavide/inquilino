import { useState, useRef } from 'react'
import { useLang } from '../../../i18n'
import type { ListingMediaItem } from '../../../types'
import { uploadMedia, deleteMedia } from '../../../api/listings'
import { resolveMediaUrl } from '../../../lib/utils'

interface Props {
  listingId: string
  media: ListingMediaItem[]
  onMediaChange: (media: ListingMediaItem[]) => void
}

function isPdf(url: string) {
  return url.split('?')[0].toLowerCase().endsWith('.pdf')
}

export default function Step9Documents({ listingId, media, onMediaChange }: Props) {
  const { t } = useLang()
  const docs = media.filter(m => m.mediaType !== 'IMAGE')

  const DOC_TYPES = [
    { value: 'APE',        label: t('s9d.docType.APE'),       hint: t('s9d.docType.APE.hint') },
    { value: 'PLANIMETRY', label: t('s9d.docType.PLANIMETRY'), hint: t('s9d.docType.PLANIMETRY.hint') },
    { value: 'DOCUMENT',   label: t('s9d.docType.DOCUMENT'),   hint: t('s9d.docType.DOCUMENT.hint') },
  ]

  const [selectedType, setSelectedType] = useState('APE')
  const [uploading, setUploading]       = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const inputRef                        = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files || !listingId) return
    setError(null)
    setUploading(true)
    try {
      const uploaded: ListingMediaItem[] = []
      for (const file of Array.from(files)) {
        const allowed = file.type.startsWith('image/') || file.type === 'application/pdf'
        if (!allowed) { setError(t('s9d.unsupported')); continue }
        if (file.size > 30 * 1024 * 1024) { setError(t('s9d.fileTooLarge')); continue }
        const item = await uploadMedia(listingId, file, selectedType)
        uploaded.push(item)
      }
      onMediaChange([...media, ...uploaded])
    } catch {
      setError(t('s9d.uploadError'))
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDelete = async (mediaId: string) => {
    try {
      await deleteMedia(listingId, mediaId)
      onMediaChange(media.filter(m => m.id !== mediaId))
    } catch {
      setError(t('s9d.deleteError'))
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const docLabel = (mediaType: string) =>
    DOC_TYPES.find(d => d.value === mediaType)?.label ?? mediaType

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-800">{t('s9d.heading')}</h2>
      <p className="text-sm text-gray-500">{t('s9d.hint')}</p>

      {!listingId ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
          {t('s9d.saveDraftFirst')}
        </div>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('s9d.docType.label')}</label>
            <div className="flex flex-wrap gap-2">
              {DOC_TYPES.map(dt => (
                <button key={dt.value} type="button" onClick={() => setSelectedType(dt.value)}
                  className={`px-3 py-1.5 rounded-lg border-2 text-sm transition
                    ${selectedType === dt.value
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {dt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {DOC_TYPES.find(d => d.value === selectedType)?.hint}
            </p>
          </div>

          <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center
                       cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
            <p className="text-gray-500 text-sm">
              {uploading ? t('s9d.dropzoneUploading') : t('s9d.dropzone')}
            </p>
            <p className="text-xs text-gray-400 mt-1">{t('s9d.dropzoneFormats')}</p>
            <input ref={inputRef} type="file" accept="application/pdf,image/*" multiple className="hidden"
              onChange={e => handleFiles(e.target.files)} />
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {docs.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">{t('s9d.uploaded.label')}</p>
          {docs.map(doc => {
            const filename = decodeURIComponent(doc.fileUrl.split('/').pop()?.split('?')[0] ?? '')
            return (
              <div key={doc.id}
                className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3">
                {isPdf(doc.fileUrl) ? (
                  <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                    <span className="text-red-600 font-bold text-xs">PDF</span>
                  </div>
                ) : (
                  <img src={resolveMediaUrl(doc.fileUrl)} alt=""
                    className="w-12 h-12 rounded-lg object-cover shrink-0 border border-gray-200" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                    {docLabel(doc.mediaType)}
                  </p>
                  <p className="text-sm text-gray-700 truncate">{filename}</p>
                  <a href={resolveMediaUrl(doc.fileUrl)} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()} className="text-xs text-blue-600 hover:underline">
                    {t('s9d.open')}
                  </a>
                </div>
                <button type="button" onClick={() => handleDelete(doc.id)}
                  className="text-xs text-red-500 hover:text-red-700 transition px-2 py-1
                             border border-red-200 rounded-lg hover:bg-red-50 shrink-0">
                  {t('s9d.delete')}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {docs.length === 0 && listingId && (
        <p className="text-xs text-gray-400">{t('s9d.noDocuments')}</p>
      )}
    </div>
  )
}
