import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useLang } from '@/i18n'
import { onboardingApi } from '@/api/onboarding'
import { CameraCapture } from '@/components/camera/CameraCapture'

const ALL_DOC_TYPES = [
  'IDENTITY', 'IDENTITY_FRONT', 'IDENTITY_BACK',
  'PAYSLIP', 'EMPLOYMENT_CONTRACT',
  'TAX_RETURN', 'BANK_STATEMENT', 'LANDLORD_REFERENCE', 'GUARANTOR_DOCUMENT', 'OTHER',
]

interface UploadButtonProps {
  expectedTypes: string[]
  onUploaded?:  (filename: string, passed: boolean) => void
  disabled?:    boolean
  highlight?:   boolean
}

export function UploadButton({ expectedTypes, onUploaded, disabled, highlight }: UploadButtonProps) {
  const { t } = useLang()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [showTypePicker, setShowTypePicker] = useState(false)
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null)
  const [showMenu,   setShowMenu]   = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [uploading,  setUploading]  = useState(false)
  const [lastFile,   setLastFile]   = useState<{ name: string; passed: boolean } | null>(null)

  const hasCamera = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

  // Doc types to show in picker: expectedTypes if not empty, else all
  const pickerTypes = expectedTypes.length > 0 ? expectedTypes : ALL_DOC_TYPES

  // ─── Upload logic ─────────────────────────────────────────────────────────

  const uploadFile = async (file: File, docType: string) => {
    setUploading(true)
    try {
      const result = await onboardingApi.uploadDocument(file, docType)
      const name = file.name.length > 28 ? file.name.slice(0, 26) + '…' : file.name
      setLastFile({ name, passed: result.quickVerificationPassed })
      onUploaded?.(file.name, result.quickVerificationPassed)
      setTimeout(() => setLastFile(null), 6000)
    } catch {
      alert(t('upload.error'))
    } finally {
      setUploading(false)
      setSelectedDocType(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && selectedDocType) uploadFile(file, selectedDocType)
  }

  const handleCameraCapture = async (file: File) => {
    setShowCamera(false)
    if (selectedDocType) await uploadFile(file, selectedDocType)
  }

  const handleButtonClick = () => {
    if (disabled || uploading) return
    if (expectedTypes.length === 1) {
      // Single expected type: auto-select and proceed directly
      setSelectedDocType(expectedTypes[0])
      if (hasCamera) setShowMenu(true)
      else fileInputRef.current?.click()
    } else {
      setShowTypePicker(true)
    }
  }

  const handleTypeSelected = (type: string) => {
    setSelectedDocType(type)
    setShowTypePicker(false)
    if (hasCamera) setShowMenu(true)
    else fileInputRef.current?.click()
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Camera modal */}
      {showCamera && selectedDocType && (
        <CameraCapture
          expectedTypes={[selectedDocType]}
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Document type picker modal */}
      {showTypePicker && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setShowTypePicker(false)}
          />
          <div className="fixed inset-x-4 bottom-4 sm:inset-auto sm:left-1/2 sm:-translate-x-1/2 sm:top-1/2 sm:-translate-y-1/2 z-50 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border p-4 max-w-sm w-full">
            <p className="text-sm font-semibold text-center mb-3">
              {t('upload.choose_type')}
            </p>
            <div className="space-y-1.5">
              {pickerTypes.map(type => (
                <button
                  key={type}
                  onClick={() => handleTypeSelected(type)}
                  className="w-full text-left px-4 py-2.5 text-sm rounded-xl hover:bg-accent transition-colors border"
                >
                  {t(`doc.type.${type}` as Parameters<typeof t>[0])}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowTypePicker(false)}
              className="w-full mt-3 text-xs text-muted-foreground text-center py-1"
            >
              {t('profile.cancel')}
            </button>
          </div>
        </>
      )}

      {/* Button + menu wrapper */}
      <div className="relative shrink-0">

        {/* Filename feedback badge (above the button) */}
        {lastFile && (
          <div className={`absolute bottom-full left-0 mb-1.5 flex items-center gap-1 whitespace-nowrap
                          text-xs rounded-full px-2.5 py-1 shadow-sm border ${
                            lastFile.passed
                              ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-400 dark:border-green-800'
                              : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800'
                          }`}>
            <span>{lastFile.passed ? '✓' : '✗'}</span>
            <span className="max-w-[180px] truncate">{lastFile.name}</span>
          </div>
        )}

        {/* Main button */}
        <button
          onClick={handleButtonClick}
          disabled={disabled || uploading}
          title={t('upload.title')}
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg border transition-colors',
            highlight
              ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20'
              : 'border-border bg-background text-muted-foreground hover:bg-accent',
            (disabled || uploading) && 'opacity-40 cursor-not-allowed'
          )}
        >
          {uploading
            ? <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            : <span>📎</span>
          }
        </button>

        {/* Choice dropdown (camera vs file) */}
        {showMenu && !uploading && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute bottom-full right-0 mb-2 z-50 bg-white dark:bg-gray-900 border rounded-xl shadow-lg overflow-hidden min-w-[148px]">
              <button
                onClick={() => { setShowMenu(false); setShowCamera(true) }}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 hover:bg-accent transition-colors"
              >
                <span>📷</span> {t('upload.camera')}
              </button>
              <div className="border-t" />
              <button
                onClick={() => { setShowMenu(false); fileInputRef.current?.click() }}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 hover:bg-accent transition-colors"
              >
                <span>📁</span> {t('upload.file')}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
