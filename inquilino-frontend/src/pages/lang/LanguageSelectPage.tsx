import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '@/i18n'
import type { Lang } from '@/i18n'
import { storeLang } from '@/i18n'

type Step = 'lang' | 'role'

export default function LanguageSelectPage() {
  const { t, setLang }          = useLang()
  const navigate                = useNavigate()
  const [step, setStep]         = useState<Step>('lang')
  const [pendingLang, setPendingLang] = useState<Lang>('it')

  // Salva la lingua in localStorage ma NON chiama setLang (evita hasLang=true troppo presto)
  const handleLang = (lang: Lang) => {
    storeLang(lang)
    setPendingLang(lang)
    setStep('role')
  }

  // Al click sul ruolo: setLang (→ hasLang=true) + navigate nello stesso handler
  // React batcha i due setState, il re-render avviene con URL già aggiornato
  const handleRole = (path: string) => {
    setLang(pendingLang)
    navigate(path, { replace: true })
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 gap-10">

      {/* Logo */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary tracking-tight">inquilino</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          {step === 'lang' ? t('lang.title') : 'Chi sei?'}
        </p>
      </div>

      {/* Step 1: lingua */}
      {step === 'lang' && (
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button
            onClick={() => handleLang('it')}
            className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl
                       border-2 border-primary bg-primary/5 text-primary font-semibold text-lg
                       hover:bg-primary/10 active:scale-95 transition-all"
          >
            <span className="text-2xl">🇮🇹</span>
            {t('lang.it')}
          </button>

          <button
            onClick={() => handleLang('en')}
            className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl
                       border-2 border-border bg-background text-foreground font-semibold text-lg
                       hover:bg-accent active:scale-95 transition-all"
          >
            <span className="text-2xl">🇬🇧</span>
            {t('lang.en')}
          </button>
        </div>
      )}

      {/* Step 2: ruolo */}
      {step === 'role' && (
        <div className="flex flex-col gap-4 w-full max-w-xs">
          {/* Tenant */}
          <button
            onClick={() => handleRole('/login?register=true')}
            className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl
                       border-2 border-primary bg-primary/5 text-primary
                       hover:bg-primary/10 active:scale-95 transition-all text-left"
          >
            <span className="text-3xl">🏡</span>
            <div>
              <p className="font-semibold text-base">Sono un inquilino</p>
              <p className="text-xs text-primary/70 mt-0.5">Cerco casa in affitto</p>
            </div>
          </button>

          {/* Landlord */}
          <button
            onClick={() => handleRole('/register')}
            className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl
                       border-2 border-border bg-background text-foreground
                       hover:bg-accent active:scale-95 transition-all text-left"
          >
            <span className="text-3xl">🔑</span>
            <div>
              <p className="font-semibold text-base">Sono un proprietario</p>
              <p className="text-xs text-muted-foreground mt-0.5">Voglio pubblicare annunci</p>
            </div>
          </button>

          {/* Agency */}
          <button
            onClick={() => handleRole('/register')}
            className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl
                       border-2 border-border bg-background text-foreground
                       hover:bg-accent active:scale-95 transition-all text-left"
          >
            <span className="text-3xl">🏢</span>
            <div>
              <p className="font-semibold text-base">Sono un'agenzia</p>
              <p className="text-xs text-muted-foreground mt-0.5">Gestisco immobili per conto terzi</p>
            </div>
          </button>

          {/* Already have account */}
          <button
            onClick={() => handleRole('/login')}
            className="w-full text-sm text-muted-foreground hover:text-foreground text-center py-2"
          >
            Ho già un account → <span className="underline">Accedi</span>
          </button>
        </div>
      )}
    </div>
  )
}
