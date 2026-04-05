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
  const { messages, isStreaming, onboardingState, banUntil, sendMessage, init } = useChat()
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const [input, setInput]   = useState('')
  const messagesEndRef       = useRef<HTMLDivElement>(null)
  const inputRef             = useRef<HTMLInputElement>(null)
  const hasInitialized       = useRef(false)

  const isCompleted = onboardingState?.currentStep === 'STEP_18'

  useEffect(() => {
    if (!isCompleted) return
    const timer = setTimeout(() => navigate('/'), 4000)
    return () => clearTimeout(timer)
  }, [isCompleted, navigate])

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

  const isStep06     = onboardingState?.currentStep === 'STEP_06'
  const requiresUpload = onboardingState?.requiresDocumentUpload ?? false

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">

      {/* ── Progress bar ── */}
      <ProgressBar
        stepNumber={onboardingState?.stepNumber ?? 1}
        totalSteps={onboardingState?.totalSteps ?? 16}
        progress={onboardingState?.progress ?? 0}
        canGoBack={(onboardingState?.stepNumber ?? 1) > 1}
        onBack={handleBack}
      />

      {/* ── Checklist bar (horizontal scroll) ── */}
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
        {isStreaming && messages.at(-1)?.content === '' && (
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
      <div className="relative z-10 border-t bg-background px-4 py-3 flex items-center gap-2">
        <UploadButton
          expectedTypes={onboardingState?.expectedDocumentTypes ?? []}
          onUploaded={handleUploaded}
          disabled={isStreaming || !!banUntil}
          highlight={onboardingState?.requiresDocumentUpload ?? false}
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
    </div>
  )
}
