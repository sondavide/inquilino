import { useNavigate } from 'react-router-dom'
import { useLang } from '@/i18n'
import type { TenantProfileCardDto } from '@/types'
import MatchBadge from './MatchBadge'

interface Props {
  match:     TenantProfileCardDto
  listingId: string
}

const INCOME_BAND: Record<string, { label: string; color: string }> = {
  '0-1200':    { label: 'Reddito basso',       color: 'bg-red-100 text-red-700' },
  '1200-1800': { label: 'Reddito medio-basso',  color: 'bg-amber-100 text-amber-700' },
  '1800-2500': { label: 'Reddito medio',        color: 'bg-yellow-100 text-yellow-700' },
  '2500-3500': { label: 'Reddito medio-alto',   color: 'bg-emerald-100 text-emerald-700' },
  '3500+':     { label: 'Reddito alto',         color: 'bg-emerald-100 text-emerald-800' },
}

const scoreDot = (val: string) => ({
  HIGH:   'bg-emerald-500',
  MEDIUM: 'bg-amber-500',
  LOW:    'bg-red-400',
}[val] ?? 'bg-gray-300')

export default function TenantProfileCard({ match, listingId }: Props) {
  const { t } = useLang()
  const navigate = useNavigate()

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3 active:opacity-90 cursor-pointer"
      onClick={() => navigate(`/landlord/listings/${listingId}/matches/${match.matchId}`)}
    >
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 font-mono">{match.profileCode}</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {match.ageRange && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {match.ageRange} anni
              </span>
            )}
            {match.occupationCategory && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {t(`occupation.${match.occupationCategory}` as any)}
              </span>
            )}
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              👥 {match.occupants}
            </span>
          </div>
        </div>
        <MatchBadge band={match.matchBand} size="sm" />
      </div>

      {/* Economic row */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {match.incomeRange && (() => {
          const band = INCOME_BAND[match.incomeRange]
          return band ? (
            <div>
              <p className="text-gray-400">{t('matches.landlord.income_range')}</p>
              <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full font-medium text-xs ${band.color}`}>
                {band.label}
              </span>
            </div>
          ) : null
        })()}
        {match.maxBudget && (
          <div>
            <p className="text-gray-400">{t('matches.landlord.budget')}</p>
            <p className="font-medium text-gray-800">€{match.maxBudget.toLocaleString()}/mo</p>
          </div>
        )}
        {match.moveInDate && (
          <div>
            <p className="text-gray-400">{t('matches.landlord.move_in')}</p>
            <p className="font-medium text-gray-800">
              {new Date(match.moveInDate).toLocaleDateString()}
            </p>
          </div>
        )}
        <div>
          <p className="text-gray-400">Garante</p>
          <p className="font-medium text-gray-800">
            {match.hasGuarantor ? t('matches.landlord.guarantor') : t('matches.landlord.no_guarantor')}
          </p>
        </div>
      </div>

      {/* Flags */}
      <div className="flex flex-wrap gap-1.5">
        {match.hasPets  && <Flag label={`🐾 ${t('matches.landlord.pets')}`} />}
        {match.smoker   && <Flag label={`🚬 ${t('matches.landlord.smoker')}`} />}
      </div>

      {/* Scores */}
      <div className="flex gap-3">
        {([
          ['score.rentSustainability', match.rentSustainability],
          ['score.incomeStability',    match.incomeStability],
          ['score.documentReliability',match.documentReliability],
        ] as [string, string][]).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1 text-xs text-gray-600">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${scoreDot(val)}`} />
            <span className="hidden sm:inline">{t(key as any)}</span>
            <span className="sm:hidden">{t(`score.${val}` as any)}</span>
          </div>
        ))}
      </div>

      {/* Contact info — solo se CONTACT_UNLOCKED */}
      {match.matchState === 'CONTACT_UNLOCKED' && (
        <div className="border-t pt-3 space-y-1 text-sm">
          {match.fullName && (
            <p><span className="text-gray-400">{t('matches.landlord.contact.name')}: </span>{match.fullName}</p>
          )}
          {match.email && (
            <p><span className="text-gray-400">{t('matches.landlord.contact.email')}: </span>
              <a href={`mailto:${match.email}`} className="text-blue-600">{match.email}</a>
            </p>
          )}
          {match.phone && (
            <p><span className="text-gray-400">{t('matches.landlord.contact.phone')}: </span>
              <a href={`tel:${match.phone}`} className="text-blue-600">{match.phone}</a>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function Flag({ label }: { label: string }) {
  return (
    <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">{label}</span>
  )
}
