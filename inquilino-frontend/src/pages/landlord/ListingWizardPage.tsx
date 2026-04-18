import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLang } from '../../i18n'
import type { Lang } from '../../i18n'
import type { SaveListingRequest, ListingMediaItem, ListingFieldValidation, AgencyArea } from '../../types'
import { createListing, updateListing, getListing, submitForReview, revertToDraft } from '../../api/listings'
import { getAgencyProfile } from '../../api/agency'
import { authApi } from '../../api/auth'
import WizardProgress from '../../components/listing/WizardProgress'
import WizardNav      from '../../components/listing/WizardNav'
import Step1Category   from '../../components/listing/steps/Step1Category'
import Step2Location   from '../../components/listing/steps/Step2Location'
import Step3Price      from '../../components/listing/steps/Step3Price'
import Step4Features   from '../../components/listing/steps/Step4Features'
import Step5Amenities  from '../../components/listing/steps/Step5Amenities'
import Step6Availability from '../../components/listing/steps/Step6Availability'
import Step7Energy     from '../../components/listing/steps/Step7Energy'
import Step8Media      from '../../components/listing/steps/Step8Media'
import Step9Documents  from '../../components/listing/steps/Step9Documents'
import Step10Publisher from '../../components/listing/steps/Step9Publisher'
import Step11Review    from '../../components/listing/steps/Step10Review'

import { t as tStatic } from '../../i18n'

function getStepNames(lang: Lang): string[] {
  const tl = (k: Parameters<typeof tStatic>[0]) => tStatic(k, lang)
  return [
    tl('wizard.step.category'),
    tl('wizard.step.location'),
    tl('wizard.step.price'),
    tl('wizard.step.features'),
    tl('wizard.step.amenities'),
    tl('wizard.step.availability'),
    tl('wizard.step.energy'),
    tl('wizard.step.media'),
    tl('wizard.step.documents'),
    tl('wizard.step.publisher'),
    tl('wizard.step.review'),
  ]
}

const EMPTY: SaveListingRequest = {
  listingType: undefined, propertyType: undefined, publisherType: undefined,
}

