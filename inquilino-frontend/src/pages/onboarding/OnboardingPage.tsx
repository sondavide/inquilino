import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChat } from '@/hooks/useChat'
import { onboardingApi } from '@/api/onboarding'
import { useLang } from '@/i18n'
import type { InterestArea } from '@/types'
import { ProgressBar }    from '@/components/onboarding/ProgressBar'
import { ChecklistBar }   from '@/components/onboarding/ChecklistBar'
import { ChatBubble }     from '@/components/chat/ChatBubble'
import { SuggestionChips } from '@/components/chat/SuggestionChips'
import { UploadButton }   from '@/components/chat/UploadButton'
import { MapSelector }    from '@/components/map/MapSelector'
import { MessageRole }    from '@/types'

export default function OnboardingPage() {
  const { messages, isStreaming, onboardingState, banUntil, sendMessage, skipStep, init } = useChat()
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const [input, setInput]           = useState('')
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)
  const [isSkipping, setIsSkipping] = useState(false)
  const messagesEndRef              = useRef<HTMLDivElement>(null)
  const inputRef                    = useRef<HTMLInputElement>(null)
  const hasInitialized              = useRef(false)

  const isCompleted = onboardingState?.currentStep === 'STEP_18'

  useEffect(() => {
    if (!isCompleted) return
    // Full reload so useAuth re-fetches /api/me and picks up onboardingCompleted=true
    const timer = setTimeout(() => { window.location.href = '/' }, 4000)
    return () => clearTimeout(timer)
  }, [isCompleted])

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true
      init()
    }
  }, [init])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!isStreaming && !banUntil) inputRef.current?.focus()
  }, [isStreaming, banUntil])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    sendMessage(text)
    inputRef.current?.focus()
  }

  const handleSuggestion = (value: string) => {
    if (isStreaming) return
    sendMessage(value)
  }

  const handleBack = async () => {
    try {
      await onboardingApi.goBack()
    } catch { /* ignore */ }
  }

  const handleSkipConfirmed = async () => {
    setIsSkipping(true)
    try {
      await skipStep()
      setShowSkipConfirm(false)
    } finally {
      setIsSkipping(false)
    }
  }

  const handleUploaded = (filename: string, _passed: boolean) => {
    setTimeout(() => sendMessage(t('chat.upload.message', { filename }), { isDocument: true }), 300)
    // If verification failed, the bot will ask for re-upload based on the updated onboarding state
  }

  const handleMapConfirm = (message: string, areas: InterestArea[]) => {
    if (isStreaming) return
    // Fire-and-forget: save areas to DB; don't block the chat
    onboardingApi.saveInterestAreas(areas).catch(console.error)
    sendMessage(message)
  }

  if (isCompleted) {
    const it = lang === 'it'
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-8 text-center">
        <div className="text-6xl">🎉</div>
        <h1 className="text-2xl font-bold text-foreground">
          {it ? 'Complimenti!' : 'Congratulations!'}
        </h1>
        <p className="text-muted-foreground text-sm max-w-xs">
          {it
            ? 'Il tuo profilo è stato inviato con successo. Verrai reindirizzato a breve…'
            : 'Your profile has been submitted successfully. Redirecting shortly…'}
        </p>
        <span className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  const isStep06       = onboardingState?.currentStep === 'STEP_06'
  const isStep16       = onboardingState?.currentStep === 'STEP_16'
  const requiresUpload = onboardingState?.requiresDocumentUpload ?? false

  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">

      {/* ── Top bar: exit + progress ── */}
      <div className="flex items-center gap-2 px-3 pt-2 pb-0 shrink-0">
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted/60 shrink-0"
          title="Esci dall'onboarding"
        >
          <span className="text-sm leading-none">←</span>
          <span className="hidden sm:inline">Esci</span>
        </button>
        <div className="flex-1 min-w-0">
          <ProgressBar
            stepNumber={onboardingState?.stepNumber ?? 1}
            totalSteps={onboardingState?.totalSteps ?? 16}
            progress={onboardingState?.progress ?? 0}
            canGoBack={(onboardingState?.stepNumber ?? 1) > 1}
            onBack={handleBack}
          />
        </div>
      </div>

      {/* ── Checklist bar ── */}
      <ChecklistBar items={onboardingState?.checklistItems ?? []} />

      {/* ── Chat area ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 min-h-0">
        {messages.map((msg, i) => (
          <ChatBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
            isDocument={msg.isDocument}
            isStreaming={
              isStreaming &&
              i === messages.length - 1 &&
              msg.role === MessageRole.ASSISTANT
            }
          />
        ))}

        {/* Loading indicator while waiting for first token */}
        {isStreaming && messages[messages.length - 1]?.content === '' && (
          <div className="flex justify-start mb-3">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs mr-2 mt-1">AI</div>
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Map selector (Step 06 only) ── */}
      {isStep06 ? (
        <MapSelector
          onConfirm={handleMapConfirm}
          disabled={isStreaming}
          residenceAddress={onboardingState?.residenceAddress}
        />
      ) : (
        /* ── Suggestion chips (all other steps) ── */
        <SuggestionChips
          suggestions={onboardingState?.suggestions ?? []}
          onSelect={handleSuggestion}
          disabled={isStreaming}
        />
      )}

      {/* ── Skip confirmation panel ── */}
      {showSkipConfirm && (
        <div className="border-t bg-amber-50 dark:bg-amber-900/20 border-amber-200 px-4 py-3 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-lg shrink-0">⚠️</span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {lang === 'it' ? 'Saltare questo step?' : 'Skip this step?'}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                {lang === 'it'
                  ? 'Le informazioni di questo step rimarranno incomplete. Potrai correggerle in seguito dalla pagina del tuo profilo.'
                  : 'The information for this step will remain incomplete. You can fill it in later from your profile page.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => setShowSkipConfirm(false)}
              className="text-xs px-3 py-1.5 rounded-lg border text-muted-foreground hover:text-foreground hover:bg-muted/60"
            >
              {lang === 'it' ? 'Annulla' : 'Cancel'}
            </button>
            <button
              onClick={handleSkipConfirmed}
              disabled={isSkipping}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:opacity-50"
            >
              {isSkipping
                ? '…'
                : lang === 'it' ? 'Sì, salta' : 'Yes, skip'}
            </button>
          </div>
        </div>
      )}

      {/* ── Ban banner ── */}
      {banUntil && (
        <div className="border-t bg-destructive/10 border-destructive/30 px-4 py-3 flex items-start gap-3">
          <span className="text-xl shrink-0">🚫</span>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-destructive">{t('chat.ban.title')}</span>
            <span className="text-xs text-muted-foreground">
              {banUntil === 'permanent'
                ? t('chat.ban.permanent')
                : t('chat.ban.until', { time: new Date(banUntil).toLocaleString() })}
            </span>
          </div>
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="relative z-10 border-t bg-background px-4 pt-3 pb-2 space-y-1.5">
        <div className="flex items-center gap-2">
          <UploadButton
            expectedTypes={onboardingState?.expectedDocumentTypes ?? []}
            onUploaded={handleUploaded}
            disabled={isStreaming || !!banUntil}
            highlight={onboardingState?.requiresDocumentUpload ?? false}
            menuAnchor="right"
          />

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder={requiresUpload ? t('upload.input_hint') : t('chat.placeholder')}
            disabled={isStreaming || !!banUntil}
            className="
              flex-1 min-w-0 rounded-xl border border-input bg-background
              px-3 py-2.5 text-sm outline-none
              focus:ring-2 focus:ring-ring
              disabled:opacity-50
            "
          />

          <button
            onClick={handleSend}
            disabled={isStreaming || !input.trim() || !!banUntil}
            className="
              flex items-center justify-center w-10 h-10 rounded-xl shrink-0
              bg-primary text-primary-foreground text-lg
              hover:bg-primary/90 transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed
            "
            aria-label="Invia"
          >
            ↑
          </button>
        </div>

        {/* Consent step: mandatory accept button only, no skip */}
        {isStep16 && !banUntil && (
          <div className="flex justify-center pb-0.5">
            <button
              onClick={() => handleSuggestion(t('chat.consent.accept_both'))}
              disabled={isStreaming}
              className="text-xs font-semibold px-4 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              {t('chat.consent.accept_both')}
            </button>
          </div>
        )}

        {/* Skip step link — hidden while banned, confirming, or on consent step */}
        {!banUntil && !showSkipConfirm && !isCompleted && !isStep16 && (
          <div className="flex justify-end pb-0.5">
            <button
              onClick={() => setShowSkipConfirm(true)}
              disabled={isStreaming}
              className="text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors underline-offset-2 hover:underline"
            >
              {lang === 'it' ? 'Salta questo step →' : 'Skip this step →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
