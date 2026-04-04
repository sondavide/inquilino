import { useLang } from '@/i18n'

interface ProgressBarProps {
  stepNumber:  number
  totalSteps:  number
  progress:    number
  canGoBack:   boolean
  onBack?:     () => void
}

export function ProgressBar({ stepNumber, totalSteps, progress, canGoBack, onBack }: ProgressBarProps) {
  const { t } = useLang()
  return (
    <div className="px-4 pt-3 pb-2 border-b bg-background space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {canGoBack && (
            <button
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground p-1 -ml-1 rounded transition-colors"
              aria-label="Indietro"
            >
              ←
            </button>
          )}
          <span className="text-sm font-medium text-foreground">
            {t('progress.step', { n: stepNumber, total: totalSteps })}
          </span>
        </div>
        <span className="text-sm font-semibold text-primary">{progress}%</span>
      </div>

      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
