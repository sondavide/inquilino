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

type WizardStep = 'type' | 'method' | null

interface UploadButtonProps {
  expectedTypes: string[]
  onUploaded?:   (filename: string, passed: boolean) => void
  disabled?:     boolean
  highlight?:    boolean
  menuAnchor?:   'left' | 'right'
}

export function UploadButton({ expectedTypes, onUploaded, disabled, highlight }: UploadButtonProps) {
  const { t, lang } = useLang()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [wizardStep,      setWizardStep]      = useState<WizardStep>(null)
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null)
  const [showCamera,      setShowCamera]      = useState(false)
  const [uploading,       setUploading]       = useState(false)
  const [lastFile,        setLastFile]        = useState<{ name: string; passed: boolean } | null>(null)

  const hasCamera  = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
  const pickerTypes = expectedTypes.length > 0 ? expectedTypes : ALL_DOC_TYPES
  const it = lang === 'it'

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

  // ─── Wizard navigation ────────────────────────────────────────────────────

  const closeWizard = () => {
    setWizardStep(null)
    setSelectedDocType(null)
  }

  const handleButtonClick = () => {
    if (disabled || uploading) return
    if (expectedTypes.length === 1) {
      setSelectedDocType(expectedTypes[0])
      if (hasCamera) setWizardStep('method')
      else fileInputRef.current?.click()
    } else {
      setWizardStep('type')
    }
  }

  const handleTypeSelected = (type: string) => {
    setSelectedDocType(type)
    if (hasCamera) {
      setWizardStep('method')
    } else {
      setWizardStep(null)
      setTimeout(() => fileInputRef.current?.click(), 50)
    }
  }

  const handleMethodCamera = () => {
    setWizardStep(null)
    setShowCamera(true)
  }

  const handleMethodFile = () => {
    setWizardStep(null)
    setTimeout(() => fileInputRef.current?.click(), 50)
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

      {/* Upload wizard modal */}
      {wizardStep && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={closeWizard} />
          <div className="fixed inset-x-4 bottom-4 sm:inset-auto sm:left-1/2 sm:-translate-x-1/2 sm:top-1/2 sm:-translate-y-1/2 z-50 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border p-5 max-w-sm w-full">

            {/* Step 1 — choose document type */}
            {wizardStep === 'type' && (
              <>
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
                  onClick={closeWizard}
                  className="w-full mt-3 text-xs text-muted-foreground text-center py-1"
                >
                  {t('profile.cancel')}
                </button>
              </>
            )}

            {/* Step 2 — choose method (camera or file) */}
            {wizardStep === 'method' && selectedDocType && (
              <>
                {/* Back — only visible when we came from the type picker */}
                {expectedTypes.length !== 1 && (
                  <button
                    onClick={() => setWizardStep('type')}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 -ml-1 px-1 py-0.5 rounded transition-colors"
                  >
                    ← {it ? 'Indietro' : 'Back'}
                  </button>
                )}

                <p className="text-sm font-semibold text-center mb-1">
                  {it ? 'Come vuoi caricarlo?' : 'How do you want to upload?'}
                </p>
                <p className="text-xs text-muted-foreground text-center mb-5">
                  {t(`doc.type.${selectedDocType}` as Parameters<typeof t>[0])}
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleMethodCamera}
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-border bg-muted/30 px-4 py-6 hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    <span className="text-3xl">📷</span>
                    <span className="text-sm font-medium">{t('upload.camera')}</span>
                  </button>
                  <button
                    onClick={handleMethodFile}
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-border bg-muted/30 px-4 py-6 hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    <span className="text-3xl">📁</span>
                    <span className="text-sm font-medium">{t('upload.file')}</span>
                  </button>
                </div>

                <button
                  onClick={closeWizard}
                  className="w-full mt-4 text-xs text-muted-foreground text-center py-1"
                >
                  {t('profile.cancel')}
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Button + feedback badge */}
      <div className="relative shrink-0">
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
      </div>
    </>
  )
}
