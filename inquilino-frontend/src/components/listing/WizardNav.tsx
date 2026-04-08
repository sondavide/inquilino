import { useLang } from '../../i18n'

interface Props {
  currentStep: number
  totalSteps: number
  onPrev: () => void
  onNext: () => void
  onSaveDraft: () => void
  onSubmit?: () => void
  isLastStep: boolean
  saving: boolean
  listingStatus?: string   // DRAFT | IN_REVIEW | PUBLISHED | REJECTED | ...
}

export default function WizardNav({
  currentStep, totalSteps, onPrev, onNext,
  onSaveDraft, onSubmit, isLastStep, saving, listingStatus
}: Props) {
  const { t } = useLang()
  const canSubmit   = !listingStatus || listingStatus === 'DRAFT' || listingStatus === 'REJECTED'
  const isInReview  = listingStatus === 'IN_REVIEW'
  const isPublished = listingStatus === 'PUBLISHED'

  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-6">
      <button
        type="button"
        onClick={onPrev}
        disabled={currentStep === 0}
        className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg
                   disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition"
      >
        {t('wizard.nav.prev')}
      </button>

      <button
        type="button"
        onClick={onSaveDraft}
        disabled={saving || isPublished}
        className="px-4 py-2 text-sm text-gray-500 underline hover:text-gray-700 transition
                   disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
      >
        {saving ? t('wizard.nav.saving') : t('wizard.nav.saveDraft')}
      </button>

      {isLastStep ? (
        isInReview ? (
          <span className="px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-50
                           border border-yellow-200 rounded-lg">
            {t('wizard.nav.inReview')}
          </span>
        ) : isPublished ? (
          <span className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50
                           border border-green-200 rounded-lg">
            {t('wizard.nav.published')}
          </span>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving || !canSubmit}
            className="px-5 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg
                       hover:bg-green-700 disabled:opacity-50 transition"
          >
            {t('wizard.nav.submit')}
          </button>
        )
      ) : (
        <button
          type="button"
          onClick={onNext}
          className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg
                     hover:bg-blue-700 transition"
        >
          {t('wizard.nav.next')}
        </button>
      )}
    </div>
  )
}
