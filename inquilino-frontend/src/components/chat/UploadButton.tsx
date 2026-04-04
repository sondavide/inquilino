import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useLang } from '@/i18n'
import { onboardingApi } from '@/api/onboarding'
import { CameraCapture } from '@/components/camera/CameraCapture'

interface UploadButtonProps {
  expectedTypes: string[]
  onUploaded?:  (filename: string, passed: boolean) => void
  disabled?:    boolean
  highlight?:   boolean
}

export function UploadButton({ expectedTypes, onUploaded, disabled, highlight }: UploadButtonProps) {
  const { t } = useLang()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [showMenu,   setShowMenu]   = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [uploading,  setUploading]  = useState(false)
  const [lastFile,   setLastFile]   = useState<{ name: string; passed: boolean } | null>(null)

  const hasCamera = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

  // ─── Upload logic ─────────────────────────────────────────────────────────

  const uploadFile = async (file: File) => {
    setUploading(true)
    try {
      const result = await onboardingApi.uploadDocument(file, expectedTypes[0] ?? 'IDENTITY')
      const name = file.name.length > 28 ? file.name.slice(0, 26) + '…' : file.name
      setLastFile({ name, passed: result.quickVerificationPassed })
      onUploaded?.(file.name, result.quickVerificationPassed)
      setTimeout(() => setLastFile(null), 6000)
    } catch {
      alert(t('upload.error'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  const handleCameraCapture = async (file: File) => {
    setShowCamera(false)
    await uploadFile(file)
  }

  const handleButtonClick = () => {
    if (disabled || uploading) return
    if (hasCamera) setShowMenu(v => !v)
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
      {showCamera && (
        <CameraCapture
          expectedTypes={expectedTypes}
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
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

        {/* Choice dropdown menu */}
        {showMenu && !uploading && (
          <>
            {/* Backdrop to close on outside click */}
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute bottom-full left-0 mb-2 z-50 bg-white dark:bg-gray-900 border rounded-xl shadow-lg overflow-hidden min-w-[148px]">
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
