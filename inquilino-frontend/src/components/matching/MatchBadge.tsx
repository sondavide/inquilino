import { useLang } from '@/i18n'
import type { MatchBand } from '@/types'

interface Props {
  band: MatchBand | null | undefined
  size?: 'sm' | 'md'
}

const bandStyle: Record<MatchBand, string> = {
  EXCELLENT_MATCH: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  GOOD_MATCH:      'bg-blue-100 text-blue-800 border-blue-200',
  MEDIUM_MATCH:    'bg-amber-100 text-amber-800 border-amber-200',
  WEAK_MATCH:      'bg-gray-100 text-gray-600 border-gray-200',
}

export default function MatchBadge({ band, size = 'md' }: Props) {
  const { t } = useLang()
  if (!band) return null

  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'
  const padding  = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1'

  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${textSize} ${padding} ${bandStyle[band]}`}>
      {t(`match.band.${band}` as any)}
    </span>
  )
}
