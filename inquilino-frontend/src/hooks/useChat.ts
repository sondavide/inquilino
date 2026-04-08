import { useState, useCallback, useRef, useEffect } from 'react'
import { getToken } from './useAuth'
import { getStoredLang } from '@/i18n'
import { onboardingApi } from '@/api/onboarding'
import type { ChatMessage, OnboardingStateDto } from '@/types'
import { MessageRole } from '@/types'

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function getLang(): string {
  return getStoredLang()
}

export function useChat() {
  const [messages,       setMessages]       = useState<ChatMessage[]>([])
  const [isStreaming,    setIsStreaming]     = useState(false)
  const [onboardingState, setOnboardingState] = useState<OnboardingStateDto | null>(null)
  const [banUntil,       setBanUntil]       = useState<string | null>(null) // ISO datetime or 'permanent'
  const abortRef        = useRef<AbortController | null>(null)
  const prevStepRef     = useRef<string | null>(null)  // tracks last known step
  const pendingInitRef  = useRef(false)                // true when step advanced and needs bot greeting

  const sendMessage = useCallback(async (content: string, meta?: { isDocument?: boolean }) => {
    if (isStreaming || banUntil) return

    const isInit = !content.trim()

    // Optimistic UI — add user bubble immediately (skip for init)
    if (!isInit) {
      setMessages(prev => [...prev, {
        id: uuid(), role: MessageRole.USER, content,
        createdAt: new Date().toISOString(),
        isDocument: meta?.isDocument,
      }])
    }

    // Placeholder for streaming assistant bubble
    const assistantId = uuid()
    setMessages(prev => [...prev, {
      id: assistantId, role: MessageRole.ASSISTANT, content: '',
      createdAt: new Date().toISOString(),
    }])
    setIsStreaming(true)

    abortRef.current = new AbortController()

    try {
      const response = await fetch('/api/onboarding/chat', {
        method:  'POST',
        headers: {
          'Content-Type':   'application/json',
          'Authorization':  `Bearer ${getToken()}`,
          'Accept-Language': getLang(),
        },
        body:   JSON.stringify({ content }),
        signal: abortRef.current.signal,
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      if (!response.body) throw new Error('No response body')

      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''
      let   currentEvent = 'token'

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const rawLine of lines) {
          const line = rawLine.replace(/\r$/, '') // normalize \r\n endings
          if (line.startsWith('event:')) {
            // Handle both 'event:name' and 'event: name' (SSE spec: space is optional)
            currentEvent = line.slice(6).trim()
          } else if (line.startsWith('data:')) {
            // Handle both 'data:value' and 'data: value' (strip at most one leading space)
            const raw = line.slice(5)
            const data = raw.startsWith(' ') ? raw.slice(1) : raw
            if (currentEvent === 'token') {
              try {
                // Backend JSON-encodes each token to preserve spaces unambiguously
                const tokenText: string = JSON.parse(data)
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, content: m.content + tokenText } : m
                ))
              } catch {
                // Fallback: use raw data if somehow not valid JSON
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, content: m.content + data } : m
                ))
              }
            } else if (currentEvent === 'state') {
              try { setOnboardingState(JSON.parse(data)) } catch { /* ignore */ }
            } else if (currentEvent === 'banned') {
              try {
                const { until } = JSON.parse(data) as { until: string }
                setBanUntil(until)
                setMessages(prev => prev.filter(m => m.id !== assistantId))
              } catch { /* ignore */ }
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        // Replace empty placeholder with error message
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: getLang() === 'it' ? 'Errore di connessione. Riprova.' : 'Connection error. Please retry.' }
            : m
        ))
      }
    } finally {
      setIsStreaming(false)
    }
  }, [isStreaming, banUntil])

  /**
   * Called on page mount.
   * 1. Fetches state + history in parallel for an instant UI restore.
   * 2. If the current step already has messages, restores them and skips the
   *    opening greeting (the user is resuming a previous conversation).
   * 3. If no history exists for the current step, sends the empty init trigger
   *    so the bot produces its opening message.
   */
  const init = useCallback(async () => {
    try {
      const [state, history] = await Promise.all([
        onboardingApi.getState(),
        onboardingApi.getHistory(),
      ])
      setOnboardingState(state)
      if (state.currentStep) prevStepRef.current = state.currentStep

      if (history.length > 0) {
        // Restore previous messages (filter out empty assistant placeholders)
        const restored: ChatMessage[] = history
          .filter(m => m.content.trim() !== '')
          .map(m => ({
            id:        m.id,
            role:      m.role === 'USER' ? MessageRole.USER : MessageRole.ASSISTANT,
            content:   m.content,
            createdAt: m.createdAt,
          }))
        setMessages(restored)

        // If the last message is from the assistant the bot already greeted —
        // no need to fire another init message.
        const lastIsBot = restored.at(-1)?.role === MessageRole.ASSISTANT
        if (lastIsBot) return
      }

      // No history (or last message is from user) — trigger the step's opening greeting
      sendMessage('')
    } catch {
      // On error fall back to the original behaviour
      sendMessage('')
    }
  }, [sendMessage])

  // Detect step changes: set pending flag when step advances mid-stream
  const currentStep = onboardingState?.currentStep
  useEffect(() => {
    if (prevStepRef.current !== null && currentStep && currentStep !== prevStepRef.current) {
      pendingInitRef.current = true
    }
    if (currentStep) prevStepRef.current = currentStep
  }, [currentStep])

  // When streaming ends and a step advancement is pending, auto-trigger the new step's greeting
  useEffect(() => {
    if (!isStreaming && pendingInitRef.current) {
      pendingInitRef.current = false
      sendMessage('')
    }
  }, [isStreaming, sendMessage])

  return { messages, isStreaming, onboardingState, banUntil, sendMessage, init }
}
