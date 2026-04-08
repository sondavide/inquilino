import { useLang } from '../../i18n'

interface Props {
  currentStep: number
  totalSteps: number
  steps: string[]
}

export default function WizardProgress({ currentStep, totalSteps, steps }: Props) {
  const { t } = useLang()
  const label = t('wizard.progress', { n: String(currentStep + 1), total: String(totalSteps), step: steps[currentStep] })
  return (
    <div className="w-full mb-6">
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
        <div
          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span className="font-medium text-blue-600">{label}</span>
        <span>{Math.round(((currentStep + 1) / totalSteps) * 100)}%</span>
      </div>
    </div>
  )
}
