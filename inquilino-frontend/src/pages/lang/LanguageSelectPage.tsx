import { useLang } from '@/i18n'

export default function LanguageSelectPage() {
  const { t, setLang } = useLang()

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 gap-10">

      {/* Logo / app name */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary tracking-tight">inquilino</h1>
        <p className="mt-2 text-muted-foreground text-sm">{t('lang.title')}</p>
        <p className="text-muted-foreground text-xs">{t('lang.subtitle')}</p>
      </div>

      {/* Language buttons */}
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={() => setLang('it')}
          className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl
                     border-2 border-primary bg-primary/5 text-primary font-semibold text-lg
                     hover:bg-primary/10 active:scale-95 transition-all"
        >
          <span className="text-2xl">🇮🇹</span>
          {t('lang.it')}
        </button>

        <button
          onClick={() => setLang('en')}
          className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl
                     border-2 border-border bg-background text-foreground font-semibold text-lg
                     hover:bg-accent active:scale-95 transition-all"
        >
          <span className="text-2xl">🇬🇧</span>
          {t('lang.en')}
        </button>
      </div>
    </div>
  )
}