export default function ListingWizardPage() {
  const navigate              = useNavigate()
  const { id: paramId }       = useParams<{ id?: string }>()
  const { lang, t }           = useLang()
  const STEP_NAMES            = getStepNames(lang)
  const [currentStep, setStep] = useState(0)
  const [data, setData]        = useState<SaveListingRequest>(EMPTY)
  const [listingId, setListingId] = useState<string | null>(paramId ?? null)
  const [media, setMedia]             = useState<ListingMediaItem[]>([])
  const [validations, setValidations] = useState<ListingFieldValidation[]>([])
  const [listingStatus, setListingStatus] = useState<string>('DRAFT')
  const [saving, setSaving]           = useState(false)
  const [error, setError]      = useState<string | null>(null)
  const [successMsg, setMsg]   = useState<string | null>(null)
  const [agencyAreas, setAgencyAreas] = useState<AgencyArea[]>([])

  // Determina il tipo inserzionista e pre-compila i dati publisher in base al ruolo utente
  useEffect(() => {
    authApi.me().then(me => {
      if (me.userType === 'AGENCY' || me.userType === 'AGENCY_OPERATOR') {
        getAgencyProfile().then(p => {
          setAgencyAreas(p.areas ?? [])
          // Pre-compila solo per nuovi annunci (paramId assente) o se publisherType non è già impostato
          setData(prev => ({
            ...prev,
            publisherType: prev.publisherType ?? 'AGENCY',
            publisher: prev.publisher ?? {
              agencyName:   p.agencyName,
              vatNumber:    p.vatNumber  ?? undefined,
              reaNumber:    p.reaNumber  ?? undefined,
              websiteUrl:   p.websiteUrl ?? undefined,
              contactPhone: p.contactPhone ?? undefined,
              contactEmail: p.contactEmail ?? undefined,
            },
          }))
        }).catch(() => {})
      } else {
        setData(prev => ({ ...prev, publisherType: prev.publisherType ?? 'PRIVATE' }))
      }
    }).catch(() => {})
  }, [])

  // Carica listing esistente in modalità edit
  useEffect(() => {
    if (!paramId) return
    getListing(paramId).then(l => {
      setData({
        listingType:  l.listingType,
        propertyType: l.propertyType,
        publisherType: l.publisherType,
        title:         l.title ?? undefined,
        description:   l.description ?? undefined,
        internalReference: l.internalReference ?? undefined,
        location:      l.location ?? undefined,
        price:         l.price ?? undefined,
        features:      l.features ?? undefined,
        availability:  l.availability ?? undefined,
        energy:        l.energy ?? undefined,
        publisher:     l.publisher ?? undefined,
      })
      setMedia(l.media ?? [])
      setValidations(l.validations ?? [])
      setListingStatus(l.status ?? 'DRAFT')
    }).catch(() => setError(t('wizard.page.loadError')))
  }, [paramId])

  const patch = useCallback((p: Partial<SaveListingRequest>) => setData(prev => ({ ...prev, ...p })), [])

  const isReadOnly = listingStatus === 'PUBLISHED' || listingStatus === 'ARCHIVED'

  const saveDraft = async () => {
    if (isReadOnly) return
    setSaving(true)
    setError(null)
    try {
      const payload = { ...data, sourceLang: lang }
      if (!listingId) {
        const created = await createListing(payload)
        setListingId(created.id)
        setMedia(created.media ?? [])
        setMsg(t('wizard.page.saved'))
        navigate(`/landlord/listings/${created.id}/edit`, { replace: true })
      } else {
        await updateListing(listingId, payload)
        setMsg(t('wizard.page.updated'))
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? t('wizard.page.saveError'))
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(null), 3000)
    }
  }

  const handleNext = async () => {
    if (!isReadOnly) await saveDraft()
    setStep(s => Math.min(s + 1, STEP_NAMES.length - 1))
  }

  const handlePrev = () => setStep(s => Math.max(s - 1, 0))

  const handleSubmit = async () => {
    if (!listingId) { await saveDraft(); return }
    setSaving(true)
    setError(null)
    try {
      await submitForReview(listingId)
      navigate('/landlord/listings', { state: { submitted: true } })
    } catch (e: any) {
      setError(e?.response?.data?.message ?? t('wizard.page.submitError'))
    } finally {
      setSaving(false)
    }
  }

  const handleRevertToDraft = async () => {
    if (!listingId) return
    setSaving(true)
    setError(null)
    try {
      await revertToDraft(listingId)
      setListingStatus('DRAFT')
      setMsg(t('wizard.page.reverted'))
    } catch (e: any) {
      setError(e?.response?.data?.message ?? t('wizard.page.revertError'))
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(null), 5000)
    }
  }

  const vs = validations

  const renderStep = () => {
    switch (currentStep) {
      case 0: return <Step1Category    data={data} onChange={patch} validations={vs} />
      case 1: return <Step2Location    data={data} onChange={patch} validations={vs} agencyAreas={agencyAreas.length ? agencyAreas : undefined} />
      case 2: return <Step3Price       data={data} onChange={patch} validations={vs} />
      case 3: return <Step4Features    data={data} onChange={patch} validations={vs} />
      case 4: return <Step5Amenities   data={data} onChange={patch} validations={vs} />
      case 5: return <Step6Availability data={data} onChange={patch} validations={vs} />
      case 6: return <Step7Energy      data={data} onChange={patch} validations={vs} />
      case 7: return <Step8Media listingId={listingId ?? ''} media={media} onMediaChange={setMedia} validations={vs} />
      case 8: return <Step9Documents listingId={listingId ?? ''} media={media} onMediaChange={setMedia} />
      case 9: return <Step10Publisher  data={data} onChange={patch} validations={vs} />
      case 10: return <Step11Review    data={data} media={media} onGoToStep={setStep} />
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/landlord/listings')}
            className="text-gray-500 hover:text-gray-700 transition text-sm">
            {t('wizard.page.back')}
          </button>
          <h1 className="text-xl font-bold text-gray-800">
            {listingId ? t('wizard.page.titleEdit') : t('wizard.page.titleNew')}
          </h1>
        </div>

        <WizardProgress
          currentStep={currentStep}
          totalSteps={STEP_NAMES.length}
          steps={STEP_NAMES}
        />

        {/* Banner annuncio pubblicato */}
        {isReadOnly && (
          <div className="mb-3 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-green-800">{t('wizard.page.published.banner')}</p>
              <p className="text-xs text-green-700 mt-0.5">{t('wizard.page.published.hint')}</p>
            </div>
            <button
              onClick={handleRevertToDraft}
              disabled={saving}
              className="shrink-0 px-3 py-1.5 text-xs font-semibold text-orange-700
                         bg-orange-50 border border-orange-300 rounded-lg
                         hover:bg-orange-100 disabled:opacity-50 transition whitespace-nowrap"
            >
              {t('wizard.page.revertBtn')}
            </button>
          </div>
        )}

        {/* Step content — disabilitato se pubblicato */}
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-5 min-h-[400px]
                         ${isReadOnly ? 'pointer-events-none opacity-60 select-none' : ''}`}>
          {renderStep()}
        </div>

        {/* Messages */}
        {successMsg && (
          <div className="mt-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            ✓ {successMsg}
          </div>
        )}
        {error && (
          <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <WizardNav
          currentStep={currentStep}
          totalSteps={STEP_NAMES.length}
          onPrev={handlePrev}
          onNext={handleNext}
          onSaveDraft={saveDraft}
          onSubmit={handleSubmit}
          isLastStep={currentStep === STEP_NAMES.length - 1}
          saving={saving}
          listingStatus={listingStatus}
        />
      </div>
    </div>
  )
}
